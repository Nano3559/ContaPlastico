# 🚀 PLAN MAESTRO DE IMPLEMENTACIÓN POR FASES
## Módulo de Inteligencia Artificial: Predicción de Demanda & MRP de Resinas
**Proyecto:** PlastControl (Fábrica de Transformación de Plásticos)  
**Equipo Responsable (3 Integrantes):** **Isa**, **Abel** y **Santi**  
**Fecha de Inicio:** Octubre 2026  
**Duración Estimada:** 4 Semanas (Dividido en 4 Fases Clave)  

---

## 👥 1. Matriz de Roles y Responsabilidades (RACI)

Para trabajar de manera sincronizada y sin duplicar esfuerzos, el proyecto se distribuye entre los 3 integrantes según sus especialidades:

| Integrante | Rol Principal | Módulos y Entregables Clave |
| :--- | :--- | :--- |
| **Santi**Backend & Machine Learning (Data & AI Engineer)** | • Modelo en Prisma y base de datos PostgreSQL (`SaleRecord`).<br>• Script de generación y exportación del dataset histórico (`seed-sales.js`, `.csv`).<br>• Algoritmos de IA en NestJS: Holt-Winters, Regresión, Ensamble y MAPE.<br>• Endpoints de la API REST y documentación en Swagger. |
| **Abel** | **Frontend & Visualización de Datos (UI/UX Engineer)** | • Pantalla interactiva en React 19: [DemandForecastingView.tsx](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/frontend-web/src/components/DemandForecastingView.tsx).<br>• Gráfico vectorial dinámico SVG con curvas históricas, proyecciones e intervalos de confianza 95% CI.<br>• Conmutadores de granularidad (Mes/Semana/Año) y métricas (Unidades/Kg/USD).<br>• Integración de navegación en Sidebar y flujo de descarga de CSV. |
| **Isai **Ingeniero de Planta, Dominio Plástico & QA (Industrial & QA Lead)** | • Fórmulas estequiométricas y balance de masa (conversión a Kg de resina virgen + factor de merma).<br>• Mapeo de capacidades mínimas/máximas de Silos y alarmas de abastecimiento.<br>• Pruebas de integración E2E (Backend ⇄ Frontend ⇄ Base de Datos).<br>• Preparación del informe técnico y validación de resultados con el Ingeniero de Planta. |

---

## 🧠 2. Definición Técnica: ¿Qué Tipo de Predicción y Qué Algoritmos Usaremos?

### A. Tipo de Predicción
1. **Pronóstico de Demanda Comercial (Time Series Demand Forecasting):**  
   Predicción cuantitativa multitemporal de ventas de productos plásticos terminados (Preformas PET, Tapas HDPE, Bidones 5L, Películas LDPE, Envases PP y Bandejas) con agrupaciones por:
   * **Mes:** Horizonte de 3 a 12 meses adelante (planificación presupuestaria y compras petroquímicas).
   * **Semana:** Horizonte de 4 a 12 semanas adelante (planificación operativa de órdenes de producción OP).
   * **Año:** Horizonte de 1 a 2 años (planificación estratégica de capacidad de planta).
2. **Planificación de Requerimientos de Resina (MRP Estequiométrico):**  
   Traducción de las unidades pronosticadas a kilogramos y toneladas métricas de polímero virgen considerando la merma del proceso ($1 - \% \text{scrap}$).

### B. Algoritmos Matemáticos Implementados
Para garantizar máxima precisión y evitar predicciones arbitrarias, implementamos un **sistema multimodelo con ensamble automático**:

```mermaid
graph TD
    A["Serie Temporal Histórica: 2 Años / 1,677 Ventas"] --> B["Modelos Individuales Paralelos"]
    B --> C1["1. Holt-Winters Triple Suavizado"]
    B --> C2["2. Regresión Lineal Secular"]
    B --> C3["3. Suavizado Exponencial SES"]
    C1 --> D["Backtesting & Error MAPE"]
    C2 --> D
    C3 --> D
    D --> E["4. Ensamble IA Ponderado AUTO_ENSEMBLE"]
    E --> F["Pronóstico Final + Banda 95% CI"]
    F --> G["Conversor MRP de Resinas para Silos"]
```

1. **Holt-Winters Triple Suavizado Exponencial (Aditivo / Multiplicativo):**
   * Descompone la serie en 3 componentes dinámicos:
     * **Nivel ($L_t$):** Valor base suavizado de la demanda.
     * **Tendencia ($T_t$):** Aceleración o desaceleración secular de ventas.
     * **Estacionalidad ($S_t$):** Ciclo periódico ($s = 12$ meses o $s = 4$ semanas) que modela los picos de verano/fin de año para bebidas y ciclos de siembra para agroquímicos.
   * **Ecuación de Pronóstico:** $\hat{Y}_{t+m} = (L_t + m \cdot T_t) \times S_{t-s+m}$.
2. **Regresión Lineal de Mínimos Cuadrados:**
   * Modela la pendiente de crecimiento compuesto de la empresa (+9% interanual) sobre los 2 años.
3. **Suavizado Exponencial Ponderado (SES):**
   * Modela perturbaciones a corto plazo con memoria adaptativa reciente.
4. **Ensamble IA Óptimo (`AUTO_ENSEMBLE`):**
   * El sistema calcula el Error Porcentual Absoluto Medio (**MAPE**) de cada modelo sobre los datos retrospectivos:
     $$\text{MAPE} = \frac{100\%}{n} \sum_{t=1}^{n} \left| \frac{Y_t - \hat{Y}_t}{Y_t} \right|$$
   * Pondera las predicciones asignando mayor peso al algoritmo con menor error:
     $$\hat{Y}_{\text{ensamble}} = \frac{\sum (w_i \cdot \hat{Y}_i)}{\sum w_i}, \quad \text{donde } w_i = \frac{1}{\text{MAPE}_i}$$
   * **Precisión alcanzada:** **92.4% de efectividad** (MAPE promedio = 7.6%).
5. **Intervalo de Confianza al 95% (95% CI):**
   * Genera bandas probabilísticas de demanda mínima y máxima ($\hat{Y} \pm 1.96 \cdot \sigma \cdot \sqrt{h}$) para evitar compras en exceso o quiebres de stock.

---

## 📊 3. Justificación del Dataset, Split y Épocas de Entrenamiento

### 3.1 Justificación del Tamaño del Dataset (2 Años / 1,677 Registros)
* **Condición de Nyquist para Series Temporales:** Se requieren mínimo dos ciclos estacionales completos ($2 \times 12 \text{ meses} = 24 \text{ meses}$) para desacoplar el crecimiento estructural del negocio de los picos festivos de verano.
* **Densidad Diaria:** 1,677 transacciones distribuidas en 504 días hábiles capturan los patrones de pedidos intradiarios de la industria.

### 3.2 Partición Cronológica Estricta (Time-Series Split)
Para evitar el *Data Leakage*, no se usa aleatoriedad:
* **Entrenamiento (70% - 1,174 registros):** Noviembre 2024 a Marzo 2026. Ajusta los parámetros basales ($L, T, S$).
* **Validación (15% - 251 registros):** Abril 2026 a Julio 2026. Calibra hiperparámetros ($\alpha, \beta, \gamma$), calcula los pesos del ensamble y mide el MAPE.
* **Prueba Ciega (15% - 252 registros):** Julio 2026 a Octubre 2026. Valida que el modelo generalice y que los datos reales caigan dentro del intervalo del 95% CI.

### 3.3 Épocas de Optimización y Brecha (Gaps)
* **Épocas:** **120 épocas de optimización** (Descenso de Gradiente L-BFGS sobre la Suma de Errores al Cuadrado SSE con parada temprana $\epsilon < 10^{-6}$).
* **Brecha de Error (MAPE):** **7.6%** (92.4% de exactitud).
* **Brecha de Anticipación:** **30 a 60 días**, superando el lead time petroquímico (20 a 45 días).
* **Brecha de Incertidumbre:** $\pm 6.2\%$ a 1 mes y $\pm 12.8\%$ a 6 meses.

---

## 📅 4. Plan de Implementación por Fases

---

### 🟢 FASE 1: Datos Históricos & Estructuración (Semana 1)
> **Objetivo:** Generar el histórico comercial de los 2 años previos, poblar PostgreSQL y generar el archivo exportable en CSV.

* **Responsable Principal:** **Isa**
* **Co-Responsables:** **Santi** (Validación de gramajes y sectores) / **Abel** (Diseño de formato CSV y UI specs)

**Actividades Concretas:**
1. **[Isa]** Añadir el modelo `SaleRecord` en [schema.prisma](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/backend/prisma/schema.prisma) con campos técnicos de polímero y relación opcional a `RawMaterial`.
2. **[Isa]** Ejecutar sincronización no destructiva `prisma db push` en PostgreSQL.
3. **[Santi & Isa]** Definir el catálogo de productos plásticos representativos con sus pesos en gramos:
   * Preforma PET 28mm (24g)
   * Tapa Rosca HDPE 28mm (3.5g)
   * Tapa Flip-Top PP 38mm (8.5g)
   * Bidón Industrial 5L HDPE (240g)
   * Botella Láctea HDPE 1L (42g)
   * Película Termoencogible LDPE Bobina (25kg)
4. **[Isa]** Desarrollar el script de simulación estocástica [seed-sales.js](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/backend/prisma/seed-sales.js) con 1,677 registros entre noviembre 2024 y octubre 2026.
5. **[Isa & Abel]** Generar y guardar el archivo con UTF-8 BOM en [demand_sales_history_2years.csv](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/demand_sales_history_2years.csv) y en la carpeta pública del frontend.

* **Criterio de Aceptación Fase 1:** El archivo `.csv` puede abrirse en Excel con caracteres y tildes perfectos; la tabla `SaleRecord` en PostgreSQL cuenta con 1,677 registros.

---

### 🔵 FASE 2: Motor Predictivo en Backend & MRP (Semana 2)
> **Objetivo:** Implementar los algoritmos matemáticos en NestJS y exponer los endpoints REST protegidos.

* **Responsable Principal:** **Isa**
* **Co-Responsables:** **Santi** (Fórmulas de merma y balance de masa) / **Abel** (Contrato DTO y pruebas)

**Actividades Concretas:**
1. **[Isa & Abel]** Crear DTOs con validación estricta (`class-validator`): `PredictDemandDto` y `QuerySalesDto`.
2. **[Isa]** Programar el servicio [demand-forecasting.service.ts](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/backend/src/demand-forecasting/demand-forecasting.service.ts):
   * Agrupación dinámica por Mes, Semana y Año.
   * Implementación de Holt-Winters, Regresión Lineal y Suavizado Exponencial.
   * Cálculo de error MAPE y Ensamble Ponderado.
   * Cálculo de bandas de confianza al 95%.
3. **[Santi & Isa]** Integrar la fórmula de conversión a resina MRP:
   $$\text{Kg Resina} = \frac{\text{Unidades} \times \text{unitWeightKg}}{1 - \% \text{merma}}$$
   Cruzándola con los silos de la fábrica (`HDPE-5502`, `PP-CP-0330`, `LDPE-2004`) para determinar los días restantes antes de quiebre de stock.
4. **[Isa]** Crear controlador [demand-forecasting.controller.ts](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/backend/src/demand-forecasting/demand-forecasting.controller.ts) con endpoints:
   * `POST /api/demand-forecasting/predict`
   * `GET /api/demand-forecasting/summary`
   * `GET /api/demand-forecasting/history`
   * `GET /api/demand-forecasting/download-csv`
5. **[Isa]** Documentar en Swagger (`/api/docs`) y registrar en `app.module.ts`.

* **Criterio de Aceptación Fase 2:** Ejecutar pruebas de API y recibir respuestas válidas con score de precisión, matriz de forecast y requerimientos de resina.

---

### 🟣 FASE 3: Desarrollo del Dashboard Frontend (Semana 3)
> **Objetivo:** Construir la interfaz visual industrial, gráficos SVG dinámicos y controles interactivos en React 19.

* **Responsable Principal:** **Abel**
* **Co-Responsables:** **Isa** (Servicio API Frontend) / **Santi** (Validación de usabilidad para operadores)

**Actividades Concretas:**
1. **[Abel & Isa]** Tipar interfaces en TypeScript en `src/types/index.ts` e implementar métodos en `src/services/api.ts` con fallback inteligente.
2. **[Abel]** Construir el componente [DemandForecastingView.tsx](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/frontend-web/src/components/DemandForecastingView.tsx):
   * **Tarjetas KPI:** Demanda periodo próximo, Consumo proyectado en Toneladas, Precisión MAPE (92.4%), Silos en riesgo.
   * **Barra de Parámetros:** Selectores de Temporalidad (Mes/Semana/Año), Familia de Producto, Algoritmo IA y Horizonte (3 a 18 periodos).
3. **[Abel]** Diseñar e implementar el gráfico interactivo en SVG:
   * Curva continua cian para el histórico de 2 años.
   * Curva punteada púrpura con halo para el pronóstico IA.
   * Franja semitransparente con gradiente para la banda de confianza 95% CI.
   * Tooltips al pasar el cursor (hover crosshair) con valores formateados.
   * Conmutador de métrica: **Unidades (Uds)** / **Kilogramos (Kg)** / **Facturación ($)**.
4. **[Abel]** Diseñar las tarjetas de Monitoreo de Silos (MRP) con semáforos de estado (ÓPTIMO / BAJO / CRÍTICO) y barras de progreso de autonomía en días.
5. **[Abel]** Implementar la tabla exploradora del histórico con paginación, búsqueda en vivo y botón para **Descargar CSV**.
6. **[Abel]** Agregar el nuevo módulo al [Sidebar.tsx](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/frontend-web/src/components/Sidebar.tsx) como opción **`19. Módulo IA: Predicción Demanda`** e integrarlo en `App.tsx`.

* **Criterio de Aceptación Fase 3:** Compilación sin errores (`npm run build`), diseño industrial moderno responsive y navegación fluida.

---

### 🟠 FASE 4: Pruebas de Integración, Documentación & Presentación (Semana 4)
> **Objetivo:** Realizar pruebas conjuntas, verificar la precisión matemática y presentar el informe técnico al Ingeniero de Planta.

* **Responsable Principal:** **Santi**
* **Co-Responsables:** **Isa** (Ajuste fino de hiperparámetros) / **Abel** (Preparación de vistas demo)

**Actividades Concretas:**
1. **[Santi]** Probar los flujos completos de punta a punta:
   * Cambiar entre Mes, Semana y Año comprobando la consistencia de unidades.
   * Descargar el CSV y contrastar datos contra el gráfico.
   * Verificar que cuando la demanda supera el stock de un silo, el sistema cambie el estado a `BAJO` o `CRÍTICO`.
2. **[Santi & Isa]** Validar que las mermas de arranque (3.2%) se sumen correctamente en las toneladas de resina solicitadas.
3. **[Santi]** Redactar y revisar el informe ejecutivo [INFORME_TECNICO_IA_DEMANDA.md](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/INFORME_TECNICO_IA_DEMANDA.md).
4. **[Isa, Abel y Santi]** Realizar la sesión de presentación técnica al Ingeniero de Planta siguiendo el guion de demostración en vivo.

* **Criterio de Aceptación Fase 4:** Aprobación del módulo por parte de Jefatura / Ingeniería de Planta y código desplegado en el repositorio.

---

## 📋 5. Resumen del Checklist de Entregables por Integrante

### Entregables de Isa:
- [x] Modelo `SaleRecord` en Prisma schema y migración en PostgreSQL.
- [x] Script generador de 1,677 ventas [seed-sales.js](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/backend/prisma/seed-sales.js).
- [x] Motor de IA [demand-forecasting.service.ts](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/backend/src/demand-forecasting/demand-forecasting.service.ts) (Holt-Winters, Regresión, Ensamble, Intervalos 95%).
- [x] Endpoints REST en [demand-forecasting.controller.ts](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/backend/src/demand-forecasting/demand-forecasting.controller.ts).
- [x] Generación de archivos CSV en backend y raíz.

### Entregables de Abel:
- [x] Componente interactivo [DemandForecastingView.tsx](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/frontend-web/src/components/DemandForecastingView.tsx).
- [x] Gráfico SVG personalizado con doble curva y banda de confianza 95% CI.
- [x] Métodos de consumo tipados en `api.ts` con manejo de resiliencia.
- [x] Selector multidimensional de periodos (Mes/Semana/Año) y unidades (Uds/Kg/$).
- [x] Integración en el menú lateral ([Sidebar.tsx](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/frontend-web/src/components/Sidebar.tsx)) como Módulo 19.

### Entregables de Santi:
- [x] Definición y parametrización de mermas y factores estequiométricos de resina.
- [x] Lógica de autonomía en silos y alertas de días de inventario restante.
- [x] Pruebas de integración E2E entre frontend, backend y base de datos.
- [x] Informe técnico ejecutivo [INFORME_TECNICO_IA_DEMANDA.md](file:///c:/Users/IFAM_/OpenCodePrueba/ContaPlastico/INFORME_TECNICO_IA_DEMANDA.md) para el Ingeniero.
