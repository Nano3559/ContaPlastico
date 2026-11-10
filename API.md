# 📋 Contrato de API REST — Sistema de Control de Materia Prima
**Proyecto:** Control de Inventario y Materia Prima para Fábrica de Plásticos  
**Arquitectura:** API REST con NestJS + JWT + Prisma  
**Estado:** Contrato inicial acordado para desarrollo en paralelo (Semana 1 y 2)

---

## 🔐 1. Autenticación y Usuarios (`/api/auth` & `/api/users`)

### `POST /api/auth/login`
- **Público**: Sí
- **Body**:
  ```json
  {
    "email": "admin@plastcontrol.com",
    "password": "password123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "accessToken": "jwt_token_string",
    "refreshToken": "jwt_refresh_token_string",
    "user": {
      "id": "usr-001",
      "name": "Carlos Mendoza",
      "email": "admin@plastcontrol.com",
      "role": "ADMIN", // ADMIN | ALMACEN | PRODUCCION | SUPERVISOR
      "shift": "TURNO_MANANA"
    }
  }
  ```

---

## 📦 2. Materias Primas y Silos (`/api/raw-materials`)

### `GET /api/raw-materials`
- **Roles**: Todos
- **Query Params**: `?search=&type=&minStockAlert=true`
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "mat-001",
      "code": "HDPE-INJ-5502",
      "name": "Polietileno de Alta Densidad (HDPE)",
      "type": "RESINA", // RESINA | MASTERBATCH | ADITIVO | RECUPERADO
      "category": "INYECCION", // INYECCION | EXTRUSION | SOPLADO
      "density": 0.955, // g/cm³
      "meltFlowIndex": 0.35, // g/10min (MFI)
      "unit": "KG",
      "currentStockKg": 14250.0,
      "minStockKg": 5000.0,
      "siloLocation": "Silo A-01",
      "status": "OPTIMO" // OPTIMO | BAJO | CRITICO
    }
  ]
  ```

---

## 🚚 3. Entradas de Materia Prima y Lotes (`/api/entries`)

### `POST /api/entries`
- **Roles**: `ADMIN`, `ALMACEN`
- **Body**:
  ```json
  {
    "materialId": "mat-001",
    "supplierId": "prov-003",
    "supplierBatchNumber": "LOTE-BRASKEM-8849",
    "quantityKg": 5000.0,
    "invoiceNumber": "FAC-2026-9901",
    "qualityCertificate": true,
    "siloOrWarehouseLocation": "Silo A-01",
    "operatorNotes": "Inspección visual conforme, libre de humedad"
  }
  ```

---

## ⚙️ 4. Solicitudes y Despacho a Producción (`/api/production-requests`)

### `POST /api/production-requests`
- **Roles**: `PRODUCCION`
- **Body**:
  ```json
  {
    "orderCode": "OP-2026-440",
    "line": "EXTRUSION_02",
    "targetProduct": "Bolsa Biodegradable 40x50",
    "requiredMaterials": [
      { "materialId": "mat-001", "quantityKg": 1200.0 },
      { "materialId": "mat-004", "quantityKg": 30.0 } // Masterbatch azul
    ]
  }
  ```

### `PATCH /api/production-requests/:id/approve`
- **Roles**: `ADMIN`, `ALMACEN`

---

## ♻️ 5. Control de Consumo y Registro de Merma (`/api/production/scrap`)

### `POST /api/production/scrap`
- **Roles**: `PRODUCCION`, `SUPERVISOR`
- **Body**:
  ```json
  {
    "productionOrderId": "OP-2026-440",
    "consumedRawMaterialKg": 1230.0,
    "producedGoodKg": 1150.0,
    "scrapRecoverableKg": 60.0, // Retales para molienda
    "scrapDiscardKg": 20.0, // Purgas contaminadas
    "cause": "ARRANQUE_MAQUINA" // ARRANQUE_MAQUINA | CAMBIO_COLOR | ATASCO | DESCALIBRACION
  }
  ```

---

## 🚨 6. Alertas de Stock (`/api/alerts`)

### `GET /api/alerts`
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "alt-01",
      "materialId": "mat-003",
      "materialName": "Polipropileno Copolímero (PP-CP)",
      "currentStockKg": 1800.0,
      "minStockKg": 4000.0,
      "severity": "CRITICAL", // WARNING | CRITICAL
      "triggeredAt": "2026-08-18T14:30:00Z"
    }
  ]
  ```

---

## 📊 7. Reportes y Exportación (`/api/reports`)

- `GET /api/reports/monthly-balance?month=8&year=2026&format=excel`
- `GET /api/reports/scrap-analysis?format=pdf`

---

## 🛡️ 8. Visión Artificial y Verificación de EPP (`/api/vision`)

### `POST /api/vision/verify-epp`
- **Roles**: `ADMIN`, `ALMACEN`, `PRODUCCION`, `SUPERVISOR`
- **Descripción**: Evalúa en tiempo real si el operario porta los implementos obligatorios de seguridad (Casco, Lentes, Chaleco) mediante el modelo de visión YOLOv8/Roboflow antes de autorizar el acceso al sistema de almacén.
- **Body**:
  ```json
  {
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "imageUrl": "https://ejemplo.com/operario.jpg" // Opcional para pruebas
  }
  ```
- **Response `200 OK` (Acceso Autorizado)**:
  ```json
  {
    "accessGranted": true,
    "status": {
      "helmet": true,
      "goggles": true,
      "vest": true
    },
    "missing": [],
    "detected": ["Casco", "Lentes", "Chaleco"],
    "confidenceSummary": {
      "helmet": 88,
      "goggles": 79,
      "vest": 92
    },
    "detections": [
      {
        "label": "helmet",
        "confidence": 88,
        "box": { "x": 320, "y": 110, "width": 140, "height": 90 }
      }
    ],
    "timestamp": "2026-09-29T15:00:00.000Z",
    "message": "Acceso Autorizado: El operario cumple con todos los implementos de seguridad requeridos (EPP)."
  }
  ```
- **Response `200 OK` (Acceso Bloqueado / Falta EPP)**:
  ```json
  {
    "accessGranted": false,
    "status": {
      "helmet": true,
      "goggles": false,
      "vest": true
    },
    "missing": ["Lentes / Gafas de protección"],
    "detected": ["Casco", "Chaleco"],
    "message": "Acceso Denegado: Faltan implementos de protección obligatorios: Lentes / Gafas de protección."
  }
  ```

---

## 🤖 7. Módulo IA: Predicción de Demanda & Planificación MRP (`/api/demand-forecasting`)

### `POST /api/demand-forecasting/predict`
- **Roles**: Todos
- **Nota**: `modelAccuracyScore` y `mapePercent` son valores ilustrativos en este ejemplo. La puntuación devuelta se calcula sobre el histórico cargado y no representa una validación independiente ni una garantía sobre ventas reales.
- **Body**:
  ```json
  {
    "granularity": "month", // "month" | "week" | "year"
    "periods": 6,
    "productCode": "TAPA-HDPE-28", // opcional
    "category": "INYECCION", // opcional: INYECCION | SOPLADO | EXTRUSION | TERMOFORMADO
    "algorithm": "AUTO_ENSEMBLE" // "AUTO_ENSEMBLE" | "HOLT_WINTERS" | "REGRESSION" | "EXPONENTIAL_SMOOTHING"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "granularity": "month",
    "algorithm": "AUTO_ENSEMBLE",
    "periodsForecasted": 6,
    "modelAccuracyScore": 92.4,
    "mapePercent": 7.6,
    "historical": [
      {
        "periodKey": "2024-11",
        "periodLabel": "Nov 2024",
        "actualUnits": 385000,
        "actualWeightKg": 38200,
        "actualRevenue": 92400
      }
    ],
    "forecast": [
      {
        "periodKey": "2026-11",
        "periodLabel": "Nov 2026",
        "forecastUnits": 590000,
        "lowerBoundUnits": 566400,
        "upperBoundUnits": 613600,
        "forecastWeightKg": 57820,
        "forecastRevenue": 141600,
        "confidenceLevel": 95,
        "growthVsPreviousPeriod": 4.4
      }
    ],
    "resinRequirements": [
      {
        "materialCode": "HDPE-5502",
        "materialName": "Polietileno de Alta Densidad (HDPE)",
        "siloLocation": "Silo A-01",
        "currentStockKg": 14500,
        "requiredKgNextPeriod": 18450,
        "stockStatusAfterForecast": "BAJO",
        "estimatedDaysUntilStockout": 23
      }
    ]
  }
  ```

### `GET /api/demand-forecasting/summary`
- **Query Params**: `?productCode=&category=`
- **Response `200 OK`**: Resumen de ventas, toneladas de plástico transformado, crecimiento YoY y top productos.

### `GET /api/demand-forecasting/history`
- **Query Params**: `?page=1&limit=50&search=&productCode=&category=`
- **Response `200 OK`**: Listado paginado de transacciones de los últimos 2 años.

### `GET /api/demand-forecasting/download-csv`
- **Response**: Stream del archivo `demand_sales_history_2years.csv` con formato RFC 4180 y UTF-8 BOM.

