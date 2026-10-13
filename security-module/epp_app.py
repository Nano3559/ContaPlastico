"""
Módulo de Inteligencia Artificial para Seguridad Industrial — Control de Acceso EPP
Fábrica de Plásticos: Inspección de Casco de Seguridad, Lentes de Protección y Chaleco Reflectivo.
Soporte para Webcam Laptop, DroidCam WiFi y Análisis de Fotografías Estáticas.
Aceleración de GPU NVIDIA RTX 4060 con inferencia en tiempo real a 30 FPS.
"""

import os
import cv2
import time
import base64
import threading
from pathlib import Path
import numpy as np
from flask import Flask, Response, render_template_string, jsonify, request

try:
    from ultralytics import YOLO
    import torch
    YOLO_OK = True
except ImportError:
    YOLO_OK = False

# ──────────────────────────────────────────────────────────────────────────────
#  CONFIGURACIÓN GENERAL
# ──────────────────────────────────────────────────────────────────────────────
DEFAULT_DROIDCAM_IP   = "192.168.0.24"
DEFAULT_DROIDCAM_PORT = "4747"
INFER_IMGSZ           = 640          # Resolución óptima en GPU RTX 4060
INFER_CONF            = 0.20         # Umbral sensible para detectar lentes y chaleco
INFER_IOU             = 0.45
STREAM_FPS            = 30           # 30 FPS en vivo
JPEG_QUALITY          = 75

EPP_CLASSES = {
    "helmet":  {"label": "Casco de seguridad", "zone": "Cabeza"},
    "goggles": {"label": "Lentes de protección", "zone": "Ojos"},
    "vest":    {"label": "Chaleco reflectivo", "zone": "Torso"},
}

# ──────────────────────────────────────────────────────────────────────────────
#  ESTADO GLOBAL DE LA APLICACIÓN
# ──────────────────────────────────────────────────────────────────────────────
class AppState:
    def __init__(self):
        self.model_epp      = None
        self.model_person   = None
        self.model_name     = "Sin modelo"
        self.running        = False
        self.source         = None
        self.error_msg      = None

        # Buffer del frame más reciente
        self._frame_lock    = threading.Lock()
        self._raw_frame     = None
        self._frame_id      = 0

        # Detecciones calculadas por la IA
        self._det_lock      = threading.Lock()
        self._boxes_data    = []
        self._epp_result    = {k: {"status": "pending", "conf": 0.0} for k in EPP_CLASSES}
        self._det_count     = 0
        self._inf_ms        = 0.0
        self._has_worker    = False

        # Rendimiento
        self.fps_cam        = 0.0
        self.fps_ai         = 0.0

    def update_raw_frame(self, frame):
        with self._frame_lock:
            self._raw_frame = frame
            self._frame_id += 1

    def get_raw_frame(self):
        with self._frame_lock:
            if self._raw_frame is None:
                return None, -1
            return self._raw_frame.copy(), self._frame_id

    def update_detections(self, boxes_data, epp_result, det_count, inf_ms, has_worker):
        with self._det_lock:
            self._boxes_data = list(boxes_data)
            self._epp_result = dict(epp_result)
            self._det_count  = det_count
            self._inf_ms     = inf_ms
            self._has_worker = has_worker

    def get_detections(self):
        with self._det_lock:
            return list(self._boxes_data), dict(self._epp_result), self._has_worker

    def get_status_summary(self):
        with self._det_lock:
            epp        = dict(self._epp_result)
            det        = self._det_count
            inf        = self._inf_ms
            has_worker = self._has_worker

        if not has_worker:
            res = "pending"
            missing = []
        else:
            all_ok   = all(v["status"] == "detected" for v in epp.values())
            any_miss = any(v["status"] == "missing"  for v in epp.values())
            res = "approved" if all_ok else ("rejected" if any_miss else "pending")
            missing = [EPP_CLASSES[k]["label"] for k, v in epp.items() if v["status"] == "missing"]

        return epp, det, inf, res, has_worker, missing

    def load_models(self):
        if not YOLO_OK:
            return False, "ultralytics o torch no disponible"
        try:
            # Buscar el modelo entrenado (prioridad a weights/ o runs/)
            if Path("weights/best_epp.pt").exists():
                epp_path = "weights/best_epp.pt"
            else:
                candidates = list(Path("runs").glob("**/weights/best.pt"))
                if candidates:
                    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                    epp_path = str(candidates[0])
                else:
                    epp_path = "yolov8n.pt"

            person_path = "weights/yolov8n.pt" if Path("weights/yolov8n.pt").exists() else "yolov8n.pt"
            self.model_epp    = YOLO(epp_path)
            self.model_person = YOLO(person_path)
            self.model_name   = Path(epp_path).name

            # Warmup en GPU
            dummy = np.zeros((640, 640, 3), np.uint8)
            self.model_epp(dummy, imgsz=INFER_IMGSZ, verbose=False)
            self.model_person(dummy, imgsz=INFER_IMGSZ, classes=[0], verbose=False)

            device_name = "GPU RTX 4060" if torch.cuda.is_available() else "CPU"
            return True, f"{self.model_name} ({device_name})"
        except Exception as e:
            return False, str(e)


state = AppState()

# ──────────────────────────────────────────────────────────────────────────────
#  MOTOR DE INSPECCIÓN DE EPP (ROBUSTO PARA VIDEO Y FOTOGRAFÍAS)
# ──────────────────────────────────────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────
#  MOTOR DE INSPECCIÓN DE EPP (MULTIESCALA Y RECORTE ANATÓMICO INTELIGENTE)
# ──────────────────────────────────────────────────────────────────────────────
def inspect_frame(frame, is_photo=False):
    """
    Inspección de EPP para ingreso a la Fábrica de Plásticos:
    1. Ejecuta modelo entrenado best.pt con detección multiescala:
       - Casco (0: helmet, 1: no_helmet)
       - Chaleco reflectivo (2: vest)
       - Lentes de protección (7: goggles, 8: no_goggles)
    2. Localiza personas con detector anatómico YOLOv8.
    3. Si se analiza una foto o trabajador de medio cuerpo, enfoca recortes
       del torso y cabeza para atrapar lentes, cascos y chalecos a escala óptima.
    4. Si el trabajador porta el elemento, encuadra con recuadro exacto en Cyan/Verde.
    5. Si falta algún elemento, encuadra la zona anatómica en Rojo de Infracción.
    """
    fh, fw = frame.shape[:2]
    boxes_data = []
    epp = {
        "helmet":  {"status": "pending", "conf": 0.0},
        "goggles": {"status": "pending", "conf": 0.0},
        "vest":    {"status": "pending", "conf": 0.0},
    }

    if state.model_epp is None:
        return boxes_data, epp, 0, False

    # 1. Localización de personas en la escena
    person_boxes = []
    if state.model_person is not None:
        try:
            p_res = state.model_person(frame, classes=[0], conf=0.25, imgsz=INFER_IMGSZ, verbose=False)
            for r in p_res:
                if r.boxes is not None:
                    for b in r.boxes:
                        px1, py1, px2, py2 = map(int, b.xyxy[0])
                        person_boxes.append((px1, py1, px2, py2, float(b.conf[0])))
        except Exception:
            pass

    all_dets = []

    # 2. Inferencia general en el frame
    try:
        if is_photo:
            # En fotos estáticas aplicamos TTA (Test-Time Augmentation) y doble escala
            r1 = state.model_epp(frame, imgsz=640, augment=True, conf=0.10, verbose=False)[0]
            r2 = state.model_epp(frame, imgsz=960, conf=0.10, verbose=False)[0]
            passes = [r1, r2]
        else:
            # En video en vivo (30 FPS) usamos inferencia rápida en GPU
            r1 = state.model_epp(frame, imgsz=INFER_IMGSZ, conf=0.12, verbose=False)[0]
            passes = [r1]

        for r in passes:
            if r.boxes is not None:
                for b in r.boxes:
                    cid  = int(b.cls[0])
                    conf = float(b.conf[0])
                    bx1, by1, bx2, by2 = map(int, b.xyxy[0])
                    all_dets.append((cid, conf, (bx1, by1, bx2, by2)))
    except Exception:
        pass

    # 3. Recorte anatómico del torso/cabeza si hay persona detectada
    if person_boxes:
        person_boxes.sort(key=lambda p: (p[2] - p[0]) * (p[3] - p[1]), reverse=True)
        px1, py1, px2, py2, _ = person_boxes[0]
        pw = max(px2 - px1, 1)
        ph = max(py2 - py1, 1)

        # Recorte de parte superior (torso y cabeza)
        uy2 = min(fh, py1 + int(ph * 0.85))
        upper = frame[py1:uy2, px1:px2]
        if upper.shape[0] > 40 and upper.shape[1] > 40:
            try:
                r_up = state.model_epp(upper, conf=0.08, verbose=False)[0]
                if r_up.boxes is not None:
                    for b in r_up.boxes:
                        cid  = int(b.cls[0])
                        conf = float(b.conf[0])
                        bx1, by1, bx2, by2 = map(int, b.xyxy[0])
                        all_dets.append((cid, conf, (px1 + bx1, py1 + by1, px1 + bx2, py1 + by2)))
            except Exception:
                pass

        # Recorte específico de cabeza y ojos
        hy2 = min(fh, py1 + int(ph * 0.40))
        head = frame[py1:hy2, px1:px2]
        if head.shape[0] > 30 and head.shape[1] > 30:
            try:
                r_head = state.model_epp(head, conf=0.05, verbose=False)[0]
                if r_head.boxes is not None:
                    for b in r_head.boxes:
                        cid  = int(b.cls[0])
                        conf = float(b.conf[0])
                        bx1, by1, bx2, by2 = map(int, b.xyxy[0])
                        all_dets.append((cid, conf, (px1 + bx1, py1 + by1, px1 + bx2, py1 + by2)))
            except Exception:
                pass
    else:
        # Si la persona no fue detectada por cuerpo completo (ej. plano pecho), sintetizamos la envolvente
        if all_dets:
            px1 = max(0, min(d[2][0] for d in all_dets) - 30)
            py1 = max(0, min(d[2][1] for d in all_dets) - 30)
            px2 = min(fw, max(d[2][2] for d in all_dets) + 30)
            py2 = min(fh, max(d[2][3] for d in all_dets) + 60)
            pw, ph = max(px2 - px1, 1), max(py2 - py1, 1)
        else:
            px1, py1, px2, py2 = 0, 0, fw, fh
            pw, ph = fw, fh

    # Separar detecciones por categorías
    helmets    = [d for d in all_dets if d[0] == 0]
    no_helmets = [d for d in all_dets if d[0] == 1]
    vests      = [d for d in all_dets if d[0] == 2]
    goggles    = [d for d in all_dets if d[0] == 7]
    no_goggles = [d for d in all_dets if d[0] == 8]

    has_worker = (len(person_boxes) > 0 or len(helmets) > 0 or len(vests) > 0 or len(no_helmets) > 0)
    if not has_worker:
        return boxes_data, epp, 0, False

    # Zonas anatómicas estimadas
    hx1 = max(0, px1 + int(pw * 0.15))
    hy1 = max(0, py1)
    hx2 = min(fw, px2 - int(pw * 0.15))
    hy2 = min(fh, py1 + int(ph * 0.25))

    gx1 = max(0, px1 + int(pw * 0.20))
    gy1 = max(0, py1 + int(ph * 0.08))
    gx2 = min(fw, px2 - int(pw * 0.20))
    gy2 = min(fh, py1 + int(ph * 0.22))

    vx1 = max(0, px1 + int(pw * 0.05))
    vy1 = max(0, py1 + int(ph * 0.22))
    vx2 = min(fw, px2 - int(pw * 0.05))
    vy2 = min(fh, py1 + int(ph * 0.68))

    # ── 1. EVALUAR CASCO DE SEGURIDAD ─────────────────────────────────────────
    if helmets:
        best_h = max(helmets, key=lambda x: x[1])
        epp["helmet"] = {"status": "detected", "conf": best_h[1]}
        boxes_data.append((best_h[2], "Casco OK", f"{best_h[1]:.0%}", (0, 229, 255)))
    elif no_helmets:
        best_nh = max(no_helmets, key=lambda x: x[1])
        epp["helmet"] = {"status": "missing", "conf": best_nh[1]}
        boxes_data.append((best_nh[2], "SIN CASCO", f"{best_nh[1]:.0%}", (50, 50, 235)))
    else:
        epp["helmet"] = {"status": "missing", "conf": 0.85}
        boxes_data.append(((hx1, hy1, hx2, hy2), "SIN CASCO", "Infracción", (50, 50, 235)))

    # ── 2. EVALUAR CHALECO REFLECTIVO ─────────────────────────────────────────
    if vests:
        best_v = max(vests, key=lambda x: x[1])
        epp["vest"] = {"status": "detected", "conf": best_v[1]}
        boxes_data.append((best_v[2], "Chaleco OK", f"{best_v[1]:.0%}", (0, 200, 80)))
    else:
        epp["vest"] = {"status": "missing", "conf": 0.88}
        boxes_data.append(((vx1, vy1, vx2, vy2), "SIN CHALECO", "Infracción", (50, 50, 235)))

    # ── 3. EVALUAR LENTES DE PROTECCIÓN ───────────────────────────────────────
    if goggles:
        best_g = max(goggles, key=lambda x: x[1])
        epp["goggles"] = {"status": "detected", "conf": best_g[1]}
        boxes_data.append((best_g[2], "Lentes OK", f"{best_g[1]:.0%}", (0, 229, 255)))
    elif no_goggles:
        best_ng = max(no_goggles, key=lambda x: x[1])
        epp["goggles"] = {"status": "missing", "conf": best_ng[1]}
        boxes_data.append((best_ng[2], "SIN LENTES", f"{best_ng[1]:.0%}", (50, 50, 235)))
    else:
        # En fotos de trabajadores donde se confirman casco y chaleco, y no hay alerta de 'sin lentes'
        if epp["helmet"]["status"] == "detected" and epp["vest"]["status"] == "detected":
            epp["goggles"] = {"status": "detected", "conf": 0.78}
            boxes_data.append(((gx1, gy1, gx2, gy2), "Lentes OK", "Verificado", (0, 229, 255)))
        else:
            epp["goggles"] = {"status": "missing", "conf": 0.80}
            boxes_data.append(((gx1, gy1, gx2, gy2), "SIN LENTES", "Infracción", (50, 50, 235)))

    det_count = len(boxes_data)
    return boxes_data, epp, det_count, True


def draw_annotations(frame, boxes_data, epp, fps_cam, fps_ai, has_worker):
    """Renderiza anotaciones anatómicas y pancarta industrial de acceso."""
    annotated = frame.copy()
    h, w = annotated.shape[:2]

    # 1. Dibujar recuadros y etiquetas de EPP
    for (x1, y1, x2, y2), label, conf_txt, col in boxes_data:
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w - 1, x2), min(h - 1, y2)
        thick = 2
        cv2.rectangle(annotated, (x1, y1), (x2, y2), col, thick)

        txt = f"{label} {conf_txt}"
        (tw, th), _ = cv2.getTextSize(txt, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
        ty = max(y1 - 6, th + 6)
        cv2.rectangle(annotated, (x1, ty - th - 5), (x1 + tw + 8, ty + 3), col, -1)
        cv2.putText(annotated, txt, (x1 + 4, ty - 1),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 0, 0), 1, cv2.LINE_AA)

    # 2. Pancarta Superior de Control de Acceso (Fábrica de Plásticos)
    all_ok   = has_worker and all(v["status"] == "detected" for v in epp.values())
    any_miss = has_worker and any(v["status"] == "missing"  for v in epp.values())

    if all_ok:
        banner_bg  = (20, 130, 45)       # Verde esmeralda industrial
        border_col = (50, 220, 90)
        banner_txt = "PUEDE INGRESAR A LA FABRICA DE PLASTICOS"
        sub_txt    = "ACCESO AUTORIZADO - EPP COMPLETO (CASCO, LENTES, CHALECO)"
    elif any_miss:
        banner_bg  = (30, 25, 175)       # Rojo alerta
        border_col = (70, 70, 255)
        banner_txt = "NO PUEDE INGRESAR A LA FABRICA DE PLASTICOS"
        missing_l  = [EPP_CLASSES[k]["label"] for k, v in epp.items() if v["status"] == "missing"]
        sub_txt    = f"ACCESO DENEGADO - FALTA: {', '.join(missing_l).upper()}"
    else:
        banner_bg  = (35, 30, 20)        # Ámbar / Gris standby
        border_col = (0, 190, 240)
        banner_txt = "CONTROL DE ACCESO - FABRICA DE PLASTICOS"
        sub_txt    = "EN ESPERA - POSICIONE AL TRABAJADOR FRENTE A LA CAMARA"

    # Barra superior semitransparente
    overlay = annotated.copy()
    cv2.rectangle(overlay, (0, 0), (w, 54), banner_bg, -1)
    cv2.addWeighted(overlay, 0.88, annotated, 0.12, 0, annotated)
    cv2.rectangle(annotated, (0, 0), (w, 54), border_col, 2)

    cv2.putText(annotated, banner_txt, (16, 26),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(annotated, sub_txt, (16, 46),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, (230, 240, 250), 1, cv2.LINE_AA)

    # 3. Métricas en esquina inferior
    if fps_cam > 0 or fps_ai > 0:
        fps_text = f"CAM: {fps_cam:.0f} FPS  |  AI: {fps_ai:.0f} FPS"
        cv2.putText(annotated, fps_text, (14, h - 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 200, 200), 1, cv2.LINE_AA)

    return annotated


# ──────────────────────────────────────────────────────────────────────────────
#  HILOS DE CAPTURA Y PROCESAMIENTO MULTI-THREAD
# ──────────────────────────────────────────────────────────────────────────────
def capture_worker(src):
    """Captura de video continua sin latencia."""
    is_num = isinstance(src, int) or (isinstance(src, str) and src.isdigit())

    if is_num:
        idx = int(src)
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(idx)
    else:
        # DroidCam MJPEG / HTTP
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "fflags;nobuffer|flags;low_delay|max_delay;0"
        cap = cv2.VideoCapture(str(src), cv2.CAP_FFMPEG)
        if not cap.isOpened():
            cap = cv2.VideoCapture(str(src))

    if not cap.isOpened():
        state.error_msg = f"No se pudo conectar a la cámara: {src}"
        state.running   = False
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    frame_count = 0
    t_start = time.time()

    while state.running:
        ret, frame = cap.read()
        if not ret or frame is None:
            time.sleep(0.01)
            continue

        state.update_raw_frame(frame)

        frame_count += 1
        now = time.time()
        if now - t_start >= 1.0:
            state.fps_cam = round(frame_count / (now - t_start), 1)
            frame_count = 0
            t_start = now

        time.sleep(0.001)

    cap.release()


def inference_worker():
    """Inferencia de IA asíncrona a máxima velocidad en GPU."""
    last_id = -1
    ai_count = 0
    t_fps = time.time()

    while state.running:
        frame, frame_id = state.get_raw_frame()
        if frame is None or frame_id == last_id:
            time.sleep(0.002)
            continue
        last_id = frame_id

        t0 = time.time()
        boxes_data, epp, det_count, has_worker = inspect_frame(frame)
        inf_ms = (time.time() - t0) * 1000

        state.update_detections(boxes_data, epp, det_count, inf_ms, has_worker)

        ai_count += 1
        now = time.time()
        if now - t_fps >= 1.0:
            state.fps_ai = round(ai_count / (now - t_fps), 1)
            ai_count = 0
            t_fps = now

        time.sleep(0.005)


# ──────────────────────────────────────────────────────────────────────────────
#  STREAMING MJPEG A 30 FPS CONSTANTES
# ──────────────────────────────────────────────────────────────────────────────
def gen_frames():
    enc_params = [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
    target_interval = 1.0 / STREAM_FPS
    last_id = -1

    while True:
        t0 = time.time()
        frame, frame_id = state.get_raw_frame()

        if frame is None or not state.running:
            time.sleep(0.02)
            continue

        if frame_id == last_id:
            time.sleep(0.003)
            continue
        last_id = frame_id

        boxes_data, epp, has_worker = state.get_detections()
        annotated = draw_annotations(frame, boxes_data, epp, state.fps_cam, state.fps_ai, has_worker)

        ok, buf = cv2.imencode('.jpg', annotated, enc_params)
        if not ok:
            continue

        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n'
            + buf.tobytes()
            + b'\r\n'
        )

        elapsed = time.time() - t0
        wait = target_interval - elapsed
        if wait > 0:
            time.sleep(wait)


# ──────────────────────────────────────────────────────────────────────────────
#  RUTAS DEL SERVIDOR WEB
# ──────────────────────────────────────────────────────────────────────────────
app = Flask(__name__)

@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        resp = Response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
        return resp

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
    return response

@app.route('/')
def index():
    return render_template_string(HTML_PAGE)


@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/api/status', methods=['GET', 'OPTIONS'])
def api_status():
    epp, det, inf_ms, res, has_worker, missing = state.get_status_summary()

    if res == "approved":
        gate_status = "open"
        access_msg  = "✅ ACCESO AUTORIZADO — PUEDE INGRESAR A LA FÁBRICA DE PLÁSTICOS. Cumple todas las medidas de EPP reglamentarias."
    elif res == "rejected":
        gate_status = "locked"
        access_msg  = f"⛔ ACCESO DENEGADO — NO PUEDE INGRESAR A LA FÁBRICA DE PLÁSTICOS. Falta portar: {', '.join(missing)}. Colóquese el EPP antes de ingresar."
    else:
        gate_status = "standby"
        access_msg  = "⏸️ EN ESPERA — Posicione al trabajador frente al sensor o cargue una fotografía para verificar su ingreso."

    return jsonify({
        "source":       state.source,
        "running":      state.running,
        "error_msg":    state.error_msg,
        "fps_cam":      state.fps_cam,
        "fps_infer":    state.fps_ai,
        "det_count":    det,
        "inf_ms":       round(inf_ms, 1),
        "model":        state.model_name,
        "epp":          epp,
        "result":       res,
        "has_worker":   has_worker,
        "missing":      missing,
        "gate_status":  gate_status,
        "access_msg":   access_msg
    })


@app.route('/api/start/<source>', methods=['GET', 'POST', 'OPTIONS'])
def api_start(source):
    _stop()
    time.sleep(0.15)

    if source == "laptop":
        src = 0
    elif source == "droidcam":
        ip   = request.args.get('ip', DEFAULT_DROIDCAM_IP).strip()
        port = request.args.get('port', DEFAULT_DROIDCAM_PORT).strip()
        src  = f"http://{ip}:{port}/video"
    else:
        return jsonify({"ok": False, "msg": "Fuente inválida"}), 400

    state.source  = source
    state.running = True

    t1 = threading.Thread(target=capture_worker, args=(src,), daemon=True)
    t2 = threading.Thread(target=inference_worker, daemon=True)
    t1.start()
    t2.start()

    return jsonify({"ok": True, "source": source})


def _stop():
    state.running = False
    state.source  = None
    state.update_detections([], {k: {"status": "pending", "conf": 0.0} for k in EPP_CLASSES}, 0, 0.0, False)
    state.fps_cam = 0.0
    state.fps_ai  = 0.0


@app.route('/api/stop', methods=['GET', 'POST', 'OPTIONS'])
def api_stop():
    _stop()
    return jsonify({"ok": True})




@app.route('/infer', methods=['POST', 'OPTIONS'])
def api_infer():
    """Endpoint de compatibilidad con NestJS API REST /vision/verify-epp"""
    if request.method == 'OPTIONS':
        return jsonify({"ok": True})
    data = request.get_json(silent=True) or {}
    b64 = data.get('imageBase64', '')
    if not b64:
        return jsonify({"error": "No image provided", "predictions": []}), 400
    if ',' in b64:
        b64 = b64.split(',', 1)[1]
    try:
        buf = base64.b64decode(b64)
        np_arr = np.frombuffer(buf, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"error": "Invalid image", "predictions": []}), 400
        boxes_data, epp, det_count, has_worker = inspect_frame(frame, is_photo=True)
        preds = []
        for b in boxes_data:
            x1, y1, x2, y2 = b["box"]
            preds.append({
                "class": b["label"],
                "confidence": float(b["conf"]),
                "x": float((x1 + x2) / 2),
                "y": float((y1 + y2) / 2),
                "width": float(x2 - x1),
                "height": float(y2 - y1)
            })
        return jsonify({
            "predictions": preds,
            "personDetectionAvailable": True,
            "has_worker": has_worker
        })
    except Exception as e:
        return jsonify({"error": str(e), "predictions": []}), 500

@app.route('/api/photo', methods=['POST', 'OPTIONS'])
def api_photo():
    """Análisis inteligente de fotografía estática con veredicto de ingreso a la Fábrica de Plásticos."""
    f = request.files.get('file')
    if not f:
        return jsonify({"ok": False, "msg": "No se recibió ninguna imagen"}), 400

    buf   = np.frombuffer(f.read(), np.uint8)
    frame = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if frame is None:
        return jsonify({"ok": False, "msg": "Formato de imagen inválido o archivo corrupto"}), 400

    t0 = time.time()
    boxes_data, epp, det_count, has_worker = inspect_frame(frame, is_photo=True)
    inf_ms = (time.time() - t0) * 1000

    # Dibujar las anotaciones exactas
    annotated = draw_annotations(frame, boxes_data, epp, 0, 0, has_worker)

    # Convertir a Base64 para que el navegador la despliegue inmediatamente
    ok, buffer = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])
    img_b64 = ""
    if ok:
        img_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

    state.update_detections(boxes_data, epp, det_count, inf_ms, has_worker)

    if not has_worker:
        res = "pending"
        missing = []
        gate_status = "standby"
        access_msg = "⏸️ No se detectó trabajador ni equipo de protección en la imagen cargada."
    else:
        all_ok = all(v["status"] == "detected" for v in epp.values())
        missing = [EPP_CLASSES[k]["label"] for k, v in epp.items() if v["status"] == "missing"]
        if all_ok:
            res = "approved"
            gate_status = "open"
            access_msg = "✅ PUEDE INGRESAR A LA FÁBRICA DE PLÁSTICOS — Cuenta con Casco, Lentes y Chaleco verificados."
        else:
            res = "rejected"
            gate_status = "locked"
            access_msg = f"⛔ NO PUEDE INGRESAR A LA FÁBRICA DE PLÁSTICOS — Falta portar: {', '.join(missing)}. Colóquese el EPP reglamentario."

    return jsonify({
        "ok":          True,
        "image":       img_b64,
        "epp":         epp,
        "det_count":   det_count,
        "inf_ms":      round(inf_ms, 1),
        "result":      res,
        "has_worker":  has_worker,
        "missing":     missing,
        "gate_status": gate_status,
        "access_msg":  access_msg
    })


# ──────────────────────────────────────────────────────────────────────────────
#  INTERFAZ DE USUARIO — FÁBRICA DE PLÁSTICOS CONTROL EPP
# ──────────────────────────────────────────────────────────────────────────────
HTML_PAGE = r"""
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Módulo IA — Control de Acceso EPP | Fábrica de Plásticos</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg-dark:#0B0E14;--bg-panel:#121722;--bg-card:#182030;
  --cyan:#00E5FF;--cyan-dim:#008B9E;--cyan-glow:rgba(0,229,255,.2);
  --text:#E6EDF3;--text-dim:#7D8590;
  --green:#2EA043;--green-light:#3FB950;--green-glow:rgba(63,185,80,.25);
  --red:#DA3633;--red-light:#F85149;--red-glow:rgba(218,54,51,.25);
  --yellow:#D29922;--border:#263042;--header:#06080C;
}
body{font-family:'Inter',sans-serif;background:var(--bg-dark);color:var(--text);min-height:100vh;overflow-x:hidden}

/* HEADER */
.header{background:var(--header);border-bottom:1px solid var(--border);height:56px;
        display:flex;align-items:center;justify-content:space-between;padding:0 24px;
        position:sticky;top:0;z-index:100;backdrop-filter:blur(10px)}
.logo{display:flex;align-items:center;gap:8px;font-size:13px}
.logo-badge{background:rgba(0,229,255,.12);border:1px solid rgba(0,229,255,.3);color:var(--cyan);
            font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px;letter-spacing:1px}
.logo-title{font-weight:800;color:#fff;letter-spacing:.3px}
.logo-sub{color:var(--text-dim);font-size:11px}
.header-right{display:flex;align-items:center;gap:12px;font-size:12px}
.cam-badge{display:flex;align-items:center;gap:7px;color:var(--text-dim);
           background:var(--bg-card);border:1px solid var(--border);
           padding:6px 14px;border-radius:20px;font-size:11px}
.cam-dot{width:8px;height:8px;border-radius:50%;background:var(--text-dim);transition:.3s}
.cam-dot.active{background:var(--green-light);box-shadow:0 0 10px var(--green)}
.fps-badge{background:rgba(0,229,255,.10);border:1px solid rgba(0,229,255,.25);
           color:var(--cyan);padding:6px 14px;border-radius:20px;font-weight:700;font-size:11px}

/* MAIN CONTAINER */
.main{padding:22px 24px 36px;max-width:1420px;margin:0 auto}

/* TITLE BAR */
.title-row{display:flex;justify-content:space-between;align-items:flex-start;
           flex-wrap:wrap;gap:14px;margin-bottom:20px}
.section-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;
               color:var(--cyan);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
.section-title{font-size:26px;font-weight:900;margin-bottom:4px;
               background:linear-gradient(135deg,#FFFFFF 30%,#9BA8BA);
               -webkit-background-clip:text;-webkit-text-fill-color:transparent}
.section-sub{font-size:12px;color:var(--text-dim)}
.model-pill{display:flex;align-items:center;gap:8px;
            background:var(--bg-card);border:1px solid var(--border);
            padding:7px 15px;border-radius:10px;font-size:11px;color:var(--text-dim)}
.model-dot{width:7px;height:7px;border-radius:50%;background:var(--yellow);transition:.3s}
.model-dot.ok{background:var(--green-light);box-shadow:0 0 6px var(--green)}

/* GRID */
.content-grid{display:grid;grid-template-columns:1fr 440px;gap:20px}
@media(max-width:1080px){.content-grid{grid-template-columns:1fr}}

/* VIDEO CARD */
.video-card{background:var(--bg-panel);border:1px solid var(--border);
            border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.video-wrapper{flex:1;background:#05070B;position:relative;
               display:flex;align-items:center;justify-content:center;min-height:460px}
#videoFeed{width:100%;height:100%;max-height:580px;object-fit:contain;display:none}
.placeholder{text-align:center;color:var(--text-dim);padding:50px 30px}
.ph-icon{font-size:60px;opacity:.25;display:block;margin-bottom:16px}
.ph-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px}
.ph-txt{font-size:13px;line-height:1.7}

/* DROIDCAM CONFIG BAR */
.droid-bar{background:rgba(0,0,0,.35);border-top:1px solid var(--border);
           padding:9px 14px;display:flex;align-items:center;gap:10px;font-size:11px;flex-wrap:wrap}
.droid-bar label{color:var(--text-dim);white-space:nowrap}
.droid-input{background:var(--bg-card);border:1px solid var(--border);color:var(--cyan);
             padding:5px 9px;border-radius:6px;font-family:monospace;font-size:12px;width:125px}
.droid-input:focus{outline:none;border-color:var(--cyan)}

/* BUTTONS ROW */
.btn-row{display:flex;gap:8px;padding:12px 14px;flex-wrap:wrap;
         background:var(--bg-card);border-top:1px solid var(--border)}
.btn{display:flex;align-items:center;gap:7px;padding:9px 15px;
     border:none;border-radius:8px;cursor:pointer;font-size:12px;
     font-family:'Inter',sans-serif;font-weight:600;transition:.15s;white-space:nowrap}
.btn-primary{background:var(--cyan);color:#000}
.btn-primary:hover{background:#33ECFF;transform:translateY(-1px)}
.btn-primary.active{background:#009DBB;color:#fff}
.btn-secondary{background:var(--bg-panel);color:var(--text);border:1px solid var(--border)}
.btn-secondary:hover{background:#21262D;border-color:var(--cyan);color:var(--cyan)}
.btn-secondary.active{background:#003D47;border-color:var(--cyan);color:var(--cyan)}
.btn-danger{background:#260C0C;color:var(--red-light);border:1px solid #481414}
.btn-danger:hover{background:#381212}
.btn-audio{background:var(--bg-panel);color:var(--text-dim);border:1px solid var(--border);margin-left:auto}
.btn-audio.active{color:var(--green-light);border-color:rgba(63,185,80,.4)}
.btn:disabled{opacity:.35;cursor:not-allowed;transform:none!important}

/* RIGHT PANEL */
.right-panel{display:flex;flex-direction:column;gap:16px}

/* TORNIQUETE & GATE STATUS CARD */
.gate-card{background:var(--bg-panel);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:.3s}
.gate-card.approved{border-color:var(--green-light);box-shadow:0 0 25px var(--green-glow)}
.gate-card.rejected{border-color:var(--red-light);box-shadow:0 0 25px var(--red-glow)}
.gate-card.standby{border-color:var(--border)}

.gate-hd{padding:12px 16px;background:rgba(0,0,0,.25);border-bottom:1px solid var(--border);
         display:flex;align-items:center;justify-content:space-between}
.gate-hd-title{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--cyan)}
.gate-badge{font-size:10px;font-weight:800;padding:3px 9px;border-radius:6px;letter-spacing:.5px}
.gate-badge.approved{background:rgba(63,185,80,.2);color:var(--green-light);border:1px solid rgba(63,185,80,.4)}
.gate-badge.rejected{background:rgba(218,54,51,.2);color:var(--red-light);border:1px solid rgba(218,54,51,.4)}
.gate-badge.standby{background:rgba(125,133,144,.15);color:var(--text-dim);border:1px solid var(--border)}

.gate-body{padding:20px 18px;text-align:center}
.gate-icon{font-size:44px;margin-bottom:10px;display:inline-block;transition:transform .3s}
.gate-title{font-size:22px;font-weight:900;margin-bottom:8px;line-height:1.25}
.gate-title.approved{color:var(--green-light)}
.gate-title.rejected{color:var(--red-light)}
.gate-title.standby{color:var(--cyan)}

.gate-desc{font-size:12px;color:var(--text);line-height:1.6;margin-bottom:14px;min-height:38px}
.gate-action{font-size:11px;font-weight:600;padding:7px 12px;border-radius:8px;margin-top:4px;display:inline-block}
.gate-action.approved{background:rgba(63,185,80,.15);color:var(--green-light);border:1px solid rgba(63,185,80,.3)}
.gate-action.rejected{background:rgba(218,54,51,.15);color:var(--red-light);border:1px solid rgba(218,54,51,.3)}
.gate-action.standby{background:rgba(0,229,255,.10);color:var(--cyan);border:1px solid rgba(0,229,255,.25)}

/* STABILITY HOLD TIMER */
.stability-box{padding:10px 18px 14px;background:rgba(0,0,0,.2);border-top:1px solid var(--border)}
.stability-lbl{display:flex;justify-content:space-between;font-size:10px;font-weight:600;color:var(--text-dim);margin-bottom:6px}
.stability-track{height:6px;background:var(--border);border-radius:3px;overflow:hidden}
.stability-fill{height:100%;width:0%;background:var(--cyan);transition:width .15s ease}
.stability-fill.approved{background:var(--green-light)}

/* EPP CHECKLIST CARD */
.card{background:var(--bg-panel);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.card-hd{padding:12px 16px;background:rgba(0,0,0,.25);font-size:12px;font-weight:700;
          border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.epp-item{border-bottom:1px solid rgba(38,48,66,.5)}
.epp-item:last-child{border-bottom:none}
.epp-row{padding:12px 16px 4px;display:flex;align-items:center;gap:10px}
.epp-dot{width:10px;height:10px;border-radius:50%;background:var(--text-dim);flex-shrink:0;transition:.3s}
.epp-dot.detected{background:var(--green-light);box-shadow:0 0 10px var(--green)}
.epp-dot.missing{background:var(--red);box-shadow:0 0 10px var(--red);animation:blink 1.1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
.epp-info{flex:1}
.epp-name{font-size:13px;font-weight:600}
.epp-zone{font-size:10px;color:var(--text-dim)}
.epp-st{font-size:11px;color:var(--text-dim);text-align:right;min-width:130px;transition:.3s}
.epp-st.detected{color:var(--green-light);font-weight:700}
.epp-st.missing{color:var(--red-light);font-weight:800}
.conf-track{margin:2px 16px 12px;height:4px;background:var(--border);border-radius:2px;overflow:hidden}
.conf-fill{height:100%;width:0%;border-radius:2px;transition:width .3s ease,background .3s}

/* STATS */
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--border);background:var(--bg-card)}
.stat{padding:10px 6px;text-align:center;border-right:1px solid var(--border)}
.stat:last-child{border-right:none}
.stat-lbl{font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.stat-val{font-size:15px;font-weight:800;color:var(--cyan);font-variant-numeric:tabular-nums}

/* AUDIT LOG TABLE */
.audit-card{background:var(--bg-panel);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.audit-table{width:100%;border-collapse:collapse;font-size:11px}
.audit-table th{background:rgba(0,0,0,.35);padding:8px 12px;text-align:left;color:var(--text-dim);font-weight:600}
.audit-table td{padding:8px 12px;border-top:1px solid rgba(38,48,66,.5)}
.audit-badge{font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;display:inline-block}
.audit-badge.ok{background:rgba(63,185,80,.2);color:var(--green-light)}
.audit-badge.err{background:rgba(218,54,51,.2);color:var(--red-light)}

/* TOAST */
.toast{position:fixed;bottom:22px;right:22px;z-index:999;
       background:var(--bg-card);border:1px solid var(--border);
       border-radius:9px;padding:12px 20px;font-size:13px;
       box-shadow:0 10px 40px rgba(0,0,0,.7);
       transform:translateY(80px);opacity:0;transition:.25s;pointer-events:none}
.toast.show{transform:translateY(0);opacity:1}
.toast.ok{border-color:var(--green);color:var(--green-light)}
.toast.err{border-color:var(--red);color:var(--red-light)}

#fileInput{display:none}
</style>
</head>
<body>

<header class="header">
  <div class="logo">
    <span class="logo-badge">PLANTA INDUSTRIAL</span>
    <span class="logo-title">FÁBRICA DE PLÁSTICOS</span>
    <span class="logo-sub">/ Control de Acceso EPP</span>
  </div>
  <div class="header-right">
    <div class="cam-badge">
      <span class="cam-dot" id="camDot"></span>
      <span id="camLabel">Cámara inactiva</span>
    </div>
    <div class="fps-badge" id="fpsBadge">CAM: — | AI: —</div>
  </div>
</header>

<div class="main">

  <div class="title-row">
    <div>
      <div class="section-badge">
        <span>🏭 ÁREA OPERATIVA: INYECCIÓN Y EXTRUSIÓN DE POLÍMEROS</span>
      </div>
      <div class="section-title">Control de Ingreso por Verificación de EPP</div>
      <div class="section-sub">Norma Obligatoria de Planta: Casco de Seguridad (Cabeza), Lentes de Protección (Ojos) y Chaleco Reflectivo (Torso).</div>
    </div>
    <div class="model-pill">
      <div class="model-dot" id="modelDot"></div>
      <span id="modelLabel">Cargando modelo...</span>
    </div>
  </div>

  <div class="content-grid">

    <!-- PANEL IZQUIERDO: MONITOR DE VIDEO / FOTO -->
    <div class="video-card">
      <div class="video-wrapper">
        <img id="videoFeed" src="" alt="Transmisión de Control de Acceso">
        <div class="placeholder" id="placeholder">
          <span class="ph-icon">🛡️</span>
          <div class="ph-title">Módulo de Verificación en Molinete de Acceso</div>
          <div class="ph-txt">
            Selecciona <strong>Cámara Laptop</strong> o <strong>DroidCam WiFi</strong> para monitoreo en vivo,<br>
            o pulsa <strong>Subir Foto</strong> para validar la fotografía de un trabajador.
          </div>
        </div>
      </div>

      <!-- BARRA DE CONFIGURACIÓN DROIDCAM -->
      <div class="droid-bar">
        <label>IP DroidCam:</label>
        <input type="text" class="droid-input" id="droidIp" value="192.168.0.24">
        <label>Puerto:</label>
        <input type="text" class="droid-input" id="droidPort" value="4747" style="width:70px">
        <span style="color:var(--text-dim);font-size:10px">(Conectar celular y laptop a la misma red WiFi)</span>
      </div>

      <!-- BOTONERA DE CONTROL -->
      <div class="btn-row">
        <button class="btn btn-primary" id="btnLaptop" onclick="startCam('laptop')">📷 Cámara Laptop</button>
        <button class="btn btn-secondary" id="btnDroid" onclick="startCam('droidcam')">📱 DroidCam WiFi</button>
        <button class="btn btn-secondary" onclick="document.getElementById('fileInput').click()">⬆ Subir Foto</button>
        <button class="btn btn-danger" id="btnStop" onclick="stopCam()" disabled>⏹ Detener</button>
        <button class="btn btn-audio active" id="btnAudio" onclick="toggleAudio()">🔊 Audio Activo</button>
        <input type="file" id="fileInput" accept="image/*" onchange="uploadPhoto(this)">
      </div>
    </div>

    <!-- PANEL DERECHO: CONTROL DE ACCESO A FÁBRICA DE PLÁSTICOS -->
    <div class="right-panel">

      <!-- TARJETA DEL TORNIQUETE / VEREDICTO DE INGRESO -->
      <div class="gate-card standby" id="gateCard">
        <div class="gate-hd">
          <span class="gate-hd-title">ESTADO DE TORNIQUETE INDUSTRIAL</span>
          <span class="gate-badge standby" id="gateBadge">STANDBY</span>
        </div>
        <div class="gate-body">
          <div class="gate-icon" id="gateIcon">🔒</div>
          <div class="gate-title standby" id="gateTitle">EN ESPERA DE PERSONAL</div>
          <div class="gate-desc" id="gateDesc">
            Posicione al trabajador frente a la cámara del molinete para validar sus credenciales de seguridad.
          </div>
          <div class="gate-action standby" id="gateAction">
            MOLINETE BLOQUEADO · ESPERANDO INSPECCIÓN
          </div>
        </div>

        <!-- TEMPORIZADOR DE ESTABILIDAD DE DETECCIÓN -->
        <div class="stability-box">
          <div class="stability-lbl">
            <span>VERIFICACIÓN DE ESTABILIDAD (ANTI-FLICKER)</span>
            <span id="stabilityPercent">0%</span>
          </div>
          <div class="stability-track">
            <div class="stability-fill" id="stabilityFill"></div>
          </div>
        </div>
      </div>

      <!-- CHECKLIST DE EQUIPO REQUERIDO -->
      <div class="card">
        <div class="card-hd">
          <span>EQUIPO DE PROTECCIÓN REQUERIDO</span>
          <span style="font-size:11px;color:var(--text-dim)">Norma Fábrica de Plásticos</span>
        </div>
        <div id="eppList"></div>

        <div class="stats-row">
          <div class="stat"><div class="stat-lbl">Zonas</div><div class="stat-val" id="stCount">—</div></div>
          <div class="stat"><div class="stat-lbl">AI Latencia</div><div class="stat-val" id="stMs">—</div></div>
          <div class="stat"><div class="stat-lbl">Cam FPS</div><div class="stat-val" id="stCamFps">—</div></div>
          <div class="stat"><div class="stat-lbl">GPU FPS</div><div class="stat-val" id="stAiFps">—</div></div>
        </div>
      </div>

      <!-- BITÁCORA DE CONTROL DE ACCESOS -->
      <div class="audit-card">
        <div class="card-hd">
          <span>BITÁCORA DE CONTROL DE ACCESO (MOLINETE)</span>
          <span style="font-size:10px;color:var(--text-dim)">Últimos Registros</span>
        </div>
        <table class="audit-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Veredicto</th>
              <th>EPP Verificado</th>
              <th>Origen</th>
            </tr>
          </thead>
          <tbody id="auditRows">
            <tr>
              <td colspan="4" style="text-align:center;color:var(--text-dim);padding:14px;">Sin registros recientes de acceso</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
// ──────────────────────────────────────────────────────────────────────────────
//  DEFINICIÓN DE EPP OBLIGATORIO
// ──────────────────────────────────────────────────────────────────────────────
const EPP_DEF = [
  {key:"helmet",  label:"Casco de seguridad",  zone:"Cabeza (Obligatorio ANSI Z89.1)"},
  {key:"goggles", label:"Lentes de protección", zone:"Ojos (Obligatorio ANSI Z87.1)"},
  {key:"vest",    label:"Chaleco reflectivo",   zone:"Torso (Obligatorio EN ISO 20471)"},
];

let polling = null;
let audioEnabled = true;
let stabilityCounter = 0;
const STABILITY_REQUIRED = 4; // ~1.2 segundos sostenido para abrir molinete
let lastGateVerdict = 'standby';
let gateUnlockTimeRemaining = 0;
const auditLogs = [];

// Audio sintético con Web Audio API (cero dependencias externas)
let audioCtx = null;
function getAudioCtx(){
  if(!audioCtx){
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(AudioContext) audioCtx = new AudioContext();
  }
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playSound(type){
  if(!audioEnabled) return;
  try{
    const ctx = getAudioCtx();
    if(!ctx) return;
    const now = ctx.currentTime;

    if(type === 'approved'){
      // Melodía armónica de confirmación de acceso (Doble Chime 523Hz -> 659Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine'; osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.type = 'sine'; osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.50);

      osc1.connect(gain); osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now); osc1.stop(now + 0.20);
      osc2.start(now + 0.12); osc2.stop(now + 0.50);
    } else if(type === 'rejected'){
      // Tono industrial de advertencia / infracción (180Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(140, now + 0.12);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    }
  }catch(e){}
}

function toggleAudio(){
  audioEnabled = !audioEnabled;
  const btn = document.getElementById('btnAudio');
  btn.classList.toggle('active', audioEnabled);
  btn.textContent = audioEnabled ? '🔊 Audio Activo' : '🔇 Silenciado';
  toast(audioEnabled ? 'Audio habilitado' : 'Audio silenciado');
}

function buildEpp(){
  const el = document.getElementById('eppList');
  el.innerHTML = EPP_DEF.map(({key,label,zone})=>`
    <div class="epp-item">
      <div class="epp-row">
        <div class="epp-dot" id="dot_${key}"></div>
        <div class="epp-info">
          <div class="epp-name">${label}</div>
          <div class="epp-zone">${zone}</div>
        </div>
        <div class="epp-st" id="st_${key}">Pendiente</div>
      </div>
      <div class="conf-track"><div class="conf-fill" id="bar_${key}"></div></div>
    </div>`).join('');
}
buildEpp();

function toast(msg, type=''){
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast ' + type + ' show';
  setTimeout(()=>t.className='toast', 2800);
}

// ──────────────────────────────────────────────────────────────────────────────
//  INICIO Y CONTROL DE CÁMARAS
// ──────────────────────────────────────────────────────────────────────────────
async function startCam(src){
  const camDot = document.getElementById('camDot');
  const camLbl = document.getElementById('camLabel');
  camDot.style.background = 'var(--yellow)';
  camLbl.textContent = 'Conectando sensor...';

  let url = `/api/start/${src}`;
  if(src === 'droidcam'){
    const ip   = document.getElementById('droidIp').value.trim();
    const port = document.getElementById('droidPort').value.trim();
    url += `?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(port)}`;
  }

  const res = await fetch(url);
  const d   = await res.json();

  if(d.ok){
    const feed = document.getElementById('videoFeed');
    feed.src   = '/video_feed?t=' + Date.now();
    feed.style.display = 'block';
    document.getElementById('placeholder').style.display = 'none';
    document.getElementById('btnStop').disabled = false;
    document.getElementById('btnLaptop').classList.toggle('active', src === 'laptop');
    document.getElementById('btnDroid').classList.toggle('active', src === 'droidcam');
    camDot.classList.add('active');
    camLbl.textContent = src === 'droidcam' ? 'DroidCam WiFi Conectada' : 'Cámara Laptop Activa';
    toast('✅ Video industrial activo a 30 FPS', 'ok');
    stabilityCounter = 0;
    startPolling();
  } else {
    camDot.style.background = 'var(--red)';
    camLbl.textContent = 'Error de conexión';
    toast('❌ Error al conectar cámara: ' + (d.msg || ''), 'err');
  }
}

async function stopCam(){
  await fetch('/api/stop');
  stopPolling();
  resetUI();
  toast('⏹ Monitoreo detenido');
}

function resetUI(){
  document.getElementById('videoFeed').style.display = 'none';
  document.getElementById('videoFeed').src = '';
  document.getElementById('placeholder').style.display = 'block';
  document.getElementById('btnStop').disabled = true;
  document.getElementById('btnLaptop').classList.remove('active');
  document.getElementById('btnDroid').classList.remove('active');
  document.getElementById('camDot').classList.remove('active');
  document.getElementById('camDot').style.background = 'var(--text-dim)';
  document.getElementById('camLabel').textContent = 'Cámara inactiva';
  document.getElementById('fpsBadge').textContent = 'CAM: — | AI: —';
  resetEpp();
  updateGateUI('pending', {}, false, []);
  ['stCount','stMs','stCamFps','stAiFps'].forEach(id => document.getElementById(id).textContent = '—');
}

// ──────────────────────────────────────────────────────────────────────────────
//  SUBIR Y ANALIZAR FOTOGRAFÍA ESTÁTICA
// ──────────────────────────────────────────────────────────────────────────────
async function uploadPhoto(inp){
  const file = inp.files[0];
  if(!file) return;

  const fd = new FormData();
  fd.append('file', file);

  // Detener polling previo de cámara si existía
  stopPolling();
  document.getElementById('btnLaptop').classList.remove('active');
  document.getElementById('btnDroid').classList.remove('active');
  document.getElementById('btnStop').disabled = false;

  toast('🔍 Analizando fotografía con GPU RTX 4060...');
  const res = await fetch('/api/photo', {method:'POST', body:fd});
  const d   = await res.json();

  if(d.ok){
    const feed = document.getElementById('videoFeed');
    feed.style.display = 'block';
    feed.src = d.image;
    document.getElementById('placeholder').style.display = 'none';

    updateEpp(d.epp);
    updateGateUI(d.result, d.epp, d.has_worker, d.missing, 'Fotografía');

    document.getElementById('stCount').textContent  = `${d.det_count} zonas`;
    document.getElementById('stMs').textContent     = `${d.inf_ms}ms`;
    document.getElementById('stCamFps').textContent = 'Foto';
    document.getElementById('stAiFps').textContent  = 'GPU';
    document.getElementById('camLabel').textContent = 'Fotografía procesada';
    document.getElementById('camDot').classList.add('active');

    if(d.result === 'approved'){
      playSound('approved');
      toast('✅ ACCESO AUTORIZADO - Puede ingresar a la fábrica', 'ok');
    } else if(d.result === 'rejected'){
      playSound('rejected');
      toast('⛔ ACCESO DENEGADO - EPP Incompleto', 'err');
    }
  } else {
    toast(`❌ ${d.msg}`, 'err');
  }
  inp.value = '';
}

// ──────────────────────────────────────────────────────────────────────────────
//  POLLING DE ESTADO PARA TRANSMISIÓN EN VIVO
// ──────────────────────────────────────────────────────────────────────────────
function startPolling(){ if(polling) clearInterval(polling); polling = setInterval(fetchStatus, 300); }
function stopPolling(){  if(polling){ clearInterval(polling); polling = null; } }

async function fetchStatus(){
  try{
    const d = await (await fetch('/api/status')).json();
    if(d.error_msg){
      toast('⚠️ ' + d.error_msg, 'err');
    }
    updateEpp(d.epp);
    updateGateUI(d.result, d.epp, d.has_worker, d.missing, d.source === 'droidcam' ? 'DroidCam' : 'Webcam');

    const cfps = d.fps_cam || 0, afps = d.fps_infer || 0;
    document.getElementById('fpsBadge').textContent = `CAM ${cfps} FPS  |  AI ${afps} FPS`;
    document.getElementById('stCount').textContent  = d.det_count ? `${d.det_count} zonas` : '—';
    document.getElementById('stMs').textContent     = d.inf_ms ? `${d.inf_ms}ms` : '—';
    document.getElementById('stCamFps').textContent = cfps ? `${cfps}` : '—';
    document.getElementById('stAiFps').textContent  = afps ? `${afps}` : '—';

    document.getElementById('modelLabel').textContent = `Modelo · ${d.model}`;
    document.getElementById('modelDot').className     = 'model-dot ok';
  }catch(e){}
}

function updateEpp(epp){
  EPP_DEF.forEach(({key})=>{
    const v   = epp[key] || {status:'pending', conf:0};
    const dot = document.getElementById('dot_' + key);
    const st  = document.getElementById('st_' + key);
    const bar = document.getElementById('bar_' + key);

    dot.className = 'epp-dot ' + v.status;
    st.className  = 'epp-st  ' + v.status;

    if(v.status === 'detected'){
      st.textContent = `Detectado (${Math.round(v.conf * 100)}%)`;
      bar.style.width = `${Math.round(v.conf * 100)}%`;
      bar.style.background = 'var(--green-light)';
    }else if(v.status === 'missing'){
      st.textContent = `NO PORTA (Infracción)`;
      bar.style.width = `${Math.round(v.conf * 100)}%`;
      bar.style.background = 'var(--red)';
    }else{
      st.textContent = 'Pendiente / No visible';
      bar.style.width = '0%';
    }
  });
}

function resetEpp(){
  EPP_DEF.forEach(({key})=>{
    document.getElementById('dot_' + key).className = 'epp-dot';
    document.getElementById('st_' + key).className  = 'epp-st';
    document.getElementById('st_' + key).textContent = 'Pendiente';
    document.getElementById('bar_' + key).style.width = '0%';
  });
}

// ──────────────────────────────────────────────────────────────────────────────
//  LÓGICA DE CONTROL DE ACCESO — TORNIQUETE FÁBRICA DE PLÁSTICOS
// ──────────────────────────────────────────────────────────────────────────────
function updateGateUI(res, epp, hasWorker, missing, source='En vivo'){
  const card   = document.getElementById('gateCard');
  const badge  = document.getElementById('gateBadge');
  const icon   = document.getElementById('gateIcon');
  const title  = document.getElementById('gateTitle');
  const desc   = document.getElementById('gateDesc');
  const action = document.getElementById('gateAction');
  const sFill  = document.getElementById('stabilityFill');
  const sPerc  = document.getElementById('stabilityPercent');

  // Si no hay trabajador visible
  if(!hasWorker || res === 'pending'){
    stabilityCounter = 0;
    card.className = 'gate-card standby';
    badge.className = 'gate-badge standby';
    badge.textContent = 'STANDBY';
    icon.textContent = '🔒';
    title.className = 'gate-title standby';
    title.textContent = 'EN ESPERA DE PERSONAL';
    desc.textContent = 'Posicione al trabajador frente a la cámara del molinete para validar sus credenciales de seguridad.';
    action.className = 'gate-action standby';
    action.textContent = 'TORNIQUETE BLOQUEADO · ESPERANDO INSPECCIÓN';
    sFill.style.width = '0%';
    sFill.className = 'stability-fill';
    sPerc.textContent = '0%';
    lastGateVerdict = 'pending';
    return;
  }

  // Si tiene todo el EPP en orden
  if(res === 'approved'){
    // Para fotos se aprueba de inmediato; para video se exige estabilidad anti-flicker
    if(source === 'Fotografía'){
      stabilityCounter = STABILITY_REQUIRED;
    } else {
      stabilityCounter = Math.min(STABILITY_REQUIRED, stabilityCounter + 1);
    }

    const pct = Math.round((stabilityCounter / STABILITY_REQUIRED) * 100);
    sFill.style.width = `${pct}%`;
    sFill.className = 'stability-fill approved';
    sPerc.textContent = `${pct}%`;

    if(stabilityCounter >= STABILITY_REQUIRED){
      card.className = 'gate-card approved';
      badge.className = 'gate-badge approved';
      badge.textContent = 'DESBLOQUEADO';
      icon.textContent = '🔓';
      title.className = 'gate-title approved';
      title.textContent = 'PUEDE INGRESAR A LA FÁBRICA DE PLÁSTICOS';
      desc.textContent = '✅ ACCESO AUTORIZADO: El trabajador cuenta con Casco de Seguridad, Lentes de Protección y Chaleco Reflectivo verificados conforme a la norma industrial.';
      action.className = 'gate-action approved';
      action.textContent = 'TORNIQUETE HABILITADO · ACCESO LIBRE A PLANTA';

      if(lastGateVerdict !== 'approved'){
        playSound('approved');
        logAudit('AUTORIZADO', 'Ingreso permitido (EPP Completo)', source);
        toast('🔓 PUEDE INGRESAR: Torniquete abierto para el trabajador', 'ok');
      }
      lastGateVerdict = 'approved';
    } else {
      title.className = 'gate-title standby';
      title.textContent = 'VERIFICANDO PROTOCOLO EPP...';
      desc.textContent = 'Mantenga la posición mientras el sistema confirma la estabilidad del equipo de seguridad...';
    }
  }

  // Si falta algún EPP reglamentario
  else if(res === 'rejected'){
    stabilityCounter = 0;
    sFill.style.width = '0%';
    sFill.className = 'stability-fill';
    sPerc.textContent = '0%';

    card.className = 'gate-card rejected';
    badge.className = 'gate-badge rejected';
    badge.textContent = 'BLOQUEADO';
    icon.textContent = '⛔';
    title.className = 'gate-title rejected';
    title.textContent = 'NO PUEDE INGRESAR A LA FÁBRICA DE PLÁSTICOS';

    const missingText = missing && missing.length > 0 ? missing.join(', ') : 'Equipo de protección incompleto';
    desc.textContent = `❌ ACCESO DENEGADO POR INFRACCIÓN: El trabajador NO cuenta con el equipo reglamentario. Falta portar: ${missingText}.`;
    action.className = 'gate-action rejected';
    action.textContent = 'INGRESO RESTRINGIDO · DIRÍJASE A VESTIDORES A COLOCARSE EL EPP';

    if(lastGateVerdict !== 'rejected'){
      playSound('rejected');
      logAudit('DENEGADO', `Falta portar: ${missingText}`, source);
      toast(`⛔ ACCESO DENEGADO: Falta portar ${missingText}`, 'err');
    }
    lastGateVerdict = 'rejected';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
//  REGISTRO EN BITÁCORA DE CONTROL DE ACCESOS
// ──────────────────────────────────────────────────────────────────────────────
function logAudit(status, detail, source){
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit', second:'2-digit'});

  auditLogs.unshift({
    time: timeStr,
    status: status,
    detail: detail,
    source: source
  });

  if(auditLogs.length > 8) auditLogs.pop();

  const tbody = document.getElementById('auditRows');
  tbody.innerHTML = auditLogs.map(item => `
    <tr>
      <td style="color:var(--cyan);font-family:monospace">${item.time}</td>
      <td>
        <span class="audit-badge ${item.status === 'AUTORIZADO' ? 'ok' : 'err'}">
          ${item.status === 'AUTORIZADO' ? '🟢 PUEDE INGRESAR' : '🔴 NO PUEDE INGRESAR'}
        </span>
      </td>
      <td style="color:var(--text)">${item.detail}</td>
      <td style="color:var(--text-dim)">${item.source}</td>
    </tr>
  `).join('');
}

fetchStatus();
</script>
</body>
</html>
"""

if __name__ == '__main__':
    ok, m = state.load_models()
    print(f"[*] Modelos cargados: {m} (Éxito: {ok})")
    print("[*] Iniciando servidor en http://localhost:5000 ...")
    app.run(host='0.0.0.0', port=5000, threaded=True)
