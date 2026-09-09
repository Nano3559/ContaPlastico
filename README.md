# 🏭 PlastControl — Sistema de Control de Materia Prima y Planta

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-red?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-51.0-black?logo=expo&logoColor=white)](https://expo.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-5.12-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

**Solución integral empresarial para la gestión de inventarios, pesaje en báscula, silos, órdenes de producción, despacho de materia prima y control de mermas en plantas de extrusión, inyección y soplado de plástico.**

[Documentación de Arquitectura](ARCHITECTURE.md) • [Catálogo de API REST](API.md) • [Catálogo de Librerías](LIBRARIES.md) • [Guía de Contribución & Git](CONTRIBUTING.md) • [Manual de Agentes IA](AGENTS.md)

</div>

---

## 📖 Descripción del Problema y Solución

En las plantas industriales de transformación de plásticos, el control de materia prima representa hasta el **70% del costo operativo**. Los errores en la dosificación de resinas (HDPE, PP, LDPE), la falta de trazabilidad en lotes petroquímicos, los silos desbordados o vacíos y el registro tardío de merma (scrap) generan pérdidas económicas significativas.

**PlastControl** resuelve esta problemática conectando tres frentes operativos en tiempo real:
1. **Patio de Descarga y Almacén (Móvil):** Registro de pesaje bruto/tara en báscula, validación de certificados de calidad de resina y asignación automática a silos.
2. **Líneas de Producción (Web Dashboard):** Emisión y aprobación de Órdenes de Producción (OP), despacho atómico con descuento de inventario y calculadora de recetas BOM.
3. **Control de Calidad y Mermas (Reportes):** Registro de balance de masa (producto terminado vs. merma recuperable de molienda vs. purga de descarte) y cálculo automático de indicadores KPI.

---

## 🏛️ Arquitectura del Sistema

El proyecto está diseñado como un **Monorepo Multicapa** con separación estricta de responsabilidades:

```mermaid
graph TD
    subgraph Frontend["🖥️ Web & 📱 Mobile"]
        Web["Web Dashboard (React 19 + Vite)"]
        Mobile["App Móvil Almacén (Expo SDK 51)"]
    end

    subgraph API["⚙️ Backend REST (NestJS 10)"]
        Gateway["Controladores REST & Swagger (/api)"]
        Auth["JWT & RBAC Guards"]
        Services["Lógica de Negocio & Transacciones"]
        Cron["Cron Jobs (Alertas de Stock)"]
    end

    subgraph DB["🗄️ Persistencia"]
        Prisma["Prisma ORM 5.12"]
        Postgres[("PostgreSQL")]
    end

    Web -->|HTTP / REST + JWT| Gateway
    Mobile -->|HTTP / REST + JWT| Gateway
    Gateway --> Auth
    Auth --> Services
    Services --> Prisma
    Cron --> Services
    Prisma --> Postgres
```

Para una explicación a fondo del modelo Entidad-Relación (ERD) y los diagramas de secuencia, consulta [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🛠️ Stack Tecnológico Justificado

A nivel profesional, cada tecnología en PlastControl fue seleccionada por criterios de escalabilidad, seguridad, rendimiento y madurez en el ecosistema:

| Capa | Tecnología | Versión | Rol en el Sistema | Justificación Técnica de Selección |
| :--- | :--- | :--- | :--- | :--- |
| **Backend** | **NestJS** | `^10.0.0` | Núcleo de la API REST | Arquitectura modular inspirada en Angular, inyección de dependencias de primera clase y soporte nativo de TypeScript para código robusto y testeable. |
| **ORM** | **Prisma** | `^5.12.0` | Mapeo Objeto-Relacional | Tipado estricto automático generado desde el esquema, migraciones declarativas y soporte de transacciones ACID (`$transaction`) indispensables para inventarios. |
| **Base de Datos** | **PostgreSQL** | `16` | Persistencia Relacional | Motor transaccional líder en consistencia ACID, manejo de índices concurrentes y alta confiabilidad para volúmenes industriales. |
| **Seguridad** | **Passport + JWT** | `^10.2.0` | Autenticación y RBAC | Tokens sin estado (stateless) para comunicación segura y desacoplada entre clientes Web/Mobile y la API, cifrado con `bcrypt`. |
| **Frontend Web** | **React** | `^19.2.8` | Interfaz de Administración | El estándar de la industria para interfaces reactivas, con renderizado eficiente y ecosistema de hooks para flujos de planta. |
| **Bundler Web** | **Vite** | `^6.2.0` | Empaquetador y Dev Server | Hot Module Replacement (HMR) casi instantáneo y compilación optimizada con Rollup para tiempos de carga mínimos. |
| **Estilos Web** | **TailwindCSS** | `^3.4.17` | Sistema de Diseño Visual | Diseño utilitario que evita CSS redundante, facilitando temas visuales industriales (estados de silos, alertas y KPIs). |
| **Mobile** | **React Native + Expo** | `SDK 51` | Aplicación Móvil Operativa | Desarrollo multiplataforma (Android/iOS) con acceso rápido a red, cámara/QR para lotes y almacenamiento local con `AsyncStorage`. |
| **DevOps** | **Docker & Compose** | `3.8+` | Contenedores | Entorno reproducible de PostgreSQL y servicios, garantizando paridad entre desarrollo local y producción. |

> [!TIP]
> Para conocer el inventario detallado de cada paquete NPM, utilidades de validación (`class-validator`), generadores de reportes (`exceljs`, `pdfkit`), iconos (`lucide`), persistencia local (`async-storage`) y herramientas de prueba, consulta el [Catálogo Estructurado de Librerías (LIBRARIES.md)](LIBRARIES.md).

---

## 📁 Estructura del Monorepo

```
ContaPlastico/
├── backend/                  # API REST NestJS, Prisma y PostgreSQL
│   ├── prisma/               # Esquema de base de datos y scripts de seed
│   ├── src/                  # Módulos de dominio (auth, materials, entries, production, etc.)
│   └── test/                 # Pruebas unitarias y de integración
├── frontend-web/             # Dashboard web React 19 + Vite
│   ├── src/components/       # Vistas de silos, báscula, líneas de producción y mermas
│   └── src/services/         # Clientes de API con fallback demo y normalización
├── mobile-app/               # Aplicación móvil Expo para operarios de almacén
│   └── src/screens/          # Pantallas de inventario, entradas y movimientos
├── .agents/                  # Configuración de Agentes IA y Habilidades (skills)
│   └── skills/               # Habilidades de automatización (seed-and-test, create-api-module, git-workflow)
├── .github/                  # Plantilla de Pull Request y flujos de colaboración
├── API.md                    # Catálogo formal de endpoints y payloads REST
├── ARCHITECTURE.md           # Diseño arquitectónico, diagramas y modelo ERD
├── CONTRIBUTING.md           # Convenciones de Git y guía de contribución
├── AGENTS.md                 # Directrices para asistentes y agentes de IA
└── docker-compose.yml        # Orquestación de servicios locales
```

---

## 🚀 Puesta en Marcha Rápida (Quickstart)

### Requisitos Previos
* **Node.js** >= `18.0.0`
* **npm** >= `9.0.0`
* **Docker Desktop** (o servicio local de PostgreSQL en el puerto `5432`)
* Aplicación **Expo Go** en tu dispositivo móvil (opcional para pruebas en físico)

---

### Paso 1: Clonar y Levantar la Base de Datos

```bash
# Iniciar el contenedor de PostgreSQL
docker compose up -d postgres
```

### Paso 2: Configurar y Arrancar el Backend

```bash
cd backend

# Copiar variables de entorno
cp .env.example .env

# Instalar dependencias
npm install

# Generar cliente y aplicar migraciones
npm run prisma:generate
npm run prisma:migrate

# Sembrar datos de demostración
npm run db:seed

# Iniciar servidor en modo desarrollo
npm run start:dev
```
* 🟢 **Backend API:** `http://localhost:3000/api`
* 📑 **Documentación Swagger:** `http://localhost:3000/api/docs`

---

### Paso 3: Arrancar el Dashboard Web

En una nueva terminal:
```bash
cd frontend-web
npm install
npm run dev
```
* 🟢 **Web App:** `http://localhost:5173`

---

### Paso 4: Arrancar la App Móvil

En una nueva terminal:
```bash
cd mobile-app
npm install
npx expo start
```
* Escanea el código QR desde la app **Expo Go** (Android) o la cámara (iOS).

---

## 🔑 Credenciales de Demostración (Seed Data)

El script de inicialización (`npm run db:seed`) carga usuarios preconfigurados con contraseñas cifradas en `bcrypt` (`password123`):

| Correo Electrónico | Contraseña | Rol Asignado | Permisos y Alcance |
| :--- | :--- | :--- | :--- |
| `admin@plastcontrol.com` | `password123` | `ADMIN` | Acceso total al sistema, auditoría y configuración de usuarios. |
| `almacen@plastcontrol.com` | `password123` | `ALMACEN` | Registro en báscula, recepción de lotes y despacho de silos. |
| `produccion@plastcontrol.com` | `password123` | `PRODUCCION` | Solicitud de OPs, balance de masa y reporte de scrap. |
| `supervisor@plastcontrol.com` | `password123` | `SUPERVISOR` | Aprobación de órdenes, monitoreo de KPIs y reportes PDF/Excel. |

---

## 🤝 Convenciones de Git y Colaboración

Todo el equipo sigue el estándar **Conventional Commits**:
* `feat(silos): agregar validación de capacidad porcentual`
* `fix(auth): corregir refresco de token JWT`
* `docs(readme): actualizar instrucciones de ejecución`

Para revisar la política de ramas (`main`, `develop`, `feature/*`), criterios de aprobación y el checklist para Pull Requests, consulta [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 🤖 Desarrollo Asistido por IA (Agentes y Skills)

Este repositorio está preparado para agentes de IA de ingeniería de software (Antigravity, Cursor, Copilot, Claude Code):
* **Directrices del Agente:** [AGENTS.md](AGENTS.md)
* **Skills Automatizadas:** Ubicadas en `.agents/skills/`:
  * `seed-and-test`: Inicialización y prueba de base de datos.
  * `create-api-module`: Creación estandarizada de módulos NestJS.
  * `git-workflow`: Guía para preparación de commits y PRs.

---

## 📄 Licencia y Autores

Proyecto desarrollado para la gestión y control de manufactura de plásticos.
Todos los derechos reservados © 2026.
