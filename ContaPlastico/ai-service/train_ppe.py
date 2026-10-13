import argparse
import shutil
from pathlib import Path

from ultralytics import YOLO


ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the PlastControl PPE detector.")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--fraction", type=float, default=0.2)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    args = parser.parse_args()

    model = YOLO(str(ROOT / "yolov8n.pt"))
    results = model.train(
        data=str(ROOT / "dataset" / "ppe" / "data.yaml"),
        epochs=args.epochs,
        fraction=args.fraction,
        imgsz=args.imgsz,
        batch=args.batch,
        device="cpu",
        workers=0,
        cache=False,
        amp=False,
        plots=False,
        seed=42,
        close_mosaic=2,
        project=str(ROOT / "runs" / "ppe"),
        name="yolov8n-ppe",
        exist_ok=True,
    )

    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    deployed_weights = ROOT / "yolov8n-ppe.pt"
    shutil.copy2(best_weights, deployed_weights)
    print(f"Deployed PPE weights: {deployed_weights}")


if __name__ == "__main__":
    main()