import argparse
import os
import shutil
from pathlib import Path

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent


def detect_best_device() -> str:
    """Detecta si hay aceleración por GPU NVIDIA CUDA disponible o usa CPU."""
    if TORCH_AVAILABLE and torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        print(f"[Hardware] GPU NVIDIA detectada: {gpu_name} (Aceleración CUDA habilitada)")
        return "0"
    print("[Hardware] No se detectó GPU CUDA. Usando CPU para entrenamiento.")
    return "cpu"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Entrenamiento de Alta Precisión YOLOv8 para EPP (Casco, Chaleco, Gafas) - PlastControl."
    )
    parser.add_argument("--epochs", type=int, default=30, help="Número de épocas (recomendado: 25 a 50)")
    parser.add_argument("--batch", type=int, default=16, help="Tamaño de lote (16 para GPU, 8 para CPU)")
    parser.add_argument("--imgsz", type=int, default=640, help="Resolución de imagen (640 es ideal para gafas y detalles)")
    parser.add_argument("--fraction", type=float, default=1.0, help="Fracción del dataset a usar (1.0 = 100% completo)")
    parser.add_argument("--device", type=str, default="auto", help="'auto', '0' para GPU, o 'cpu'")
    parser.add_argument("--patience", type=int, default=10, help="Early stopping si no hay mejora tras N épocas")
    parser.add_argument("--base-model", type=str, default="yolov8n.pt", help="Modelo base preentrenado (yolov8n.pt o yolov8s.pt)")
    args = parser.parse_args()

    # Seleccionar dispositivo de cómputo
    device = detect_best_device() if args.device == "auto" else args.device
    use_amp = True if device != "cpu" else False

    data_yaml = ROOT / "dataset" / "ppe" / "data.yaml"
    if not data_yaml.exists():
        raise FileNotFoundError(
            f"No se encontró el dataset en {data_yaml}. Asegúrate de tener la carpeta 'dataset/ppe/' completa."
        )

    base_weights = ROOT / args.base_model
    model_source = str(base_weights) if base_weights.exists() else args.base_model

    print("=" * 70)
    print(" INICIANDO ENTRENAMIENTO DE ALTA PRECISIÓN: YOLOv8 PPE")
    print(f" - Dataset:         {data_yaml}")
    print(f" - Modelo Base:     {model_source}")
    print(f" - Épocas:          {args.epochs}")
    print(f" - Fracción Datos:  {int(args.fraction * 100)}% (Dataset Completo)")
    print(f" - Tamaño Batch:    {args.batch}")
    print(f" - Resolución:      {args.imgsz}x{args.imgsz}")
    print(f" - Dispositivo:     {device}")
    print(f" - AMP (Precisión): {use_amp}")
    print("=" * 70)

    model = YOLO(model_source)

    # Hiperparámetros optimizados para alta precisión en objetos pequeños (Goggles) y prendas (Vest/Hardhat)
    results = model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        fraction=args.fraction,
        imgsz=args.imgsz,
        batch=args.batch,
        device=device,
        patience=args.patience,
        optimizer="auto",
        lr0=0.01,
        lrf=0.01,
        momentum=0.937,
        weight_decay=0.0005,
        warmup_epochs=3.0,
        box=7.5,        # Mayor penalización de error de caja delimitadora
        cls=0.5,        # Peso de clasificación
        mosaic=1.0,     # Fusión de 4 imágenes para aprender contextos industriales
        close_mosaic=5, # Desactiva mosaico en las últimas 5 épocas para máxima nitidez en bordes
        mixup=0.1,      # Regularización para evitar falsos positivos
        flipud=0.0,     # No voltear personas de cabeza
        fliplr=0.5,     # Simetría horizontal
        scale=0.5,      # Permite reconocer operarios cerca y lejos
        plots=True,     # Generar matriz de confusión y curvas de precisión-recall
        save=True,
        save_period=5,
        seed=42,
        project=str(ROOT / "runs" / "ppe"),
        name="yolov8n-ppe-hq",
        exist_ok=True,
    )

    # Desplegar los mejores pesos obtenidos (best.pt)
    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    deployed_weights = ROOT / "yolov8n-ppe.pt"

    if best_weights.exists():
        shutil.copy2(best_weights, deployed_weights)
        print("\n" + "=" * 70)
        print(" [ÉXITO] ENTRENAMIENTO FINALIZADO")
        print(f" - Mejores pesos guardados en: {best_weights}")
        print(f" - Pesos desplegados para la API: {deployed_weights}")
        print(" - El microservicio en main.py usará este nuevo modelo optimizado automáticamente.")
        print("=" * 70)
    else:
        print("[ADVERTENCIA] No se encontró best.pt en el directorio de salida.")


if __name__ == "__main__":
    main()