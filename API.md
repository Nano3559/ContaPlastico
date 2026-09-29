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

