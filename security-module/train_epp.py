"""
═══════════════════════════════════════════════════════════════
  ENTRENAMIENTO - Módulo IA Seguridad Industrial (EPP)
  Entrena YOLOv8 con el dataset de EPP local
═══════════════════════════════════════════════════════════════
  Uso:  python train_epp.py
        python train_epp.py --epochs 100 --model yolov8m.pt
═══════════════════════════════════════════════════════════════
"""

import argparse
import os
from pathlib import Path
from ultralytics import YOLO

# ──────────────────────────────────────────────
#  Configuración por defecto
# ──────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
DATA_YAML  = BASE_DIR / "data_epp.yaml"
RUNS_DIR   = BASE_DIR / "runs"
PROJECT    = str(RUNS_DIR)
TASK_NAME  = "epp_detector"

def parse_args():
    p = argparse.ArgumentParser(description="Entrenamiento YOLOv8 — EPP Seguridad Industrial")
    p.add_argument("--model",   default="yolov8n.pt",
                   help="Modelo base: yolov8n/s/m/l/x.pt  (default: yolov8n.pt)")
    p.add_argument("--epochs",  type=int, default=60,
                   help="Numero de epocas (default: 60)")
    p.add_argument("--imgsz",   type=int, default=640,
                   help="Tamano de imagen (default: 640)")
    p.add_argument("--batch",   type=int, default=16,
                   help="Tamano de batch (default: 16, usa -1 para auto)")
    p.add_argument("--device",  default="",
                   help="Dispositivo: '' = auto, 'cpu', '0' = GPU 0")
    p.add_argument("--resume",  action="store_true",
                   help="Reanudar entrenamiento previo")
    p.add_argument("--patience",type=int, default=20,
                   help="Early stopping patience (default: 20)")
    return p.parse_args()


def main():
    args = parse_args()

    print("=" * 60)
    print("  MODULO IA - SEGURIDAD INDUSTRIAL  |  Entrenamiento EPP")
    print("=" * 60)
    print(f"  Modelo base : {args.model}")
    print(f"  Epocas      : {args.epochs}")
    print(f"  Img size    : {args.imgsz}")
    print(f"  Batch       : {args.batch}")
    print(f"  Dataset     : {DATA_YAML}")
    print("=" * 60)

    if not DATA_YAML.exists():
        raise FileNotFoundError(f"No se encontro: {DATA_YAML}")

    # Detectar automáticamente si hay GPU CUDA disponible (RTX 4060)
    device_to_use = args.device
    if not device_to_use:
        try:
            import torch
            if torch.cuda.is_available():
                device_to_use = "0"
                print(f"  [+] GPU NVIDIA Detectada: {torch.cuda.get_device_name(0)} (Aceleración CUDA activa)")
            else:
                device_to_use = "cpu"
                print("  [!] GPU no disponible en PyTorch, usando CPU")
        except Exception:
            device_to_use = "cpu"

    print(f"  Dispositivo : {device_to_use}")

    # Cargar modelo
    model = YOLO(args.model)

    # Entrenamiento optimizado con GPU
    results = model.train(
        data       = str(DATA_YAML),
        epochs     = args.epochs,
        imgsz      = args.imgsz,
        batch      = args.batch,
        device     = device_to_use,
        workers    = 4 if device_to_use != "cpu" else 0,
        amp        = True,
        project    = PROJECT,
        name       = TASK_NAME,
        patience   = args.patience,
        resume     = args.resume,
        # Hiperparametros optimizados para EPP
        lr0        = 0.01,
        lrf        = 0.01,
        momentum   = 0.937,
        weight_decay = 0.0005,
        warmup_epochs = 3,
        warmup_momentum = 0.8,
        box        = 7.5,
        cls        = 0.5,
        dfl        = 1.5,
        # Augmentaciones
        hsv_h      = 0.015,
        hsv_s      = 0.7,
        hsv_v      = 0.4,
        degrees    = 5.0,
        translate  = 0.1,
        scale      = 0.5,
        fliplr     = 0.5,
        mosaic     = 1.0,
        # Logging
        plots      = True,
        save       = True,
        verbose    = True,
    )

    # Ruta del mejor modelo
    best_pt = Path(PROJECT) / TASK_NAME / "weights" / "best.pt"
    print("\n" + "=" * 60)
    print("  ENTRENAMIENTO COMPLETADO")
    print(f"  Mejor modelo : {best_pt}")
    print("=" * 60)

    # Validacion final
    print("\n Validacion con mejor modelo...")
    val_model = YOLO(str(best_pt))
    val_model.val(data=str(DATA_YAML), imgsz=args.imgsz)

    print(f"\nModelo listo: {best_pt}")
    print("   Ejecuta la app con:  python epp_app.py")


if __name__ == "__main__":
    main()
