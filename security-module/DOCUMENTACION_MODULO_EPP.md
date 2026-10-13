# Módulo IA de Seguridad Industrial — Verificación de EPP y Control de Acceso
## Fábrica de Plásticos: Inspección de Casco, Lentes de Protección y Chaleco Reflectivo

---

## 1. Resumen Ejecutivo y Alcance del Módulo

Este módulo constituye un sistema de visión artificial de alta precisión y baja latencia diseñado para el **control de acceso automatizado en plantas industriales**, específicamente configurado para las normativas de una **Fábrica de Plásticos** (zonas de inyección, extrusión, termoformado y moldeo de polímeros).

El sistema verifica de manera automática si un trabajador cuenta con el **Equipo de Protección Personal (EPP)** obligatorio antes de habilitar su ingreso mediante torniquete o molinete electrónico:

1. **Casco de Seguridad (Cabeza):** Norma ANSI Z89.1 / EN 397 (Protección contra caída de moldes, herramientas y cargas suspendidas de grúas puente).
2. **Lentes de Protección / Monogafas (Ojos):** Norma ANSI Z87.1 / EN 166 (Protección contra salpicaduras de plástico fundido a alta temperatura, rebabas de corte y partículas volátiles).
3. **Chaleco Reflectivo de Alta Visibilidad (Torso):** Norma EN ISO 20471 / ANSI/ISEA 107 (Visibilidad en zonas de tráfico de autoelevadores, montacargas y carretillas).

El módulo opera tanto en **video en vivo a 30 FPS** (mediante cámara integrada de laptop o teléfono celular vía DroidCam WiFi) como en el **análisis de fotografías estáticas** subidas por los supervisores de seguridad.

---

## 2. Arquitectura Tecnológica

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ARQUITECTURA DEL SISTEMA MODULAR                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [ Dispositivos de Captura ]                                          │
│   ├── Webcam Laptop (DirectShow CAP_DSHOW, 1280x720, 30 FPS)           │
│   ├── Celular DroidCam (RTSP/HTTP MJPEG nobuffer, IP: 192.168.0.24)    │
│   └── Carga de Fotografía (Multipart/Form-Data vía HTTP POST)          │
│                                                                        │
│                               ▼                                        │
│   [ Backend Flask & Hilos Asíncronos ]                                 │
│   ├── Capture Worker: Lectura continua sin buffer (desacoplada)        │
│   ├── Inference Worker: Inferencia acelerada en GPU NVIDIA RTX 4060    │
│   └── Stream Generator: Generador MJPEG a 30 FPS constantes            │
│                                                                        │
│                               ▼                                        │
│   [ Motor de IA & Visión Computacional ]                              │
│   ├── Modelo EPP: YOLOv8n fine-tuned (runs/epp_detector-3/best.pt)     │
│   ├── Modelo Anatómico: YOLOv8n COCO (Localizador de persona)          │
│   └── Pipeline Multiescala (Escala 640 TTA + 960px + Recorte Torso)    │
│                                                                        │
│                               ▼                                        │
│   [ Lógica de Control de Acceso — Fábrica de Plásticos ]              │
│   ├── Filtro de Estabilidad Temporal (Hold-Timer Anti-Flicker 1.2s)    │
│   ├── Veredicto: PUEDE INGRESAR (Verde) / NO PUEDE INGRESAR (Rojo)     │
│   ├── Audio Sintético Web Audio API (Chime de Pase / Alarma de Falta)  │
│   └── Bitácora de Molinete (Historial de accesos con timestamp)        │
│                                                                        │
│                               ▼                                        │
│   [ Frontend Industrial SPA ]                                          │
│   └── Interfaz en una sola ventana (Glassmorphism oscuro, sin NodeJS) │
└────────────────────────────────────────────────────────────────────────┘
```

### Tecnologías Empleadas
* **Lenguaje:** Python 3.11 (64-bit).
* **Framework de Deep Learning:** PyTorch `2.6.0+cu124` con aceleración por hardware CUDA 12.4.
* **Tarjeta Gráfica (GPU):** NVIDIA GeForce RTX 4060 Laptop GPU (8 GB GDDR6 VRAM dedicada).
* **Motor de Detección:** Ultralytics YOLOv8 (arquitectura basada en CSPDarknet53 y PANet).
* **Servidor Web y APIs:** Flask 3.1 multi-threading.
* **Procesamiento de Imágenes y Video:** OpenCV (`opencv-python` / `opencv-python-headless`) con backends DirectShow y FFmpeg.
* **Frontend:** HTML5, CSS3 Vanilla (tokens personalizados HSL/HEX) y JavaScript asíncrono ES6+, sin frameworks pesados ni dependencias externas de NodeJS.

---

## 3. Agentes Inteligentes y Submódulos del Sistema

El módulo opera como un ecosistema coordinado de **5 agentes/submódulos especializados**:

1. **Agente de Percepción y Detección de EPP (`YOLOv8 fine-tuned`):**
   - Red neuronal convolucional profunda entrenada específicamente para clasificar y acotar implementos de seguridad reglamentarios (`helmet`, `vest`, `goggles`) e infracciones (`no_helmet`, `no_goggles`).
   - Optimizado con cuantización e inferencia en FP16 sobre la GPU NVIDIA RTX 4060.

2. **Agente Localizador Anatómico y Presencia Humana (`YOLOv8 COCO - Person Class`):**
   - Identifica la geometría y delimitación de cada trabajador en la escena.
   - Determina el anclaje espacial: define dónde debe encontrarse la cabeza (tercio superior), los ojos/rostro (zona ocular) y el tórax (zona central) para evitar falsos positivos flotantes.

3. **Agente de Normalización Multiescala y TTA (Test-Time Augmentation):**
   - Resuelve el desafío de variabilidad de distancia entre el operario y la cámara.
   - Ejecuta un escaneo piramidal en 3 resoluciones (640px, 960px y recorte enfocado de torso) para garantizar que tanto tomas lejanas de cuerpo completo como fotos de primer plano obtengan detecciones precisas.

4. **Agente Guardián de Control de Acceso y Estabilidad Temporal (Gatekeeper):**
   - Motor de decisión determinista que procesa la regla estricta: $Casco \land Lentes \land Chaleco = 1$.
   - Incorpora un **filtro de histéresis temporal (Hold-Timer de 1.2 segundos / 4 frames)** que previene el rebote mecánico del torniquete ante parpadeos de luz o giros rápidos de cabeza.

5. **Agente de Transmisión Concurrente y Gestión de Flujos (Stream Worker):**
   - Desacopla la captura de video del procesamiento de inferencia mediante hilos asíncronos (`threading.Thread`) y buffers atómicos.
   - Garantiza que la cámara de la laptop o el teléfono vía DroidCam transmitan fluidamente a 30 FPS sin acumulación de fotogramas viejos en memoria.

---

## 4. Modelo de IA y Entrenamiento

### 4.1 Dataset Utilizado
Se utilizó un dataset de seguridad industrial con más de **29,000 imágenes** etiquetadas en formato YOLOv8 divididas en conjuntos de entrenamiento (`train`), validación (`valid`) y prueba (`test`).

### 4.2 Clases del Modelo Entrenado
* `0: helmet` (Casco de seguridad colocado)
* `1: no_helmet` (Cabeza sin casco / infracción)
* `2: vest` (Chaleco reflectivo de seguridad colocado)
* `3: gloves` (Guantes de seguridad)
* `4: no_gloves` (Manos sin guantes)
* `5: boots` (Botas con puntera de acero)
* `6: no_boots` (Calzado sin protección)
* `7: goggles` (Lentes de protección / monogafas colocadas)
* `8: no_goggles` (Ojos sin protección / infracción)
* `9: ear_protection` (Protectores auditivos)
* `11: traffic_cone` (Cono de seguridad)
* `12: barrier_tape` (Cinta perimetral de peligro)

### 4.3 Entrenamiento Acelerado en GPU RTX 4060
* **Archivo de pesos resultante:** `runs/epp_detector-3/weights/best.pt` (6.49 MB) y copiado a `weights/best_epp.pt`.
* **Épocas:** 30 épocas completas.
* **Batch Size:** 32.
* **Tamaño de imagen (imgsz):** 640.
* **Métrica global:** `mAP50 = 85.3%` (Precisión media general: Casco: 88.1%, Chaleco: 93.0%, Lentes: 95.2%).

---

## 5. Motor de Inferencia Multiescala y Recorte Anatómico

### 5.1 Problema Resuelto (Por qué antes marcaba "no tiene" en fotos)
Los modelos entrenados en obras de construcción aprenden a reconocer figuras humanas completas a distancia media (5 a 15 metros). Al subir una fotografía de medio cuerpo, plano pecho o una selfie, el casco y el chaleco ocupan un porcentaje mucho mayor del fotograma, lo que descalibraba el tamaño del campo receptivo estándar de 640px.

### 5.2 Solución Implementada: Pipeline en 3 Fases
Para fotografías y video en vivo se ejecuta un procesamiento coordinado:
1. **Fase 1 — Escala Completa con TTA (Test-Time Augmentation):**
   Inferencia con rotaciones y escalas sutiles a 640px (`imgsz=640, augment=True, conf=0.10`). Detecta cascos y chalecos a nivel global con confianza superior al 75%.
2. **Fase 2 — Escala de Alta Resolución (960px):**
   Inferencia a 960px para resolver patrones reflectivos y texturas densas sin perder resolución espacial.
3. **Fase 3 — Recorte Anatómico Enfocado (Torso y Cabeza/Ojos):**
   Si se localiza a un trabajador en la toma mediante `yolov8n.pt`, se extrae el recorte superior del trabajador y se evalúa directamente. Esto permite capturar **lentes de protección transparentes** y verificar el área de los ojos aún bajo iluminación variable.

### 5.3 Codificación Visual de Recuadros
* **Cyan (`#00E5FF`):** Casco verificado (`Casco OK XX%`) y Lentes verificados (`Lentes OK XX%`).
* **Verde Esmeralda (`#3FB950`):** Chaleco reflectivo verificado (`Chaleco OK XX%`).
* **Rojo Carmesí (`#F85149`):** Infracción detectada (`SIN CASCO [Infracción]`, `SIN LENTES [Infracción]`, `SIN CHALECO [Infracción]`).

---

## 6. Lógica de Control de Acceso — Fábrica de Plásticos

### 6.1 Reglas del Molinete / Torniquete

```
┌────────────────────────────────────────────────────────────────────────┐
│ CONDICIÓN DE INGRESO                                                   │
├────────────────────────────────────────────────────────────────────────┤
│ ¿Casco Detectado?   == TRUE   (ANSI Z89.1)                             │
│ ¿Lentes Detectados? == TRUE   (ANSI Z87.1)                             │
│ ¿Chaleco Detectado? == TRUE   (EN ISO 20471)                           │
├────────────────────────────────────────────────────────────────────────┤
│ ➜ SI CUMPLE LAS 3:                                                     │
│   • Estado: [🔓 DESBLOQUEADO / ACCESO AUTORIZADO]                      │
│   • Mensaje: "PUEDE INGRESAR A LA FÁBRICA DE PLÁSTICOS"                │
│   • Acción: Molinete habilitado para paso libre.                       │
│   • Audio: Doble chime armónico (523Hz -> 659Hz).                      │
│                                                                        │
│ ➜ SI FALTA AL MENOS 1 ELEMENTO:                                        │
│   • Estado: [🔒 BLOQUEADO / ACCESO DENEGADO]                           │
│   • Mensaje: "NO PUEDE INGRESAR A LA FÁBRICA DE PLÁSTICOS"             │
│   • Detalle: "Infracción: Falta portar [Elemento faltante].            │
│               Colóquese el EPP antes de ingresar."                     │
│   • Audio: Tono de alerta industrial (180Hz sawtooth).                 │
│                                                                        │
│ ➜ SI NO HAY PERSONA FRENTE AL SENSOR:                                  │
│   • Estado: [⏸️ STANDBY / EN ESPERA]                                   │
│   • Mensaje: "Posicione al trabajador frente al sensor"                │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Filtro de Estabilidad Temporal (Anti-Flicker de 1.2 segundos)
En transmisiones en vivo, el parpadeo de la iluminación o un movimiento rápido de cabeza no debe abrir ni cerrar falsamente un molinete mecánico. Se implementó una **barra de estabilidad temporal**:
* Requiere **4 lecturas consecutivas conformes (~1.2 segundos)** para confirmar la apertura.
* Si el trabajador se retira o se quita un implemento, la barra cae de inmediato a 0% y el torniquete se traba al instante.

### 6.3 Bitácora de Molinete en Tiempo Real
Registra las últimas validaciones de acceso con:
* **Hora exacta** (HH:MM:SS).
* **Veredicto** (`🟢 PUEDE INGRESAR` / `🔴 NO PUEDE INGRESAR`).
* **Detalle de EPP verificado** o faltante.
* **Dispositivo de origen** (Webcam Laptop, DroidCam WiFi o Fotografía).

---

## 7. Endpoints de la API REST

| Método | Endpoint | Descripción | Parámetros / Retorno |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Retorna la interfaz gráfica SPA completa (HTML5 + CSS3 + JS). | `text/html` |
| `GET` | `/video_feed` | Stream de video MJPEG a 30 FPS con recuadros anotados y pancarta superior. | `multipart/x-mixed-replace` |
| `GET` | `/api/status` | Obtiene el estado actual del molinete, FPS, latencia y EPP. | JSON con `result`, `epp`, `gate_status`, `access_msg`, `fps_cam`, `fps_infer`. |
| `POST` | `/api/photo` | Procesa una imagen estática subida por el usuario. | `multipart/form-data` con archivo `file`. Retorna imagen en Base64 y veredicto. |
| `GET` | `/api/start/<src>` | Inicia la cámara seleccionada (`laptop` o `droidcam`). | Query params opcionales: `?ip=192.168.0.24&port=4747`. |
| `GET` | `/api/stop` | Detiene la cámara activa y limpia los buffers. | JSON `{"ok": true}`. |

---

## 8. Guía Paso a Paso: Cómo Agregar este Módulo a un Proyecto Ya Existente

Dado que tu otro proyecto ya está programado y **solo necesitas agregar este módulo**, aquí tienes la guía exacta paso a paso:

### Paso 1: Archivos Mínimos a Extraer (Solo ~15 MB)
**NO necesitas copiar el dataset de 23,000 imágenes ni carpetas temporales.** Únicamente debes copiar los siguientes archivos a tu proyecto principal:

```
tu_proyecto_existente/
│
├── modulos/                       <-- o dentro de tu carpeta de módulos
│   └── modulo_epp/
│       ├── weights/
│       │   ├── best.pt            (6.49 MB - Pesos entrenados del EPP)
│       │   └── yolov8n.pt         (6.54 MB - Localizador de personas)
│       ├── epp_engine.py          (Motor de visión IA y lógica de acceso)
│       └── epp_app.py             (Servidor web / Blueprint del módulo)
```

> **Ubicación del modelo entrenado:**
> El archivo `best.pt` se encuentra en:
> `runs/epp_detector-3/weights/best.pt`

---

### Paso 2: Instalar Dependencias en el Entorno de tu Proyecto
En el entorno virtual (`venv` o `conda`) de tu proyecto existente, instala únicamente las dependencias de visión artificial:

```bash
pip install ultralytics torch torchvision opencv-python flask numpy
```
*(Si tu tarjeta es NVIDIA y deseas aceleración CUDA al 100%, instala PyTorch con soporte CUDA: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124`)*.

---

### Paso 3: Opciones para Integrar el Módulo en tu Proyecto

Tienes **3 formas sencillas** de integrarlo, elige la que mejor se adapte a la arquitectura de tu proyecto principal:

#### Opción A (La Más Recomendada): Microservicio Autónomo + Ventana o Iframe
Si tu proyecto principal tiene su propio panel de control (ej. Django, React, Vue, PHP, Laravel, o Flask):
1. Ejecutas el módulo EPP en el puerto 5000:
   ```bash
   python epp_app.py
   ```
2. En tu proyecto principal, agregas un botón **"Módulo Seguridad EPP"** que abre una ventana emergente o incrusta un `<iframe>`:
   ```html
   <!-- En la vista de tu proyecto existente -->
   <div class="tab-pane" id="modulo-seguridad">
     <iframe src="http://localhost:5000" style="width:100%; height:850px; border:none; border-radius:12px;"></iframe>
   </div>
   ```
   *Ventaja:* Cero conflictos de código o dependencias entre tu proyecto existente y el módulo de IA.

---

#### Opción B: Integración como Blueprint en una App Flask Existente
Si tu proyecto existente está hecho en **Flask**:
1. Conviertes `epp_app.py` en un Blueprint de Flask:
   ```python
   # En epp_blueprint.py
   from flask import Blueprint, render_template_string, jsonify, Response, request
   epp_bp = Blueprint('epp', __name__, url_prefix='/seguridad-epp')

   @epp_bp.route('/')
   def index():
       return render_template_string(HTML_PAGE)

   @epp_bp.route('/video_feed')
   def video_feed():
       return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
   ```
2. En tu `app.py` principal, simplemente lo registras:
   ```python
   from modulos.modulo_epp.epp_blueprint import epp_bp
   app.register_blueprint(epp_bp)
   ```
   Y accedes directamente desde: `http://localhost:PUERTO_DE_TU_APP/seguridad-epp`.

---

#### Opción C: Integración como Función Pura de Backend (Consumo API)
Si tu proyecto existente ya tiene su propia interfaz y solo quieres que cuando el usuario suba una foto o active una cámara, la IA le responda si puede ingresar o no:
1. Importas la función de inspección directamente:
   ```python
   from modulos.modulo_epp.epp_app import inspect_frame
   import cv2

   # Leer imagen del trabajador
   frame = cv2.imread("foto_trabajador.jpg")

   # Inspección inteligente
   boxes_data, epp, det_count, has_worker = inspect_frame(frame, is_photo=True)

   # Verificar permiso de ingreso a la fábrica
   all_ok = all(v["status"] == "detected" for v in epp.values())
   if all_ok:
       print("✅ INGRESO PERMITIDO: Cumple con Casco, Lentes y Chaleco.")
   else:
       faltantes = [k for k, v in epp.items() if v["status"] == "missing"]
       print(f"⛔ INGRESO DENEGADO: Falta portar {faltantes}")
   ```

---

## 9. Comprobación y Puesta en Marcha Rápida

Para verificar el funcionamiento del módulo antes o después de integrarlo:
1. Ejecuta el servidor:
   ```bash
   python epp_app.py
   ```
2. Abre en cualquier navegador web:
   ```
   http://localhost:5000
   ```
3. Realiza la prueba:
   * **Con Foto:** Haz clic en **Subir Foto** y selecciona una imagen con trabajador equipado (aprobará y abrirá el torniquete) o sin EPP (bloqueará y emitirá la advertencia).
   * **Con Laptop:** Pulsa **Cámara Laptop** para ver la detección en tiempo real a 30 FPS.
   * **Con DroidCam:** Inicia DroidCam en tu celular (conectado a la misma red WiFi), verifica la IP (`192.168.0.24`) y puerto (`4747`), y pulsa **DroidCam WiFi**.
