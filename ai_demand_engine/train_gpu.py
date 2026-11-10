"""
Script de entrenamiento acelerado por GPU NVIDIA para PlastControl IA.
Aprovecha CUDA 12.5 / 12.4, núcleos Tensor y precisión mixta (AMP).
Maneja dinámicas continuas con valores positivos y negativos.
"""

import os
import sys

# Asegurar codificación UTF-8 y line buffering en consola de Windows
try:
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
    sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)
except Exception:
    pass

import time
import math
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
from torch.amp import autocast, GradScaler

# Importar pipeline y modelo
from dataset_loader import PlastDataPipeline, inv_symlog
from model import PlastDemandNet


def compute_metrics(y_true, y_pred):
    """
    Calcula RMSE, MAE, WAPE y R2 sobre los valores en escala real con estabilidad numérica.
    """
    y_true = np.nan_to_num(y_true, nan=0.0)
    y_pred = np.nan_to_num(y_pred, nan=0.0)
    diff = y_true - y_pred
    mae = float(np.mean(np.abs(diff)))
    rmse = float(np.sqrt(np.mean(diff ** 2)))
    sum_abs_true = float(np.sum(np.abs(y_true))) + 1e-6
    wape = float(np.sum(np.abs(diff)) / sum_abs_true) * 100.0

    # R2 Score
    ss_tot = float(np.sum((y_true - np.mean(y_true)) ** 2)) + 1e-6
    ss_res = float(np.sum(diff ** 2))
    r2 = float(1.0 - (ss_res / ss_tot))

    return {"rmse": rmse, "mae": mae, "wape": wape, "r2": r2}


def train_gpu(
    epochs=120,
    batch_size=64,
    lr=1e-3,
    csv_path=None,
    checkpoint_dir="ai_demand_engine/checkpoints",
):
    start_time = time.time()
    os.makedirs(checkpoint_dir, exist_ok=True)

    # 1. Configuración de Hardware GPU
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("=" * 75)
    print("[PLASTCONTROL] INICIANDO ENTRENAMIENTO DE IA EN GPU NVIDIA")
    print("=" * 75)
    print(f"Dispositivo de Cómputo: {device}")
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_mem = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        print(f"Tarjeta Gráfica: {gpu_name} ({gpu_mem:.2f} GB VRAM)")
        print(f"Versión CUDA: {torch.version.cuda}")
        # Habilitar cuDNN benchmark para máxima aceleración en tensores convolucionales/atención
        torch.backends.cudnn.benchmark = True
    else:
        print("ADVERTENCIA: CUDA no disponible. Entrenando en CPU.")
    print("=" * 75)

    # 2. Cargar Dataset y DataLoaders
    pipeline = PlastDataPipeline(csv_path)
    train_loader, val_loader, test_loader, meta = pipeline.get_dataloaders(batch_size=batch_size)

    scalers = meta["scalers"]

    # 3. Inicializar Modelo Neuronal en GPU
    model = PlastDemandNet(
        vocab_sizes=meta["vocab_sizes"],
        num_features_dim=meta["num_features_dim"],
        hidden_dim=128,
        num_layers=3,
        num_targets=3,
        dropout=0.15,
    ).to(device)

    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Modelo PlastDemandNet instanciado con {total_params:,} parámetros entrenables.")

    # 4. Optimizador, Criterio y Escalador de Precisión Mixta
    criterion = nn.SmoothL1Loss(beta=0.5)  # Huber Loss: robusta ante extremos negativos y positivos
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)
    scaler = GradScaler("cuda", enabled=(device.type == "cuda"))

    history = {
        "epoch": [],
        "train_loss": [],
        "val_loss": [],
        "val_rmse_units": [],
        "val_wape_units": [],
        "lr": [],
    }

    best_val_loss = float("inf")
    best_model_path = os.path.join(checkpoint_dir, "best_demand_gpu_model.pt")

    print("\nIniciando optimización por épocas...")
    print(f"{'Época':<8} | {'Train Loss':<12} | {'Val Loss':<12} | {'Val RMSE':<12} | {'Val WAPE (%)':<14} | {'Tiempo':<8}")
    print("-" * 75)

    for epoch in range(1, epochs + 1):
        t0 = time.time()

        # --- FASE ENTRENAMIENTO ---
        model.train()
        train_loss_accum = 0.0
        train_batches = 0

        for cat_b, num_b, target_b in train_loader:
            cat_b = cat_b.to(device, non_blocking=True)
            num_b = num_b.to(device, non_blocking=True)
            target_b = target_b.to(device, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)

            with autocast("cuda", enabled=(device.type == "cuda")):
                preds = model(cat_b, num_b)
                loss = criterion(preds, target_b)

            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
            scaler.step(optimizer)
            scaler.update()

            train_loss_accum += loss.item()
            train_batches += 1

        train_loss = train_loss_accum / train_batches
        scheduler.step()

        # --- FASE VALIDACIÓN ---
        model.eval()
        val_loss_accum = 0.0
        val_batches = 0
        all_val_preds = []
        all_val_targets = []

        with torch.no_grad():
            for cat_b, num_b, target_b in val_loader:
                cat_b = cat_b.to(device, non_blocking=True)
                num_b = num_b.to(device, non_blocking=True)
                target_b = target_b.to(device, non_blocking=True)

                with autocast("cuda", enabled=(device.type == "cuda")):
                    preds = model(cat_b, num_b)
                    loss = criterion(preds, target_b)

                val_loss_accum += loss.item()
                val_batches += 1

                all_val_preds.append(preds.cpu().numpy())
                all_val_targets.append(target_b.cpu().numpy())

        val_loss = val_loss_accum / val_batches
        epoch_time = time.time() - t0

        # Des-normalizar predicciones de Unidades para métricas industriales reales
        val_preds_arr = np.vstack(all_val_preds)
        val_targets_arr = np.vstack(all_val_targets)

        # Invertir normalización del Target 1 (Cantidad_Unidades)
        u_mean = scalers["target_Cantidad_Unidades"]["mean"]
        u_std = scalers["target_Cantidad_Unidades"]["std"]
        true_units = inv_symlog((val_targets_arr[:, 0] * u_std) + u_mean)
        pred_units = inv_symlog((val_preds_arr[:, 0] * u_std) + u_mean)

        val_metrics = compute_metrics(true_units, pred_units)

        # Guardar en historial
        history["epoch"].append(epoch)
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["val_rmse_units"].append(val_metrics["rmse"])
        history["val_wape_units"].append(val_metrics["wape"])
        history["lr"].append(scheduler.get_last_lr()[0])

        # Guardar mejor checkpoint
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(
                {
                    "epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "val_loss": val_loss,
                    "val_metrics": val_metrics,
                    "metadata": meta,
                },
                best_model_path,
            )
            saved_marker = " *"
        else:
            saved_marker = ""

        # Mostrar cada 10 épocas o en la primera y última
        if epoch == 1 or epoch % 10 == 0 or epoch == epochs or saved_marker:
            print(
                f"{epoch:<8} | {train_loss:<12.5f} | {val_loss:<12.5f} | {val_metrics['rmse']:<12.1f} | {val_metrics['wape']:<14.2f}% | {epoch_time:.2f}s{saved_marker}"
            )

    total_training_time = time.time() - start_time
    print("-" * 75)
    print(f"[OK] ENTRENAMIENTO FINALIZADO en {total_training_time:.2f} segundos!")
    print(f"Mejor Modelo Guardado en: {best_model_path} (Val Loss: {best_val_loss:.5f})")

    # 5. Generar Gráfico de Curva de Pérdida
    plot_path = os.path.join(checkpoint_dir, "training_loss_curve.png")
    plt.figure(figsize=(10, 5), dpi=150)
    plt.plot(history["epoch"], history["train_loss"], label="Train Loss (Huber)", color="#2563eb", lw=2)
    plt.plot(history["epoch"], history["val_loss"], label="Validation Loss", color="#dc2626", lw=2, linestyle="--")
    plt.title("Curva de Aprendizaje - PlastControl IA (GPU NVIDIA RTX 4060)", fontsize=13, fontweight="bold")
    plt.xlabel("Epoca")
    plt.ylabel("Perdida (Huber Loss)")
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.legend()
    plt.tight_layout()
    plt.savefig(plot_path)
    plt.close()
    print(f"Grafico de entrenamiento guardado en: {plot_path}")

    # 6. EVALUACIÓN FINAL EN TEST SET CIEGO (Último 15% cronológico)
    print("\n" + "=" * 75)
    print("[EVALUACION] EVALUACION CIEGA EN PARTICION TEST (GENERALIZACION)")
    print("=" * 75)

    # Cargar mejor checkpoint
    checkpoint = torch.load(best_model_path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    all_test_preds = []
    all_test_targets = []

    with torch.no_grad():
        for cat_b, num_b, target_b in test_loader:
            cat_b = cat_b.to(device, non_blocking=True)
            num_b = num_b.to(device, non_blocking=True)
            target_b = target_b.to(device, non_blocking=True)

            with autocast("cuda", enabled=(device.type == "cuda")):
                preds = model(cat_b, num_b)

            all_test_preds.append(preds.cpu().numpy())
            all_test_targets.append(target_b.cpu().numpy())

    test_preds_arr = np.vstack(all_test_preds)
    test_targets_arr = np.vstack(all_test_targets)

    # Des-normalizar los 3 targets
    targets_results = {}
    for i, col_name in enumerate(meta["target_columns"]):
        t_mean = scalers[f"target_{col_name}"]["mean"]
        t_std = scalers[f"target_{col_name}"]["std"]
        true_vals = inv_symlog((test_targets_arr[:, i] * t_std) + t_mean)
        pred_vals = inv_symlog((test_preds_arr[:, i] * t_std) + t_mean)
        m = compute_metrics(true_vals, pred_vals)
        targets_results[col_name] = m
        print(f"Métricas para '{col_name}':")
        print(f"   • RMSE: {m['rmse']:,.2f}")
        print(f"   • MAE:  {m['mae']:,.2f}")
        print(f"   • WAPE: {m['wape']:.2f}% (Precisión Global: {100 - m['wape']:.2f}%)")
        print(f"   • R²:   {m['r2']:.4f}")

    # Guardar reporte de evaluación
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "hardware": {
            "device": str(device),
            "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
            "cuda_version": torch.version.cuda if torch.cuda.is_available() else "N/A",
        },
        "training_time_seconds": total_training_time,
        "epochs_trained": epochs,
        "best_epoch": checkpoint["epoch"],
        "best_val_loss": checkpoint["val_loss"],
        "test_metrics": targets_results,
    }

    report_path = os.path.join(checkpoint_dir, "evaluation_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\nReporte completo de evaluación guardado en: {report_path}")
    print("=" * 75)
    return report


if __name__ == "__main__":
    csv_file = sys.argv[1] if len(sys.argv) > 1 else None
    train_gpu(epochs=120, batch_size=64, lr=1e-3, csv_path=csv_file)
