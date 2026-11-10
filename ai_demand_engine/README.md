# 🧠 Motor de IA Predictiva — PlastDemandNet (Aceleración GPU NVIDIA)

Este módulo implementa el entrenamiento e inferencia en **GPU NVIDIA (GeForce RTX 4060)** para pronóstico de demanda de ventas y planificación de resinas plásticas (MRP) para **PlastControl**.

---

## 🚀 Características Principales

1. **Aceleración por Hardware:**
   - **Dispositivo:** `NVIDIA GeForce RTX 4060 Laptop GPU` (8.0 GB VRAM).
   - **Framework:** PyTorch con CUDA y precisión mixta automática (AMP / Tensor Cores).
   - **Rendimiento:** 120 épocas de optimización completadas en ~160 segundos (~1.2s/época).

2. **Gestión Matemática de Valores Positivos y Negativos:**
   - **Valores Positivos:** Pedidos completados y entregas parciales.
   - **Valores Cero:** Cancelaciones de pedidos (demanda no atendida).
   - **Valores Negativos:** Devoluciones de clientes y notas de crédito (disminuyen inventario despachado y generan impacto comercial negativo).
   - **Transformación Simétrica:** $\text{symlog}(x) = \text{sign}(x) \cdot \ln(1 + |x|)$ con inversión estabilizada $\text{inv\_symlog}(y)$, permitiendo modelar desde $-\$26,000$ USD hasta $+\$105,000$ USD sin distorsiones ni cortes logarítmicos.

3. **Arquitectura Multi-Tarea (`PlastDemandNet`):**
   - Embeddings para variables categóricas (Producto, Proceso, Sector, Región, Estacionalidad, Factor de Impacto, Estado).
   - Codificación cíclica temporal sinusoidal ($\sin/\cos$) para Mes, Semana y Día de la semana.
   - Capa de Auto-Atención Multi-Cabeza (Multi-Head Self-Attention).
   - Bloques residuales profundos con activación SiLU y LayerNorm.
   - 3 Cabezales de regresión simultáneos:
     - `Cantidad_Unidades` (Demanda neta).
     - `Total_Peso_Plastico_Kg` ($R^2 = 0.8832$, WAPE $= 22.45\%$).
     - `Impacto_Comercial_Estimado_USD` ($R^2 = 0.6714$).

4. **Traducción Estequiométrica a Silos de Resina (MRP):**
   - Convierte automáticamente las unidades predichas a requerimiento de resina virgen considerando la merma específica de planta ($2.1\%$ a $5.0\%$) para tolvas y silos de HDPE, PP, LDPE y PET.

---

## 💻 Comandos de Ejecución

### 1. Entrenar el Modelo en GPU
```powershell
& "C:\Users\IFAM_\AppData\Local\Programs\Python\Python311\python.exe" ai_demand_engine\train_gpu.py
```

### 2. Ejecutar Inferencia de Prueba (Venta Positiva)
```powershell
& "C:\Users\IFAM_\AppData\Local\Programs\Python\Python311\python.exe" ai_demand_engine\predict_gpu.py --product PREF-PET-28 --units 120000 --price 0.045 --weight 0.024 --status COMPLETADA
```

### 3. Ejecutar Inferencia de Prueba (Devolución Negativa)
```powershell
& "C:\Users\IFAM_\AppData\Local\Programs\Python\Python311\python.exe" ai_demand_engine\predict_gpu.py --product TAPA-HDPE-28 --units -25000 --price 0.018 --weight 0.0035 --status DEVUELTA --impact RECHAZO_CALIDAD
```

### 4. Generar Reporte de Auditoría y Gráficos
```powershell
& "C:\Users\IFAM_\AppData\Local\Programs\Python\Python311\python.exe" ai_demand_engine\eval_report.py
```

---

## 📁 Archivos Generados en `ai_demand_engine/checkpoints/`

| Archivo | Descripción |
| :--- | :--- |
| `best_demand_gpu_model.pt` | Pesos entrenados del mejor modelo y metadatos del optimizador. |
| `metadata.json` | Vocabularios de categorías, normalizadores $(\mu, \sigma)$ y particiones. |
| `training_loss_curve.png` | Gráfico de pérdida de entrenamiento y validación por época. |
| `actual_vs_predicted.png` | Gráficos de dispersión Real vs Predicho para Kg e Impacto USD. |
| `evaluation_report.json` | Métricas finales de test set (RMSE, MAE, WAPE, R²). |

