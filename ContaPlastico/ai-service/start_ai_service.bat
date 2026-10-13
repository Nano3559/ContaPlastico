@echo off
title PlastControl SafeAccess AI - Microservicio YOLOv8
color 0b

echo ======================================================================
echo    PLASTCONTROL SAFEACCESS AI - MICROSERVICIO ULTRALYTICS YOLOV8
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando entorno de Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no se encuentra en el PATH del sistema.
    echo Por favor instala Python 3.9 o superior desde https://www.python.org/
    pause
    exit /b 1
)

echo [2/3] Instalando dependencias de YOLOv8 y FastAPI...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] Fallo al instalar algunas dependencias. Continuando...
)

echo.
echo [3/3] Iniciando servidor de inferencia YOLOv8 en http://localhost:8000 ...
echo Presiona CTRL+C para detener el servicio.
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
