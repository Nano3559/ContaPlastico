---
name: git-workflow
description: Guía de comandos y validaciones para sincronizar ramas, formular mensajes bajo Conventional Commits y preparar Pull Requests sin conflictos en PlastControl.
---

# Habilidad: Flujo de Trabajo y Automatización de Git (git-workflow)

Esta habilidad asiste al agente o desarrollador para interactuar con Git cumpliendo rigurosamente los lineamientos de [CONTRIBUTING.md](../../../CONTRIBUTING.md).

## Pasos Operativos

### 1. Iniciar una Nueva Característica
Asegúrate de estar en una rama limpia basada en los últimos cambios:
```bash
git checkout main
git pull origin main
git checkout -b feature/nombre-de-la-funcionalidad
```

### 2. Verificar el Estado de Archivos
Antes de añadir archivos al índice de staging:
```bash
git status
```
> [!WARNING]
> Comprueba que ningún archivo `.env`, carpetas `node_modules` o archivos compilados en `dist/` estén incluidos. Si aparecen, verifica `.gitignore`.

### 3. Preparar Commits con Conventional Commits
Agrega los archivos modificados conscientemente:
```bash
git add ruta/al/archivo.ts
```

Genera el commit respetando la convención:
```bash
git commit -m "feat(modulo): breve descripcion en imperativo"
```

Ejemplos:
- `feat(silos): agregar validacion de capacidad maxima al despachar`
- `fix(auth): corregir refresco de token expirado en mobile`
- `docs(api): documentar endpoint POST /api/entries`
- `refactor(web): separar logica de cálculo de merma en hook useScrap`

### 4. Sincronizar Cambios antes de Publicar
Para evitar conflictos de integración:
```bash
git fetch origin main
git merge origin/main
```
Si se presentan conflictos, resuélvelos manualmente, corre las pruebas y luego haz commit de la resolución.

### 5. Publicar la Rama y Abrir PR
Sube tu rama al repositorio remoto:
```bash
git push -u origin feature/nombre-de-la-funcionalidad
```
Abre el Pull Request en GitHub seleccionando la plantilla estandarizada en `.github/PULL_REQUEST_TEMPLATE.md`.
