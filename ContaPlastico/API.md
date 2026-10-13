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

## 🦺 8. Control de Seguridad e Inspección EPP con IA (`/api/safety-audits`)

### `POST /api/safety-audits`
- **Roles**: Todos (`ALMACEN`, `PRODUCCION`, `ADMIN`, `SUPERVISOR`)
- **Body**:
  ```json
  {
    "userId": "usr-002",
    "station": "Kiosco Báscula Entrada Almacén",
    "compliant": true,
    "hasHelmet": true,
    "hasVest": true,
    "hasGlasses": true,
    "score": 96.5,
    "photoUrl": "data:image/jpeg;base64,...",
    "bypassUsed": false,
    "supervisorNotes": "Inspección aprobada por IA. EPP conforme."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "safe-001",
    "token": "PASS-89X72K",
    "approved": true,
    "expiresAt": "2026-09-22T23:59:59Z"
  }
  ```

### `GET /api/safety-audits`
- **Roles**: `SUPERVISOR`, `ADMIN`
- **Query Params**: `?station=&compliant=true|false&date=`
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "safe-001",
      "userName": "Jorge Ramírez",
      "userRole": "ALMACEN",
      "station": "Kiosco Báscula Entrada Almacén",
      "timestamp": "2026-09-22T07:15:30Z",
      "compliant": true,
      "hasHelmet": true,
      "hasVest": true,
      "hasGlasses": true,
      "score": 96.5
    }
  ]
  ```

