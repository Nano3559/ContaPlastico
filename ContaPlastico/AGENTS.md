# 🤖 Guía de Agentes de IA - PlastControl (AGENTS.md)

Este documento contiene el **contexto de ingeniería, reglas de codificación, directrices de arquitectura y guardrails de seguridad** para asistentes y agentes de inteligencia artificial (Antigravity, Claude Code, Cursor, GitHub Copilot, Gemini CLI) que colaboren en el repositorio **PlastControl**.

---

## 1. Identidad y Contexto del Proyecto

* **Nombre del Sistema:** PlastControl (ContaPlastico).
* **Industria:** Manufactura y transformación de plásticos (Extrusión de película, Inyección de preformas/tapas y Soplado de envases).
* **Propósito:** Control de inventario en tiempo real de materias primas (resinas HDPE, PP, LDPE, masterbatch de color, aditivos UV y peletizado recuperado), registro de entradas en báscula con lotes petroquímicos, órdenes de producción (OP), despacho atómico de tolvas/silos, y cálculo de balance de masa y merma.

---

## 2. Estructura del Monorepo

```
ContaPlastico/
├── backend/            # API REST modular con NestJS 10, Prisma ORM y PostgreSQL
├── frontend-web/       # Dashboard administrativo con React 19, Vite y TailwindCSS
├── mobile-app/         # App móvil para operarios de patio/almacén con React Native y Expo SDK 51
├── .agents/            # Configuración de agentes y habilidades operativas (skills)
├── .github/            # Plantillas de GitHub y flujos de CI/CD
├── ARCHITECTURE.md     # Documento de arquitectura, modelo ERD y diagramas Mermaid
├── API.md              # Contrato de endpoints REST y ejemplos de payload
├── CONTRIBUTING.md     # Convenciones de Git, Conventional Commits y ramas
└── README.md           # Portal principal del repositorio
```

---

## 3. Reglas Técnicas Obligatorias para el Agente

### 🔹 Backend (NestJS + Prisma + PostgreSQL)
1. **TypeScript Estricto:** Prohibido el uso de `any` injustificado. Emplea interfaces y tipos fuertemente tipados.
2. **Validación de Entradas:** Todo endpoint debe contar con su correspondiente clase DTO decorada con `class-validator` (`@IsString()`, `@IsNumber()`, `@IsPositive()`, `@IsOptional()`). No confíes en datos del cliente sin validar.
3. **Integridad de Inventario (Transacciones ACID):** Toda operación que modifique stock (entradas de lote, despachos de orden de producción, ajustes por merma) **DEBE** ejecutarse dentro de un bloque `prisma.$transaction([...])`.
4. **Documentación Swagger:** Decora controladores y DTOs con decoradores de `@nestjs/swagger` (`@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiProperty()`).
5. **Autenticación y Autorización:** Usa `@UseGuards(JwtAuthGuard, RolesGuard)` y el decorador `@Roles(...)` para endpoints protegidos.

### 🔹 Frontend Web (React 19 + Vite + TailwindCSS)
1. **Componentes Funcionales:** Usa componentes funcionales con hooks de React. Evita componentes basados en clases.
2. **Diseño Visual de Calidad:** PlastControl debe transmitir una estética industrial moderna, limpia y profesional. Utiliza TailwindCSS con paletas armoniosas (grises oscuros, acentos azul marino, esmeralda para stock óptimo, ámbar para stock bajo y carmesí para stock crítico).
3. **Resiliencia en Servicios:** La capa de servicios (`src/services/`) debe gestionar los errores de red con gracia, mostrando notificaciones toast o mensajes legibles al usuario, y manteniendo compatibilidad con los tipos definidos en backend.

### 🔹 Mobile App (React Native + Expo SDK 51)
1. **Rendimiento Operativo:** Diseñado para teléfonos de uso rudo en almacén. Las listas (`FlatList`) deben ser ligeras y soportar refresco por deslizamiento (`onRefresh`).
2. **Persistencia Segura:** Los tokens JWT deben almacenarse mediante `@react-native-async-storage/async-storage`.
3. **Navegación:** Emplea React Navigation (Tabs y Native Stack) con tipado en las rutas.

---

## 4. Reglas del Dominio de Plásticos (Glosario y Cálculos)

Cuando generes código o resuelvas incidencias, respeta la lógica de la industria plástica:
* **MFI (Melt Flow Index / Índice de Fluidez):** Medido en `g/10min`. Crítico para determinar la procesabilidad de la resina.
* **Densidad:** Medida en `g/cm³` (ej: HDPE ~0.95 g/cm³, PP ~0.90 g/cm³).
* **Fórmula de Merma:**
  $$\% \text{ Merma} = \frac{\text{Merma Recuperable (kg)} + \text{Merma Descarte (kg)}}{\text{Materia Prima Utilizada (kg)}} \times 100$$
  * *Merma Recuperable:* Se reingresa como material tipo `RECUPERADO`.
  * *Merma Descarte:* Es scrap no reutilizable (purga degradada o contaminada).
* **Capacidad de Silos:** Cada silo tiene `minStockKg` y `maxCapacityKg`. Si el stock actual cae por debajo del mínimo, su estado debe cambiar automáticamente a `BAJO` o `CRITICO`.

---

## 5. Guardrails de Seguridad y Operación para el Agente

> [!CAUTION]
> **PROHIBICIONES ESTRICTAS:**
> 1. **NUNCA** hagas commit de archivos con credenciales reales (`.env`, certificados, llaves privadas).
> 2. **NUNCA** ejecutes comandos destructivos de base de datos (`prisma migrate reset` o `DROP DATABASE`) sin advertencia explícita y confirmación previa del usuario.
> 3. **NUNCA** hagas push forzado (`git push --force`) a la rama `main`.
> 4. **SIEMPRE** utiliza mensajes de commit bajo la especificación [Conventional Commits](CONTRIBUTING.md).

---

## 6. Comandos Frecuentes de Desarrollo

| Acción | Comando | Directorio de Ejecución |
| :--- | :--- | :--- |
| **Iniciar Backend (Dev)** | `npm run start:dev` | `/backend` |
| **Generar Cliente Prisma** | `npm run prisma:generate` | `/backend` |
| **Ejecutar Migraciones** | `npm run prisma:migrate` | `/backend` |
| **Poblar Base de Datos (Seed)** | `npm run db:seed` | `/backend` |
| **Iniciar Frontend Web** | `npm run dev` | `/frontend-web` |
| **Compilar Web** | `npm run build` | `/frontend-web` |
| **Iniciar App Móvil** | `npx expo start` | `/mobile-app` |
| **Levantar con Docker** | `docker compose up -d` | Raíz `/` |
