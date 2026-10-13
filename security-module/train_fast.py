# -*- coding: utf-8 -*-
"""
Entrenamiento Rápido y Optimizado para EPP (Casco, Chaleco, Lentes).
Utiliza:
  - Dataset enfocado data_fast.yaml
  - imgsz=416 (más de 2x más rápido que 640 en CPU)
  - freeze=10 (congelar backbone preentrenado de YOLOv8n)
  - 10-15 épocas (suficientes para converger con transfer learning)
"""
import argparse
from pathlib import Path
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser(description="Entrenamiento Rápido de EPP")
    parser.add_argument("--epochs", type=int, default=10, help="Número de épocas (default: 10)")
    parser.add_argument("--batch", type=int, default=16, help="Tamaño de batch (default: 16)")
    parser.add_argument("--imgsz", type=int, default=416, help="Resolución (default: 416)")
    args = parser.parse_args()

    data_yaml = Path(__file__).parent / "data_fast.yaml"
    if not data_yaml.exists():
        print("[!] No se encontró data_fast.yaml. Generándolo primero...")
        import prepare_fast_epp_dataset
        prepare_fast_epp_dataset.prepare_subset()

    model = YOLO("yolov8n.pt")

    print("=" * 60)
    print("  INICIANDO ENTRENAMIENTO RÁPIDO EPP")
    print(f"  Épocas : {args.epochs}")
    print(f"  Img size: {args.imgsz}")
    print(f"  Batch   : {args.batch}")
    print("=" * 60)

    model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        freeze=10,               # Congela backbone para acelerar gradientes
        project="runs",
        name="epp_detector",
        exist_ok=True,
        verbose=True,
    )

    print("\n[+] Entrenamiento rápido completado!")
    print("[+] El mejor modelo se guardó en: runs/epp_detector/weights/best.pt")

if __name__ == "__main__":
    main()
