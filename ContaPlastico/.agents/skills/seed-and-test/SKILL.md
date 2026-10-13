---
name: seed-and-test
description: Guía de ejecución paso a paso para inicializar la base de datos PostgreSQL, ejecutar migraciones de Prisma, correr el script de seed y verificar la conectividad de la API.
---

# Habilidad: Inicialización y Prueba de Base de Datos (seed-and-test)

Esta habilidad le indica al agente o desarrollador cómo preparar el entorno de datos para **PlastControl** de forma limpia y confiable.

## Requisitos Previos
1. Contenedor de PostgreSQL levantado o servicio local activo en el puerto `5432`.
2. Archivo `backend/.env` configurado con `DATABASE_URL`.

## Procedimiento Paso a Paso

### 1. Verificar el Servicio de Base de Datos
Si se utiliza Docker:
```bash
docker compose up -d postgres
```
Comprueba que el contenedor responda en el puerto 5432:
```powershell
docker ps --filter "name=postgres"
```

### 2. Generar el Cliente de Prisma
Navega a `backend/` y sincroniza los tipos generados:
```powershell
cd backend
npm run prisma:generate
```

### 3. Aplicar Migraciones Pendientes
Ejecuta las migraciones de Prisma en modo desarrollo:
```powershell
npm run prisma:migrate
```

### 4. Sembrar Datos Iniciales (Seed)
Puebla la base de datos con los usuarios demo, proveedores, materias primas, silos y lotes de prueba:
```powershell
npm run db:seed
```

### 5. Validación de Éxito
Verifica que los usuarios clave hayan sido creados:
- `admin@plastcontrol.com` (Rol ADMIN)
- `almacen@plastcontrol.com` (Rol ALMACEN)
- `produccion@plastcontrol.com` (Rol PRODUCCION)
- `supervisor@plastcontrol.com` (Rol SUPERVISOR)

Abre Prisma Studio si requieres inspección visual:
```powershell
npm run prisma:studio
```
