"""
Script de Evaluación y Auditoría de Predicciones Positivas y Negativas.
Compara valores reales vs pronosticados por la red neuronal en GPU NVIDIA.
"""

import os
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
        sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)
    except Exception:
        pass

import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import polars as pl
import torch

from dataset_loader import PlastDataPipeline, inv_symlog
from model import PlastDemandNet


def run_detailed_evaluation():
    checkpoint_path = "ai_demand_engine/checkpoints/best_demand_gpu_model.pt"
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("=" * 80)
    print("🔬 AUDITORIA DETALLADA: VALORES POSITIVOS (VENTAS) Y NEGATIVOS (DEVOLUCIONES)")
    print("=" * 80)
    print(f"Hardware de Inferencia: {device} ({torch.cuda.get_device_name(0) if device.type == 'cuda' else 'CPU'})")

    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    meta = checkpoint["metadata"]
    scalers = meta["scalers"]

    pipeline = PlastDataPipeline()
    _, _, test_loader, _ = pipeline.get_dataloaders(batch_size=64)

    model = PlastDemandNet(
        vocab_sizes=meta["vocab_sizes"],
        num_features_dim=meta["num_features_dim"],
        hidden_dim=128,
        num_layers=3,
        num_targets=3,
        dropout=0.0,
    ).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    all_preds = []
    all_targets = []

    with torch.no_grad():
        for cat_b, num_b, target_b in test_loader:
            cat_b = cat_b.to(device)
            num_b = num_b.to(device)
            preds = model(cat_b, num_b)
            all_preds.append(preds.cpu().numpy())
            all_targets.append(target_b.cpu().numpy())

    preds_np = np.vstack(all_preds)
    targets_np = np.vstack(all_targets)

    # Des-normalizar
    u_mean = scalers["target_Cantidad_Unidades"]["mean"]
    u_std = scalers["target_Cantidad_Unidades"]["std"]
    true_units = inv_symlog((targets_np[:, 0] * u_std) + u_mean)
    pred_units = inv_symlog((preds_np[:, 0] * u_std) + u_mean)

    w_mean = scalers["target_Total_Peso_Plastico_Kg"]["mean"]
    w_std = scalers["target_Total_Peso_Plastico_Kg"]["std"]
    true_weight = inv_symlog((targets_np[:, 1] * w_std) + w_mean)
    pred_weight = inv_symlog((preds_np[:, 1] * w_std) + w_mean)

    imp_mean = scalers["target_Impacto_Comercial_Estimado_USD"]["mean"]
    imp_std = scalers["target_Impacto_Comercial_Estimado_USD"]["std"]
    true_impact = inv_symlog((targets_np[:, 2] * imp_std) + imp_mean)
    pred_impact = inv_symlog((preds_np[:, 2] * imp_std) + imp_mean)

    # Segmentar en Positivos (Pedidos regulares), Ceros (Cancelaciones) y Negativos (Devoluciones)
    pos_mask = true_units > 0
    zero_mask = true_units == 0
    neg_mask = true_units < 0

    print(f"\n[1] Muestras evaluadas en Test Set: {len(true_units)} transacciones")
    print(f"   • Transacciones Positivas (Ventas/Pedidos) : {np.sum(pos_mask):>4}")
    print(f"   • Transacciones Cero (Cancelaciones)       : {np.sum(zero_mask):>4}")
    print(f"   • Transacciones Negativas (Devoluciones)   : {np.sum(neg_mask):>4}")

    # Tabla de ejemplos
    print("\n[2] MUESTRAS COMPARATIVAS (REAL VS PREDICHO):")
    print(f"{'Tipo':<12} | {'Unidades Real':<15} | {'Unidades Pred':<15} | {'Kg Real':<12} | {'Kg Pred':<12} | {'Impacto USD Real':<18} | {'Impacto USD Pred':<18}")
    print("-" * 115)

    # Mostrar algunas negativas
    neg_indices = np.where(neg_mask)[0]
    for idx in neg_indices[:4]:
        print(f"{'DEVOLUCION':<12} | {true_units[idx]:<15,.0f} | {pred_units[idx]:<15,.0f} | {true_weight[idx]:<12,.1f} | {pred_weight[idx]:<12,.1f} | ${true_impact[idx]:<17,.2f} | ${pred_impact[idx]:<17,.2f}")

    # Mostrar algunas cancelaciones
    zero_indices = np.where(zero_mask)[0]
    for idx in zero_indices[:3]:
        print(f"{'CANCELADA':<12} | {true_units[idx]:<15,.0f} | {pred_units[idx]:<15,.0f} | {true_weight[idx]:<12,.1f} | {pred_weight[idx]:<12,.1f} | ${true_impact[idx]:<17,.2f} | ${pred_impact[idx]:<17,.2f}")

    # Mostrar algunas positivas
    pos_indices = np.where(pos_mask)[0]
    for idx in pos_indices[:5]:
        print(f"{'PEDIDO':<12} | {true_units[idx]:<15,.0f} | {pred_units[idx]:<15,.0f} | {true_weight[idx]:<12,.1f} | {pred_weight[idx]:<12,.1f} | ${true_impact[idx]:<17,.2f} | ${pred_impact[idx]:<17,.2f}")

    # Generar Gráfica comparativa Real vs Predicho
    fig, axes = plt.subplots(1, 2, figsize=(14, 5), dpi=150)
    
    # Gráfico 1: Peso Plástico Kg
    axes[0].scatter(true_weight, pred_weight, alpha=0.6, color="#0284c7", edgecolors="none", s=25)
    lims0 = [min(true_weight.min(), pred_weight.min()), max(true_weight.max(), pred_weight.max())]
    axes[0].plot(lims0, lims0, "r--", alpha=0.75, lw=2, label="Línea Ideal (y = x)")
    axes[0].set_title("Total Peso Plástico (Kg) — Real vs Predicho", fontweight="bold")
    axes[0].set_xlabel("Kg Reales (Negativos y Positivos)")
    axes[0].set_ylabel("Kg Pronosticados por IA")
    axes[0].grid(True, linestyle=":", alpha=0.6)
    axes[0].legend()

    # Gráfico 2: Impacto Comercial USD
    axes[1].scatter(true_impact, pred_impact, alpha=0.6, color="#10b981", edgecolors="none", s=25)
    lims1 = [min(true_impact.min(), pred_impact.min()), max(true_impact.max(), pred_impact.max())]
    axes[1].plot(lims1, lims1, "r--", alpha=0.75, lw=2, label="Línea Ideal (y = x)")
    axes[1].set_title("Impacto Comercial (USD) — Real vs Predicho", fontweight="bold")
    axes[1].set_xlabel("USD Reales (Negativos y Positivos)")
    axes[1].set_ylabel("USD Pronosticados por IA")
    axes[1].grid(True, linestyle=":", alpha=0.6)
    axes[1].legend()

    plt.tight_layout()
    chart_path = "ai_demand_engine/checkpoints/actual_vs_predicted.png"
    plt.savefig(chart_path)
    plt.close()
    print(f"\n[3] Gráfica de dispersión 'Real vs Predicho' guardada en: {chart_path}")
    print("=" * 80)


if __name__ == "__main__":
    run_detailed_evaluation()

