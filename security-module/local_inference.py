import base64
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import onnxruntime as ort

MODELS_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = Path(os.getenv("PPE_ONNX_MODEL", MODELS_DIR / "best.onnx"))
MODEL_CONFIG_PATH = Path(
    os.getenv("PPE_MODEL_CONFIG", MODELS_DIR / "kaggle_ppe_config.json")
)
HOST = "127.0.0.1"
PORT = int(os.getenv("PPE_INFERENCE_PORT", "8010"))
DEFAULT_INPUT_SIZE = 640
CONFIDENCE_THRESHOLD = float(os.getenv("PPE_CONFIDENCE_THRESHOLD", "0.25"))
NMS_THRESHOLD = 0.45
MAX_REQUEST_BYTES = 8_500_000

DEFAULT_CLASS_NAMES = ["boots", "gloves", "goggles", "helmet", "person", "vest"]

DEFAULT_API_LABELS = {
    "person": "Person",
    "no_helmet": "no-helmet",
    "no_goggles": "no-goggles",
    "no_vest": "no-vest",
    "no_safety_vest": "no-vest",
}

MODEL_CONFIG: dict[str, Any] = {}
if MODEL_CONFIG_PATH.is_file():
    MODEL_CONFIG = json.loads(MODEL_CONFIG_PATH.read_text(encoding="utf-8"))

INPUT_SIZE = int(MODEL_CONFIG.get("input_size", DEFAULT_INPUT_SIZE))
CLASS_NAMES = MODEL_CONFIG.get("class_names", DEFAULT_CLASS_NAMES)
API_LABELS = {**DEFAULT_API_LABELS, **MODEL_CONFIG.get("api_labels", {})}
PERSON_DETECTION_AVAILABLE = bool(
    MODEL_CONFIG.get(
        "person_detection_available",
        any(name.lower() in {"person", "worker"} for name in CLASS_NAMES),
    )
)


def load_detector():
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(f"No se encontró el modelo ONNX: {MODEL_PATH}")
    session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    return session, input_name


def decode_image(image_base64: str) -> np.ndarray:
    if image_base64.startswith("data:"):
        _, image_base64 = image_base64.split(",", 1)
    image_bytes = base64.b64decode(image_base64, validate=True)
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("La imagen enviada no tiene un formato válido.")
    return image


def letterbox(image: np.ndarray) -> tuple[np.ndarray, float, int, int]:
    height, width = image.shape[:2]
    scale = INPUT_SIZE / max(height, width)
    resized_width = int(round(width * scale))
    resized_height = int(round(height * scale))
    resized = cv2.resize(image, (resized_width, resized_height), interpolation=cv2.INTER_LINEAR)

    pad_x = (INPUT_SIZE - resized_width) // 2
    pad_y = (INPUT_SIZE - resized_height) // 2
    canvas = np.full((INPUT_SIZE, INPUT_SIZE, 3), 114, dtype=np.uint8)
    canvas[pad_y : pad_y + resized_height, pad_x : pad_x + resized_width] = resized
    blob = cv2.dnn.blobFromImage(
        canvas,
        scalefactor=1 / 255.0,
        size=(INPUT_SIZE, INPUT_SIZE),
        swapRB=True,
        crop=False,
    )
    return blob, scale, pad_x, pad_y


def parse_detections(
    output: np.ndarray,
    original_width: int,
    original_height: int,
    scale: float,
    pad_x: int,
    pad_y: int,
) -> list[dict[str, Any]]:
    predictions = output[0] if output.ndim == 3 else output
    if predictions.ndim == 1 and predictions.shape[0] == 4 + len(CLASS_NAMES):
        predictions = predictions.reshape(1, -1)
    if predictions.ndim != 2:
        raise ValueError(f"Salida ONNX inesperada: {output.shape}")
    if predictions.shape[0] == 4 + len(CLASS_NAMES):
        predictions = predictions.T
    if predictions.shape[1] != 4 + len(CLASS_NAMES):
        raise ValueError(
            f"El modelo devolvió {predictions.shape[1]} valores por detección; "
            f"se esperaban {4 + len(CLASS_NAMES)}."
        )

    grouped: dict[int, tuple[list[list[int]], list[float]]] = {}
    for row in predictions:
        class_scores = row[4:]
        class_id = int(np.argmax(class_scores))
        confidence = float(class_scores[class_id])
        if confidence < CONFIDENCE_THRESHOLD:
            continue

        center_x, center_y, box_width, box_height = row[:4]
        center_x = (float(center_x) - pad_x) / scale
        center_y = (float(center_y) - pad_y) / scale
        box_width = float(box_width) / scale
        box_height = float(box_height) / scale
        x1 = max(0, int(center_x - box_width / 2))
        y1 = max(0, int(center_y - box_height / 2))
        x2 = min(original_width, int(center_x + box_width / 2))
        y2 = min(original_height, int(center_y + box_height / 2))
        if x2 <= x1 or y2 <= y1:
            continue

        boxes, scores = grouped.setdefault(class_id, ([], []))
        boxes.append([x1, y1, x2 - x1, y2 - y1])
        scores.append(confidence)

    detections: list[dict[str, Any]] = []
    for class_id, (boxes, scores) in grouped.items():
        kept_indices = cv2.dnn.NMSBoxes(boxes, scores, CONFIDENCE_THRESHOLD, NMS_THRESHOLD)
        for index in np.asarray(kept_indices).reshape(-1):
            x, y, width, height = boxes[int(index)]
            class_name = CLASS_NAMES[class_id]
            detections.append(
                {
                    "x": x + width / 2,
                    "y": y + height / 2,
                    "width": width,
                    "height": height,
                    "confidence": scores[int(index)],
                    "class": API_LABELS.get(class_name, class_name),
                }
            )
    return detections


class InferenceHandler(BaseHTTPRequestHandler):
    detector = None

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path != "/health":
            self._send_json(404, {"error": "Ruta no encontrada."})
            return
        self._send_json(
            200,
            {
                "status": "ok",
                "model": MODEL_PATH.name,
                "inputSize": INPUT_SIZE,
                "classes": CLASS_NAMES,
                "personDetectionAvailable": PERSON_DETECTION_AVAILABLE,
                "confidenceThreshold": CONFIDENCE_THRESHOLD,
            },
        )

    def do_POST(self) -> None:
        if self.path != "/infer":
            self._send_json(404, {"error": "Ruta no encontrada."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
                self._send_json(413, {"error": "Tamaño de solicitud inválido o superior al límite."})
                return

            payload = json.loads(self.rfile.read(content_length))
            image_base64 = payload.get("imageBase64")
            if not isinstance(image_base64, str) or not image_base64:
                self._send_json(400, {"error": "Se requiere imageBase64."})
                return

            image = decode_image(image_base64)
            blob, scale, pad_x, pad_y = letterbox(image)
            output = self.detector.run(None, {self.input_name: blob})[0]
            predictions = parse_detections(
                output,
                image.shape[1],
                image.shape[0],
                scale,
                pad_x,
                pad_y,
            )
            self._send_json(
                200,
                {
                    "predictions": predictions,
                    "personDetectionAvailable": PERSON_DETECTION_AVAILABLE,
                },
            )
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            self._send_json(400, {"error": str(exc)})
        except Exception:
            self._send_json(500, {"error": "Falló la inferencia local."})

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[HTTP] {self.address_string()} {format % args}")


def main() -> None:
    InferenceHandler.detector, InferenceHandler.input_name = load_detector()
    server = HTTPServer((HOST, PORT), InferenceHandler)
    print(f"[OK] PPE ONNX cargado con ONNX Runtime: {MODEL_PATH}")
    print(f"[OK] Inferencia local disponible solo en http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Cerrando worker de inferencia.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
