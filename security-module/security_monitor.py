import os
import time
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import cv2
import psycopg2
import serial
from importlib import import_module

try:
    load_dotenv = import_module("dotenv").load_dotenv
except ImportError:
    load_dotenv = None

MODULE_DIR = Path(__file__).resolve().parent
if load_dotenv is not None:
    load_dotenv(MODULE_DIR / ".env", override=False)
    load_dotenv(MODULE_DIR.parent / "backend" / ".env", override=False)

PERSON_CLASS_ID = 0
EPP_CLASS_ID = 67

CAMERA_URL = os.getenv("DROIDCAM_URL", "http://192.168.0.34:4747/video")
MODEL_PATH = os.getenv("YOLO_MODEL", "yolov8n.pt")
SERIAL_PORT = os.getenv("ARDUINO_PORT", "COM3")
SERIAL_BAUD = int(os.getenv("ARDUINO_BAUD", "9600"))
ARDUINO_ENABLED = os.getenv("ENABLE_ARDUINO", "false").strip().lower() in {"1", "true", "yes", "on"}
DATABASE_ENABLED = os.getenv("ENABLE_DATABASE", "false").strip().lower() in {"1", "true", "yes", "on"}

DB_CONFIG = {
    "host": os.getenv("DB_HOST", ""),
    "port": int(os.getenv("DB_PORT", "5432")),
    "user": os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
    "dbname": os.getenv("DB_NAME", ""),
}
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def database_url_for_psycopg2(database_url: str) -> str:
    parts = urlsplit(database_url)
    query = urlencode(
        [
            (key, value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
            if key.lower() != "schema"
        ]
    )
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))


def connect_serial() -> Optional[serial.Serial]:
    if not ARDUINO_ENABLED:
        print("[INFO] Arduino desactivado; modo de observación.")
        return None

    try:
        port = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=1)
        time.sleep(2)
        print(f"[OK] Puerto serial conectado: {SERIAL_PORT}")
        return port
    except Exception as exc:
        print(f"[WARN] No se pudo conectar a Arduino: {exc}")
        return None


def insert_incident(status: str, person_detected: bool, equipment_detected: bool, signal: Optional[str]) -> None:
    if not DATABASE_ENABLED:
        return

    conn = None
    try:
        if DATABASE_URL:
            conn = psycopg2.connect(database_url_for_psycopg2(DATABASE_URL))
        else:
            missing = [key for key in ("host", "user", "dbname") if not DB_CONFIG[key]]
            if missing:
                raise ValueError(
                    "Configura DATABASE_URL (preferido) o DB_HOST, DB_USER y DB_NAME en el entorno. "
                    "Para leer archivos .env instala requirements.txt en el entorno autorizado."
                )
            conn = psycopg2.connect(**DB_CONFIG)
        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO security_incidents (
                        camera_source,
                        status,
                        person_detected,
                        equipment_detected,
                        block_signal,
                        notes
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        CAMERA_URL,
                        status,
                        person_detected,
                        equipment_detected,
                        signal,
                        {
                            "INSEGURO": "Detección automatizada: persona sin equipo simulado.",
                            "SEGURO": "Detección automatizada: persona con equipo simulado.",
                            "SIN_PERSONA": "No se detectó una persona en la escena.",
                        }[status],
                    ),
                )
        print(f"[DB] Evento registrado: {status}")
    except Exception as exc:
        print(f"[WARN] No se pudo registrar el evento en PostgreSQL: {exc}")
    finally:
        if conn is not None:
            conn.close()


def load_model():
    try:
        from ultralytics import YOLO
    except OSError as exc:
        if getattr(exc, "winerror", None) == 4551 or "shm.dll" in str(exc):
            raise RuntimeError(
                "Windows bloqueó una DLL de PyTorch mediante Control de aplicaciones. "
                "Solicita al administrador un entorno Python/PyTorch autorizado; "
                "este programa no modifica ni evita esa política."
            ) from exc
        raise RuntimeError(f"No se pudo cargar PyTorch/Ultralytics: {exc}") from exc
    except ImportError as exc:
        raise RuntimeError(
            "Faltan dependencias. Instálalas en el entorno Python autorizado con "
            "'python -m pip install -r requirements.txt'."
        ) from exc

    try:
        return YOLO(MODEL_PATH)
    except Exception as exc:
        raise RuntimeError(f"No se pudo cargar el modelo YOLO '{MODEL_PATH}': {exc}") from exc


def evaluate_state(results) -> tuple[str, bool, bool]:
    persona_detectada = False
    equipo_detectado = False

    for caja in results[0].boxes:
        clase_id = int(caja.cls[0])
        if clase_id == PERSON_CLASS_ID:
            persona_detectada = True
        elif clase_id == EPP_CLASS_ID:
            equipo_detectado = True

    if persona_detectada and not equipo_detectado:
        return "INSEGURO", True, False
    if persona_detectada and equipo_detectado:
        return "SEGURO", True, True
    return "SIN_PERSONA", False, False


def send_arduino_signal(arduino: Optional[serial.Serial], new_state: str, last_state: Optional[str]) -> Optional[str]:
    if arduino is None:
        return last_state

    if new_state == last_state:
        return last_state

    if new_state == "INSEGURO":
        signal = b"B"
        label = "B (Bloquear)"
    elif new_state == "SEGURO":
        signal = b"L"
        label = "L (Liberar)"
    else:
        return last_state

    try:
        arduino.write(signal)
        print(f"[ARDUINO] Señal enviada: {label}")
        return new_state
    except (serial.SerialException, OSError) as exc:
        print(f"[WARN] No se pudo enviar la señal al Arduino: {exc}")

    return last_state


def draw_status(frame, state: str) -> None:
    if state == "INSEGURO":
        cv2.rectangle(frame, (0, 0), (1200, 80), (0, 0, 255), -1)
        cv2.putText(
            frame,
            "ALERTA: MAQUINA BLOQUEADA (FALTA EQUIPO)",
            (20, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 255, 255),
            2,
        )
    elif state == "SEGURO":
        cv2.rectangle(frame, (0, 0), (1200, 80), (0, 255, 0), -1)
        cv2.putText(
            frame,
            "OPERARIO SEGURO: MAQUINA DESBLOQUEADA",
            (20, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 255, 255),
            2,
        )
    else:
        cv2.rectangle(frame, (0, 0), (1200, 80), (128, 128, 128), -1)
        cv2.putText(
            frame,
            "SIN PERSONA DETECTADA",
            (20, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 255, 255),
            2,
        )


def main() -> None:
    print("[INFO] Cargando modelo de Inteligencia Artificial para Plastcontrol...")
    modelo = load_model()

    print(f"[INFO] Conectando a la cámara: {CAMERA_URL}")
    cap = cv2.VideoCapture(CAMERA_URL)
    if not cap.isOpened():
        raise RuntimeError("No se pudo abrir la cámara DroidCam. Verifica la URL o que la app esté activa.")

    arduino = connect_serial()
    last_observed_state: Optional[str] = None
    last_commanded_state: Optional[str] = None

    print("[INFO] Sistema activo. Presiona 'q' para salir.")

    try:
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                print("[WARN] Error de lectura: revisa que DroidCam esté abierta y la IP sea correcta.")
                break

            resultados = modelo(frame, verbose=False)
            frame_dibujo = resultados[0].plot()
            state, person_detected, equipment_detected = evaluate_state(resultados)

            if state != last_observed_state:
                signal = None
                if state in {"INSEGURO", "SEGURO"}:
                    last_commanded_state = send_arduino_signal(
                        arduino,
                        state,
                        last_commanded_state,
                    )
                    if last_commanded_state == state:
                        signal = "B" if state == "INSEGURO" else "L"

                insert_incident(state, person_detected, equipment_detected, signal)
                print(f"[ESTADO] {state}")
                last_observed_state = state

            draw_status(frame_dibujo, state)
            cv2.imshow("Plastcontrol - Seguridad Industrial 4.0", frame_dibujo)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()
        if arduino is not None:
            arduino.close()
            print("[INFO] Puerto serial cerrado.")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:
        print(f"[ERROR] {exc}")
        raise SystemExit(1) from exc
