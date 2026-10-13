import io
import os
import base64
import time
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import numpy as np

# Try importing ultralytics YOLO
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False
    YOLO = None

app = FastAPI(
    title="PlastControl SafeAccess AI - YOLOv8 PPE Microservice",
    description="Microservicio de Visión por Computadora para Detección de Cascos, Chalecos y EPP Industrial con Ultralytics YOLOv8.",
    version="1.0.0"
)

# Enable CORS for local frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global YOLO model instance
model = None
MODEL_NAME = "yolov8n.pt"
PPE_MODEL_PATH = os.path.join(os.path.dirname(__file__), "yolov8n-ppe.pt")


def get_yolo_model():
    global model
    if model is None and ULTRALYTICS_AVAILABLE:
        try:
            # Critical safety rule: never use the generic COCO model as a PPE detector.
            if os.path.exists(PPE_MODEL_PATH):
                print(f"[YOLO-EPP] Cargando pesos especializados: {PPE_MODEL_PATH}")
                model = YOLO(PPE_MODEL_PATH)
            else:
                print(f"[YOLO-EPP] No hay pesos PPE entrenados en el servidor; desactivando detección genérica de chaleco/gafas.")
                model = None
        except Exception as e:
            print(f"[YOLO-EPP] Error inicializando modelo YOLO: {e}")
            model = None
    return model

@app.on_event("startup")
async def startup_event():
    print("[PlastControl AI] Iniciando Microservicio YOLOv8...")
    get_yolo_model()
    print("[PlastControl AI] Servicio listo en http://localhost:8000")

class DetectionBox(BaseModel):
    id: str
    label: str
    category: str  # 'HELMET' | 'VEST' | 'GLASSES' | 'NO_HELMET' | 'NO_VEST' | 'PERSON'
    confidence: int
    color: str
    xPercent: float
    yPercent: float
    wPercent: float
    hPercent: float

class EppDetectionResponse(BaseModel):
    status: str
    compliant: bool
    hasHelmet: bool
    helmetConfidence: int
    hasVest: bool
    vestConfidence: int
    hasGlasses: bool
    glassesConfidence: int
    overallScore: int
    boxes: List[DetectionBox]
    rejectionReasons: List[str]
    inferenceTimeMs: float

class Base64DetectRequest(BaseModel):
    image: str  # Data URL or base64 string


def analyze_epp_tensor(pil_img: Image.Image) -> EppDetectionResponse:
    start_time = time.time()
    w, h = pil_img.size
    np_img = np.array(pil_img.convert("RGB"))

    boxes_out: List[DetectionBox] = []
    has_helmet = False
    helmet_conf = 12
    has_vest = False
    vest_conf = 10
    has_glasses = False
    glasses_conf = 15
    rejection_reasons = []

    yolo = get_yolo_model()
    if yolo is not None:
        try:
            # Run Ultralytics inference
            results = yolo(np_img, conf=0.20, verbose=False)
            
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0].item())
                    cls_name = yolo.names.get(cls_id, f"class_{cls_id}").lower()
                    conf = int(box.conf[0].item() * 100)
                    xyxy = box.xyxy[0].tolist()
                    
                    x1, y1, x2, y2 = xyxy
                    bx = max(0.0, min(100.0, (x1 / w) * 100))
                    by = max(0.0, min(100.0, (y1 / h) * 100))
                    bw = max(0.0, min(100.0, ((x2 - x1) / w) * 100))
                    bh = max(0.0, min(100.0, ((y2 - y1) / h) * 100))

                    # Negative dataset labels must never satisfy a PPE requirement.
                    normalized_cls_name = cls_name.replace("_", " ").replace("-", " ").strip()
                    if normalized_cls_name.startswith("no "):
                        if "helmet" in normalized_cls_name or "hardhat" in normalized_cls_name:
                            boxes_out.append(DetectionBox(
                                id=f"box-no-helmet-{len(boxes_out)}",
                                label=f"YOLO: SIN_CASCO ({cls_name.upper()})",
                                category="NO_HELMET",
                                confidence=conf,
                                color="#f43f5e",
                                xPercent=round(bx, 1),
                                yPercent=round(by, 1),
                                wPercent=round(bw, 1),
                                hPercent=round(bh, 1)
                            ))
                        elif "vest" in normalized_cls_name:
                            boxes_out.append(DetectionBox(
                                id=f"box-no-vest-{len(boxes_out)}",
                                label=f"YOLO: SIN_CHALECO ({cls_name.upper()})",
                                category="NO_VEST",
                                confidence=conf,
                                color="#f43f5e",
                                xPercent=round(bx, 1),
                                yPercent=round(by, 1),
                                wPercent=round(bw, 1),
                                hPercent=round(bh, 1)
                            ))
                        elif "glass" in normalized_cls_name or "goggle" in normalized_cls_name:
                            boxes_out.append(DetectionBox(
                                id=f"box-no-glasses-{len(boxes_out)}",
                                label=f"YOLO: SIN_GAFAS ({cls_name.upper()})",
                                category="NO_GLASSES",
                                confidence=conf,
                                color="#f43f5e",
                                xPercent=round(bx, 1),
                                yPercent=round(by, 1),
                                wPercent=round(bw, 1),
                                hPercent=round(bh, 1)
                            ))
                        continue


                    # Evaluate positive PPE classes from the custom dataset.
                    if "helmet" in normalized_cls_name or "hardhat" in normalized_cls_name:
                        has_helmet = True
                        helmet_conf = max(helmet_conf, conf)
                        boxes_out.append(DetectionBox(
                            id=f"box-helmet-{len(boxes_out)}",
                            label=f"YOLO: CASCO_SEGURIDAD ({cls_name.upper()})",
                            category="HELMET",
                            confidence=conf,
                            color="#10b981",
                            xPercent=round(bx, 1),
                            yPercent=round(by, 1),
                            wPercent=round(bw, 1),
                            hPercent=round(bh, 1)
                        ))
                    elif "vest" in normalized_cls_name:
                        has_vest = True
                        vest_conf = max(vest_conf, conf)
                        boxes_out.append(DetectionBox(
                            id=f"box-vest-{len(boxes_out)}",
                            label=f"YOLO: CHALECO_REFLECTIVO ({cls_name.upper()})",
                            category="VEST",
                            confidence=conf,
                            color="#10b981",
                            xPercent=round(bx, 1),
                            yPercent=round(by, 1),
                            wPercent=round(bw, 1),
                            hPercent=round(bh, 1)
                        ))
                    elif "glass" in normalized_cls_name or "goggle" in normalized_cls_name:
                        has_glasses = True
                        glasses_conf = max(glasses_conf, conf)
                        boxes_out.append(DetectionBox(
                            id=f"box-glasses-{len(boxes_out)}",
                            label="YOLO: GAFAS_POLICARBONATO",
                            category="GLASSES",
                            confidence=conf,
                            color="#06b6d4",
                            xPercent=round(bx, 1),
                            yPercent=round(by, 1),
                            wPercent=round(bw, 1),
                            hPercent=round(bh, 1)
                        ))
        except Exception as err:
            print(f"[YOLO Inference Warning]: {err}")

    # Evaluate compliance
    if not has_helmet:
        rejection_reasons.append("Falta Casco de Seguridad Industrial (Área craneal sin polímero de protección homologado).")
    if not has_vest:
        rejection_reasons.append("Falta Chaleco Reflectivo Clase 2 (Prenda actual no cumple norma de alta visibilidad fluorescente).")

    if not has_glasses:
        rejection_reasons.append("Faltan Gafas / Lentes de Seguridad de Policarbonato (Norma ANSI Z87.1).")

    if yolo is None:
        rejection_reasons.append("Modelo PPE no disponible; las detecciones positivas están desactivadas.")

    is_compliant = has_helmet and has_vest and has_glasses
    overall_score = int((helmet_conf + vest_conf + glasses_conf) / 3)
    inference_ms = round((time.time() - start_time) * 1000, 1)

    return EppDetectionResponse(
        status="success",
        compliant=is_compliant,
        hasHelmet=has_helmet,
        helmetConfidence=helmet_conf,
        hasVest=has_vest,
        vestConfidence=vest_conf,
        hasGlasses=has_glasses,
        glassesConfidence=glasses_conf,
        overallScore=overall_score,
        boxes=boxes_out,
        rejectionReasons=rejection_reasons,
        inferenceTimeMs=inference_ms
    )

@app.get("/health")
def health_check():
    yolo_model = get_yolo_model()
    return {
        "status": "ok",
        "service": "PlastControl SafeAccess YOLOv8 Microservice",
        "engine": "Ultralytics YOLOv8",
        "modelLoaded": yolo_model is not None,
        "ultralyticsInstalled": ULTRALYTICS_AVAILABLE
    }

@app.post("/detect", response_model=EppDetectionResponse)
async def detect_from_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents))
        return analyze_epp_tensor(pil_img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error procesando imagen: {str(e)}")

@app.post("/detect/base64", response_model=EppDetectionResponse)
async def detect_from_base64(req: Base64DetectRequest):
    try:
        raw_b64 = req.image
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        decoded = base64.b64decode(raw_b64)
        pil_img = Image.open(io.BytesIO(decoded))
        return analyze_epp_tensor(pil_img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error decodificando base64: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
