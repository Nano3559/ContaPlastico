# 🏭 PlastControl

Sistema integral para controlar inventario de materia prima, entradas por báscula,
despachos a producción, consumo, merma, alertas y reportes en plantas de extrusión,
inyección y soplado.

---

## Estado del proyecto

El monorepo integra tres aplicaciones funcionales conectadas por una API REST:

| Persona | Módulo | Tecnología | Estado |
| :--- | :--- | :--- | :--- |
| Persona 1 / A | `backend` | NestJS, TypeScript, Prisma, PostgreSQL, JWT | Completo e integrado |
| Persona 2 / B | `frontend-web` | React, Vite, TypeScript, TailwindCSS | Completo e integrado |
| Persona 3 / C | `mobile-app` | React Native, Expo, Axios | Completo e integrado |

## Funcionalidades implementadas

### Persona 1: Backend

- API REST con prefijo `/api`, CORS, validación de DTOs y Swagger en `/api/docs`.
- Autenticación JWT con hashing mediante `bcrypt` y roles `ADMIN`, `ALMACEN`,
   `PRODUCCION` y `SUPERVISOR`.
- Gestión de usuarios, proveedores y materias primas.
- Inventario de silos con stock actual, mínimo, capacidad máxima y estados
   `OPTIMO`, `BAJO` y `CRITICO`.
- Registro de entradas, lotes, facturas, certificados de calidad y movimientos.
- Solicitudes de producción con materiales requeridos, aprobación y despacho
   transaccional con descuento automático de inventario.
- Registro de consumo, producto terminado y merma recuperable o descartada,
   incluyendo cálculo del porcentaje de merma.
- Alertas automáticas de stock mínimo mediante tareas programadas.
- Historial de movimientos de entrada, salida, consumo y merma.
- KPIs del dashboard, balance mensual y análisis de merma con exportación Excel y PDF.
- Migraciones Prisma, seed con datos de demostración y pruebas automatizadas.

### Persona 2: Frontend Web

- Dashboard conectado a la API real, con KPIs, entradas, movimientos, solicitudes y alertas.
- Login, logout, perfiles rápidos y simulación de roles.
- Catálogo de materias primas con búsqueda, filtros, stock y ubicación de silo.
- Registro y consulta de entradas de materia prima.
- Solicitudes y aprobación de órdenes de producción.
- Control de consumo de materiales y registro de merma.
- Vista de líneas de producción y calculadora de recetas BOM con costeo.
- Centro de notificaciones y estado de conexión con el backend.
- Generación de etiquetas QR para lotes.
- Reportes de inventario, balance y merma.
- Capa de servicios con normalización de respuestas, autenticación automática,
   fallback de demostración y conexión configurable mediante `VITE_API_URL`.

### Persona 3: App Móvil

- Aplicación Expo para el personal de almacén.
- Login y persistencia de sesión con `AsyncStorage`.
- Consulta de inventario con búsqueda, filtros y estados de stock.
- Registro de entradas con lote, proveedor, factura, cantidad y ubicación.
- Consulta y aprobación de solicitudes de producción.
- Historial de movimientos con filtros por tipo.
- Consulta de alertas de stock bajo y crítico.
- Perfil de usuario y cierre de sesión.
- Navegación por pestañas, soporte Android/iOS y versión web con Expo.

---

## Estructura del monorepo

```
ContaPlastico/
├── backend/       # API NestJS, Prisma, PostgreSQL, autenticación y reportes
├── frontend-web/  # Dashboard web React conectado a la API
├── mobile-app/    # App móvil Expo para almacén
├── API.md         # Contrato de integración de endpoints
├── docker-compose.yml
└── README.md
```

---

## Requisitos

- Node.js 18 o superior.
- PostgreSQL local en el puerto `5432` o Docker Desktop.
- npm.
- Expo Go para probar la aplicación móvil en un dispositivo físico.

## Configuración y ejecución

### Backend

Configura `backend/.env` a partir de `backend/.env.example`:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/plastic_factory_db?schema=public"
JWT_SECRET="cambia-esta-clave-en-produccion"
JWT_EXPIRES_IN="7d"
```

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

Endpoints principales:

- API: `http://localhost:3000/api`
- Salud: `http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/api/docs`

### Frontend Web

```bash
cd frontend-web
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.
Para producción, configura `VITE_API_URL`.

### App Móvil

Configura `EXPO_PUBLIC_API_URL` según el entorno:

- Android Emulator: `http://10.0.2.2:3000/api`
- Dispositivo físico: `http://TU_IP_LOCAL:3000/api`
- Backend público: URL pública terminada en `/api`

```bash
cd mobile-app
npm install
npx expo start
```

Para generar la versión web móvil:

```bash
npm run build:web
```

## Credenciales de demostración

Todos los usuarios sembrados utilizan la contraseña `admin123`:

| Usuario | Rol |
| :--- | :--- |
| `carlos.mendoza@plastcontrol.com` | ADMIN |
| `jorge.ramirez@plastcontrol.com` | ALMACEN |
| `mario.paredes@plastcontrol.com` | PRODUCCION |
| `elena.torres@plastcontrol.com` | SUPERVISOR |

Estas credenciales son solo para desarrollo y demostración local.

## Validación

```bash
cd backend
npm test -- --runInBand
```

```bash
cd frontend-web
npm run build
```

```bash
cd mobile-app
npm run typecheck
```

El flujo integrado validado incluye autenticación, inventario, entrada de materia
prima, solicitud y aprobación de producción, consumo/merma, actualización de stock,
alertas y KPIs.

## Integración y Git

El contrato de payloads y endpoints se encuentra en [API.md](./API.md).

---

```bash
git checkout -b feature/nombre-del-modulo
git add .
git commit -m "feat: descripcion del cambio"
git push origin feature/nombre-del-modulo
```
