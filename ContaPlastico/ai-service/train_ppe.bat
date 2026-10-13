@echo off
title PlastControl SafeAccess AI - Entrenamiento YOLOv8 PPE de Alta Precision
color 0a

echo ======================================================================
echo    PLASTCONTROL SAFEACCESS AI - ENTRENAMIENTO DE ALTA PRECISION
echo         Deteccion de Cascos, Chalecos y Gafas de Seguridad
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando dependencias...
pip install -r requirements.txt >nul 2>&1

echo.
echo [2/3] Iniciando entrenamiento con el 100%% del dataset...
echo - Para cancelar en cualquier momento presiona CTRL + C
echo.

python train_ppe.py --epochs 30 --batch 16 --imgsz 640 --fraction 1.0

if %errorlevel% neq 0 (
    echo.
    echo [ADVERTENCIA] Si fallo por falta de memoria VRAM de GPU, intentando con batch 8...
    python train_ppe.py --epochs 25 --batch 8 --imgsz 640 --fraction 1.0
)

echo.
echo ======================================================================
echo [3/3] Proceso terminado. Pesos actualizados en yolov8n-ppe.pt
echo ======================================================================
pause
