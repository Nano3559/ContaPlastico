# 🛠️ Backend API REST — Sistema de Control de Materia Prima
**Responsable:** Persona 1 / A  
**Tecnología:** NestJS + TypeScript + Prisma ORM + PostgreSQL/MySQL + JWT

---

## 📋 Plan de Trabajo para Persona 1 (2 Semanas)

### Semana 1: Fundamentos y Endpoints Clave
- **Día 1**: Configurar modelo de base de datos con `prisma/schema.prisma` y ejecutar migraciones iniciales.
- **Día 2**: Implementar módulo de autenticación `auth/` con JWT, hashing con `bcrypt` y guards de roles (`@Roles('ADMIN', 'ALMACEN')`).
- **Día 3**: Endpoints CRUD para **Materia Prima** (`/api/raw-materials`) y consulta de stock en silos.
- **Día 4**: Endpoints para **Entradas de Materia Prima** (`/api/entries`) y generación de lotes.
- **Día 5**: Endpoints para **Solicitudes de Despacho** (`/api/production-requests`) y aprobación.
- **Día 6-7**: Endpoints para **Control de Consumo y Registro de Merma** (`/api/production/scrap`).

### Semana 2: Integración y Módulos Finales
- **Día 8**: Endpoints para Proveedores e Historial de Movimientos.
- **Día 9**: Tareas programadas de Alertas de Stock mínimo con `@nestjs/schedule` (Cron).
- **Día 10**: Módulo de Reportes con exportación Excel (`exceljs`) y PDF (`pdfkit`).
- **Día 11**: Endpoints de gestión de usuarios y permisos.
- **Día 12-14**: Pruebas de integración con Frontend Web (Persona 2) y App Móvil (Persona 3).

---

## 🚀 Cómo Iniciar el Backend

1. **Instalar dependencias**:
   ```bash
   cd backend
   npm install
   ```

2. **Configurar variables de entorno**:
   - Copia `.env.example` a `.env` y ajusta `DATABASE_URL`.

3. **Ejecutar migraciones de base de datos**:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Iniciar en modo desarrollo**:
   ```bash
   npm run start:dev
   ```

5. **Documentación Swagger interactiva**:
   - Una vez iniciado, abre `http://localhost:3000/api/docs` para ver Swagger.
