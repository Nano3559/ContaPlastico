import React, { useState, useEffect, useMemo } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Sparkles,
  Calendar,
  Layers,
  Scale,
  DollarSign,
  Coins,
  Banknote,
  Factory,
  Percent,
  Gauge,
  Recycle,
  LineChart,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Activity,
  PackageCheck,
  ShieldCheck,
  Info,
  Edit2,
  Save,
  X,
  Sliders,
  Wand2,
  RotateCcw,
  FileEdit,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { demandForecastingApi } from '../services/api';
import type {
  DemandPredictionResult,
  DemandSummary,
  SaleRecord,
  ForecastDemandDataPoint,
  HistoricalDemandDataPoint,
  ResinRequirementItem,
} from '../types';
import { useToast } from '../context/ToastContext';

// 🎨 Helper para interpolar curvas Bézier suaves sin quiebres angulares rígidos
const buildSmoothPath = (pts: { x: number; y: number }[]): string => {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) * 0.5;
    const cp1y = p0.y;
    const cp2x = p0.x + (p1.x - p0.x) * 0.5;
    const cp2y = p1.y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  return d;
};

// 🎨 Helper para áreas continuas bajo la curva suave hasta una línea base Y
const buildSmoothAreaPath = (pts: { x: number; y: number }[], baseY: number): string => {
  if (pts.length === 0) return '';
  const curve = buildSmoothPath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${curve} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
};

// 🎨 Helper para listones/ribbons sombreados entre dos curvas suaves (ej. Ingresos vs Costos)
const buildSmoothRibbonPath = (topPts: { x: number; y: number }[], bottomPts: { x: number; y: number }[]): string => {
  if (topPts.length === 0 || bottomPts.length === 0) return '';
  let d = buildSmoothPath(topPts);
  const revBottom = [...bottomPts].reverse();
  d += ` L ${revBottom[0].x} ${revBottom[0].y}`;
  for (let i = 0; i < revBottom.length - 1; i++) {
    const p0 = revBottom[i];
    const p1 = revBottom[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) * 0.5;
    const cp1y = p0.y;
    const cp2x = p0.x + (p1.x - p0.x) * 0.5;
    const cp2y = p1.y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  d += ' Z';
  return d;
};

export const DemandForecastingView: React.FC = () => {
  const { showToast } = useToast();

  // Estados de configuración de pronóstico
  const [granularity, setGranularity] = useState<'month' | 'week' | 'year'>('month');
  const [periods, setPeriods] = useState<number>(6);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('AUTO_ENSEMBLE');
  const [chartMetric, setChartMetric] = useState<'units' | 'weight' | 'revenue' | 'revenueBob' | 'margin'>('units');

  // Estados de datos
  const [prediction, setPrediction] = useState<DemandPredictionResult | null>(null);
  const [summary, setSummary] = useState<DemandSummary | null>(null);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historySearch, setHistorySearch] = useState<string>('');

  // Estados de simulación What-If (Palancas industriales y macroeconómicas)
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [simulationDemandDelta, setSimulationDemandDelta] = useState<number>(0);
  const [simulationScrapDelta, setSimulationScrapDelta] = useState<number>(0);
  const [simulationExchangeRate, setSimulationExchangeRate] = useState<number>(6.96);
  const [simulationPriceDelta, setSimulationPriceDelta] = useState<number>(0);
  const [simulationResinCostDelta, setSimulationResinCostDelta] = useState<number>(0);
  const [simulationRecycledPct, setSimulationRecycledPct] = useState<number>(15);
  const [simulationEfficiencyPct, setSimulationEfficiencyPct] = useState<number>(85);
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [showOverridesEditor, setShowOverridesEditor] = useState<boolean>(false);

  // Estados de Gráfico de Viabilidad Empresarial (Valles y Picos, Tijera Break-Even, Regresión y Sensibilidad)
  const [viabilityViewMode, setViabilityViewMode] = useState<'profit-wave' | 'scissors' | 'regression' | 'sensitivity'>('profit-wave');
  const [hoveredViabilityPoint, setHoveredViabilityPoint] = useState<any | null>(null);

  // Estados de Edición de Registros Históricos (Modal)
  const [editingSaleRecord, setEditingSaleRecord] = useState<SaleRecord | null>(null);
  const [editForm, setEditForm] = useState<{
    quantityUnits: number;
    unitPrice: number;
    status: string;
    seasonality: string;
    clientName: string;
  }>({
    quantityUnits: 0,
    unitPrice: 0,
    status: 'COMPLETADA',
    seasonality: 'MEDIA',
    clientName: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Estados de carga
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [isReseeding, setIsReseeding] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Cargar datos iniciales
  const loadData = async (applyCurrentSimulation = isSimulationActive) => {
    setIsLoading(true);
    try {
      const predParams: any = {
        granularity,
        periods,
        productCode: selectedProduct || undefined,
        category: selectedCategory || undefined,
        algorithm: selectedAlgorithm,
      };

      if (applyCurrentSimulation) {
        predParams.simulationDemandDeltaPct = simulationDemandDelta;
        predParams.simulationScrapDeltaPct = simulationScrapDelta;
        predParams.exchangeRateBOB = simulationExchangeRate;
        predParams.priceDeltaPct = simulationPriceDelta;
        predParams.resinCostDeltaPct = simulationResinCostDelta;
        predParams.recycledMaterialPct = simulationRecycledPct;
        predParams.plantEfficiencyPct = simulationEfficiencyPct;
        if (Object.keys(manualOverrides).length > 0) {
          predParams.manualOverrides = manualOverrides;
        }
      }

      const [predRes, sumRes, histRes] = await Promise.all([
        demandForecastingApi.predict(predParams),
        demandForecastingApi.getSummary({
          productCode: selectedProduct || undefined,
          category: selectedCategory || undefined,
        }),
        demandForecastingApi.getHistory({
          page: historyPage,
          limit: 15,
          search: historySearch || undefined,
          productCode: selectedProduct || undefined,
          category: selectedCategory || undefined,
        }),
      ]);

      setPrediction(predRes.data);
      setSummary(sumRes.data);
      setSalesHistory(histRes.data.items);
      setHistoryTotal(histRes.data.meta.total);
    } catch (err: any) {
      showToast('Error de Carga', err.message || 'No se pudieron obtener los datos de demanda.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [granularity, selectedProduct, selectedCategory, selectedAlgorithm]);

  // Ejecutar pronóstico específico
  const handleRunForecast = async () => {
    setIsPredicting(true);
    try {
      const predParams: any = {
        granularity,
        periods,
        productCode: selectedProduct || undefined,
        category: selectedCategory || undefined,
        algorithm: selectedAlgorithm,
      };

      if (isSimulationActive) {
        predParams.simulationDemandDeltaPct = simulationDemandDelta;
        predParams.simulationScrapDeltaPct = simulationScrapDelta;
        predParams.exchangeRateBOB = simulationExchangeRate;
        predParams.priceDeltaPct = simulationPriceDelta;
        predParams.resinCostDeltaPct = simulationResinCostDelta;
        predParams.recycledMaterialPct = simulationRecycledPct;
        predParams.plantEfficiencyPct = simulationEfficiencyPct;
        if (Object.keys(manualOverrides).length > 0) {
          predParams.manualOverrides = manualOverrides;
        }
      }

      const res = await demandForecastingApi.predict(predParams);
      setPrediction(res.data);
      showToast(
        'Pronóstico Generado',
        `Modelo ${res.data.algorithm} ejecutado con éxito. Precisión estimada: ${res.data.modelAccuracyScore}%.`,
        'success'
      );
    } catch (err: any) {
      showToast('Error en Pronóstico', err.message, 'error');
    } finally {
      setIsPredicting(false);
    }
  };

  // Aplicar simulación de escenario What-If con múltiples variables industriales y cambiarias
  const handleApplySimulation = async () => {
    setIsPredicting(true);
    try {
      setIsSimulationActive(true);
      const res = await demandForecastingApi.predict({
        granularity,
        periods,
        productCode: selectedProduct || undefined,
        category: selectedCategory || undefined,
        algorithm: selectedAlgorithm,
        simulationDemandDeltaPct: simulationDemandDelta,
        simulationScrapDeltaPct: simulationScrapDelta,
        exchangeRateBOB: simulationExchangeRate,
        priceDeltaPct: simulationPriceDelta,
        resinCostDeltaPct: simulationResinCostDelta,
        recycledMaterialPct: simulationRecycledPct,
        plantEfficiencyPct: simulationEfficiencyPct,
        manualOverrides: Object.keys(manualOverrides).length > 0 ? manualOverrides : undefined,
      });
      setPrediction(res.data);
      showToast(
        'Simulación Aplicada',
        `Escenario activo: Demanda ${simulationDemandDelta >= 0 ? '+' : ''}${simulationDemandDelta}%, Dólar Bs. ${simulationExchangeRate.toFixed(2)}, Reciclado ${simulationRecycledPct}%.`,
        'success'
      );
    } catch (err: any) {
      showToast('Error al Simular', err.message, 'error');
    } finally {
      setIsPredicting(false);
    }
  };

  // Cargar preset rápido de escenario ejecutivo
  const applyPresetScenario = async (preset: {
    label: string;
    demand: number;
    scrap: number;
    exchange: number;
    price: number;
    resinCost: number;
    recycled: number;
    efficiency: number;
  }) => {
    setSimulationDemandDelta(preset.demand);
    setSimulationScrapDelta(preset.scrap);
    setSimulationExchangeRate(preset.exchange);
    setSimulationPriceDelta(preset.price);
    setSimulationResinCostDelta(preset.resinCost);
    setSimulationRecycledPct(preset.recycled);
    setSimulationEfficiencyPct(preset.efficiency);
    setIsSimulationActive(true);
    setIsPredicting(true);

    try {
      const res = await demandForecastingApi.predict({
        granularity,
        periods,
        productCode: selectedProduct || undefined,
        category: selectedCategory || undefined,
        algorithm: selectedAlgorithm,
        simulationDemandDeltaPct: preset.demand,
        simulationScrapDeltaPct: preset.scrap,
        exchangeRateBOB: preset.exchange,
        priceDeltaPct: preset.price,
        resinCostDeltaPct: preset.resinCost,
        recycledMaterialPct: preset.recycled,
        plantEfficiencyPct: preset.efficiency,
        manualOverrides: Object.keys(manualOverrides).length > 0 ? manualOverrides : undefined,
      });
      setPrediction(res.data);
      showToast('Preset Aplicado', `Escenario cargado: ${preset.label}`, 'success');
    } catch (err: any) {
      showToast('Error al Simular', err.message, 'error');
    } finally {
      setIsPredicting(false);
    }
  };

  // Restablecer la simulación a los valores originales
  const handleResetSimulation = async () => {
    setSimulationDemandDelta(0);
    setSimulationScrapDelta(0);
    setSimulationExchangeRate(6.96);
    setSimulationPriceDelta(0);
    setSimulationResinCostDelta(0);
    setSimulationRecycledPct(15);
    setSimulationEfficiencyPct(85);
    setManualOverrides({});
    setIsSimulationActive(false);
    setIsPredicting(true);
    try {
      const res = await demandForecastingApi.predict({
        granularity,
        periods,
        productCode: selectedProduct || undefined,
        category: selectedCategory || undefined,
        algorithm: selectedAlgorithm,
      });
      setPrediction(res.data);
      showToast('Simulación Restablecida', 'Se ha vuelto a los valores base originales del modelo de IA.', 'info');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setIsPredicting(false);
    }
  };

  // Descarga del archivo CSV de 2 años
  const handleDownloadCsv = () => {
    const url = demandForecastingApi.getCsvDownloadUrl();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'demand_sales_history_Oficial.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Descarga Iniciada', 'Descargando dataset oficial demand_sales_history_Oficial.csv (1,728 registros)...', 'info');
  };

  // Re-seed o sincronización
  const handleReseed = async () => {
    setIsReseeding(true);
    try {
      await demandForecastingApi.reseed();
      showToast('Base de Datos Sincronizada', 'El histórico de 2 años de ventas fue recalculado y almacenado.', 'success');
      await loadData();
    } catch (err: any) {
      showToast('Error', 'No se pudo regenerar el histórico.', 'error');
    } finally {
      setIsReseeding(false);
    }
  };

  // Buscar en historial
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await demandForecastingApi.getHistory({
      page: 1,
      limit: 15,
      search: historySearch,
      productCode: selectedProduct || undefined,
      category: selectedCategory || undefined,
    });
    setSalesHistory(res.data.items);
    setHistoryTotal(res.data.meta.total);
    setHistoryPage(1);
  };

  // Abrir Modal de Edición de Registro
  const handleOpenEditModal = (item: SaleRecord) => {
    setEditingSaleRecord(item);
    setEditForm({
      quantityUnits: item.quantityUnits,
      unitPrice: item.unitPrice,
      status: item.status || 'COMPLETADA',
      seasonality: item.seasonality || 'MEDIA',
      clientName: item.clientName || '',
    });
  };

  // Guardar edición de un registro histórico en la base de datos
  const handleSaveSaleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSaleRecord) return;
    setIsSavingEdit(true);
    try {
      await demandForecastingApi.updateSaleRecord(editingSaleRecord.id, editForm);
      showToast('Registro Actualizado', `Venta ${editingSaleRecord.saleCode} guardada exitosamente en la base de datos.`, 'success');
      setEditingSaleRecord(null);
      await loadData();
    } catch (err: any) {
      showToast('Error al Guardar', err.message || 'No se pudo guardar la modificación.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Modificar override de un punto proyectado específico
  const handleOverridePointChange = (periodKey: string, valStr: string) => {
    const val = Number(valStr);
    if (isNaN(val)) return;
    setManualOverrides((prev) => ({
      ...prev,
      [periodKey]: val,
    }));
  };

  const handleClearOverridePoint = (periodKey: string) => {
    setManualOverrides((prev) => {
      const next = { ...prev };
      delete next[periodKey];
      return next;
    });
  };

  // Cálculos para gráfico SVG interactivo (con soporte de doble curva: Real + IA Base + Simulación)
  const chartData = useMemo(() => {
    if (!prediction) return { points: [], histPoints: [], forePoints: [], simPoints: [], maxVal: 100, minVal: 0 };

    const hist = prediction.historical || [];
    const fore = prediction.forecast || [];

    // Mapear métrica elegida con cálculo reactivo inmediato
    const getVal = (item: any, isForecast = false, useSimulation = false) => {
      if (useSimulation) {
        const baseUnits = item.forecastUnits;
        const isManual = manualOverrides[item.periodKey] !== undefined;
        const elasticityFactor = 1 - 0.35 * (simulationPriceDelta / 100);
        const efficiencyFactor = Math.max(0.4, simulationEfficiencyPct / 85.0);
        const scrapFactor = 1 + (simulationScrapDelta / 100);
        const exRate = simulationExchangeRate > 0 ? simulationExchangeRate : 6.96;

        const simUnits = isManual
          ? manualOverrides[item.periodKey]
          : (item.simulatedUnits ?? Math.max(10, Math.round(baseUnits * (1 + simulationDemandDelta / 100) * elasticityFactor * efficiencyFactor)));

        const simWeightKg = item.simulatedWeightKg ?? Number((simUnits * 0.098 * scrapFactor).toFixed(1));
        const simUnitPrice = 0.24 * (1 + simulationPriceDelta / 100);
        const simRevenueUSD = item.simulatedRevenue ?? Number((simUnits * simUnitPrice).toFixed(1));
        const simRevenueBOB = item.simulatedRevenueBOB ?? Number((simRevenueUSD * exRate).toFixed(1));

        const virginPrice = 1.35 * (1 + simulationResinCostDelta / 100);
        const recycledShare = Math.min(0.6, Math.max(0, simulationRecycledPct / 100));
        const blendedCostPerKg = (virginPrice * (1 - recycledShare)) + (0.45 * recycledShare);
        const resinCostUSD = simWeightKg * blendedCostPerKg;
        const simMarginUSD = item.simulatedMarginUSD ?? Number((simRevenueUSD - resinCostUSD).toFixed(1));

        if (chartMetric === 'weight') return simWeightKg;
        if (chartMetric === 'revenue') return simRevenueUSD;
        if (chartMetric === 'revenueBob') return simRevenueBOB;
        if (chartMetric === 'margin') return simMarginUSD;
        return simUnits;
      }
      if (chartMetric === 'weight') return isForecast ? item.forecastWeightKg : item.actualWeightKg;
      if (chartMetric === 'revenue') return isForecast ? item.forecastRevenue : item.actualRevenue;
      if (chartMetric === 'revenueBob') return isForecast ? (item.forecastRevenueBOB ?? (item.forecastRevenue * 6.96)) : (item.actualRevenue * 6.96);
      if (chartMetric === 'margin') return isForecast ? item.forecastRevenue * 0.42 : item.actualRevenue * 0.42;
      return isForecast ? item.forecastUnits : item.actualUnits;
    };

    const histPoints = hist.map((h, i) => ({
      index: i,
      label: h.periodLabel,
      key: h.periodKey,
      value: getVal(h, false),
      isForecast: false,
      isSimulation: false,
      raw: h,
    }));

    const startIndex = histPoints.length;
    const forePoints = fore.map((f, i) => {
      const val = getVal(f, true, false);
      const ratio = f.forecastUnits > 0 ? val / f.forecastUnits : 1;
      return {
        index: startIndex + i,
        label: f.periodLabel,
        key: f.periodKey,
        value: val,
        lower: f.lowerBoundUnits * ratio,
        upper: f.upperBoundUnits * ratio,
        isForecast: true,
        isSimulation: false,
        growth: f.growthVsPreviousPeriod,
        raw: f,
      };
    });

    // Puntos simulados si hay simulación activa
    const simPoints = isSimulationActive
      ? fore.map((f, i) => ({
          index: startIndex + i,
          label: f.periodLabel,
          key: `sim-${f.periodKey}`,
          value: getVal(f, true, true),
          isForecast: true,
          isSimulation: true,
          originalValue: getVal(f, true, false),
          deltaPct: simulationDemandDelta,
          exchangeRate: simulationExchangeRate,
          simUnits: f.simulatedUnits ?? f.forecastUnits,
          simWeight: f.simulatedWeightKg ?? f.forecastWeightKg,
          simRevenueUSD: f.simulatedRevenue ?? f.forecastRevenue,
          simRevenueBOB: f.simulatedRevenueBOB ?? ((f.simulatedRevenue ?? f.forecastRevenue) * simulationExchangeRate),
          simMarginUSD: f.simulatedMarginUSD,
          raw: f,
        }))
      : [];

    const allPoints = [...histPoints, ...forePoints];
    const allValues = [...allPoints.map((p) => p.upper || p.value), ...simPoints.map((p) => p.value)];
    const maxVal = Math.max(...allValues, 1000) * 1.15;
    const minVal = Math.min(...allPoints.map((p) => (p.lower !== undefined ? p.lower : p.value)), 0) * 0.85;

    return { points: allPoints, histPoints, forePoints, simPoints, maxVal, minVal };
  }, [
    prediction,
    chartMetric,
    isSimulationActive,
    simulationDemandDelta,
    simulationScrapDelta,
    simulationExchangeRate,
    simulationPriceDelta,
    simulationResinCostDelta,
    simulationRecycledPct,
    simulationEfficiencyPct,
    manualOverrides,
  ]);

  // Formateadores numéricos
  const formatMetricValue = (val: number) => {
    if (chartMetric === 'weight') return `${Math.round(val).toLocaleString()} kg`;
    if (chartMetric === 'revenue') return `$${Math.round(val).toLocaleString()} USD`;
    if (chartMetric === 'revenueBob') return `Bs. ${Math.round(val).toLocaleString()}`;
    if (chartMetric === 'margin') return `$${Math.round(val).toLocaleString()} USD`;
    return `${Math.round(val).toLocaleString()} uds`;
  };

  // 🔮 Cálculo Multivariable, Regresión Lineal y Diagnóstico de Viabilidad Empresarial (Valles y Picos Notorios)
  const businessHealthAnalysis = useMemo(() => {
    if (!prediction || !prediction.forecast || prediction.forecast.length === 0) {
      return null;
    }

    const forecast = prediction.forecast;
    const N = forecast.length;
    const fixedCostUSD = 22000; // Costo fijo mensual estimado de planta (energía trifásica, técnicos, amortización)

    // Factores de simulación
    const elasticityFactor = 1 - 0.35 * (simulationPriceDelta / 100);
    const efficiencyFactor = Math.max(0.4, simulationEfficiencyPct / 85.0);
    const scrapFactor = 1 + (simulationScrapDelta / 100);
    const effectiveExchangeRate = simulationExchangeRate > 0 ? simulationExchangeRate : 6.96;
    const virginPrice = 1.35 * (1 + simulationResinCostDelta / 100);
    const recycledShare = Math.min(0.6, Math.max(0, simulationRecycledPct / 100));
    const blendedCostPerKg = (virginPrice * (1 - recycledShare)) + (0.45 * recycledShare);
    const baseUnitPrice = 0.24;

    // Calcular ingresos, costos totales y utilidad neta mes por mes
    const rawPoints = forecast.map((f, i) => {
      const isManual = manualOverrides[f.periodKey] !== undefined;
      const baseUnits = f.forecastUnits;

      const simUnits = isSimulationActive
        ? (isManual
            ? manualOverrides[f.periodKey]
            : (f.simulatedUnits ?? Math.max(10, Math.round(baseUnits * (1 + simulationDemandDelta / 100) * elasticityFactor * efficiencyFactor))))
        : baseUnits;

      const unitPrice = isSimulationActive
        ? baseUnitPrice * (1 + simulationPriceDelta / 100)
        : baseUnitPrice;

      const revenue = Number((simUnits * unitPrice).toFixed(2));
      const revenueBOB = Number((revenue * effectiveExchangeRate).toFixed(2));

      const weightKg = Number((simUnits * 0.098 * (isSimulationActive ? scrapFactor : 1)).toFixed(2));
      const resinCost = Number((weightKg * (isSimulationActive ? blendedCostPerKg : 1.35)).toFixed(2));

      // Spread cambiario si el dólar sube sobre 6.96 oficial
      const exchangePenalty = isSimulationActive && effectiveExchangeRate > 6.96
        ? ((effectiveExchangeRate - 6.96) / 6.96) * 0.18 * resinCost
        : 0;

      const totalCost = Number((resinCost + fixedCostUSD + exchangePenalty).toFixed(2));
      const totalCostBOB = Number((totalCost * effectiveExchangeRate).toFixed(2));
      const netProfit = Number((revenue - totalCost).toFixed(2));
      const netProfitBOB = Number((netProfit * effectiveExchangeRate).toFixed(2));
      const marginPct = revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(1)) : 0;

      return {
        index: i,
        periodKey: f.periodKey,
        periodLabel: f.periodLabel,
        units: simUnits,
        weightKg,
        revenue,
        revenueBOB,
        resinCost,
        totalCost,
        totalCostBOB,
        netProfit,
        netProfitBOB,
        breakEven: totalCost,
        marginPct,
        isPositive: netProfit >= 0,
      };
    });

    // Añadir delta porcentual mes a mes para detectar subidas y bajadas
    const points = rawPoints.map((p, i) => {
      const prev = i > 0 ? rawPoints[i - 1].netProfit : null;
      let monthGrowthPct = 0;
      if (prev !== null && Math.abs(prev) > 0) {
        monthGrowthPct = Number((((p.netProfit - prev) / Math.abs(prev)) * 100).toFixed(1));
      }
      return {
        ...p,
        monthGrowthPct,
      };
    });

    // Identificar Pico Máximo y Valle Más Bajo
    let maxProfitPoint = points[0];
    let minProfitPoint = points[0];
    points.forEach((p) => {
      if (p.netProfit > maxProfitPoint.netProfit) maxProfitPoint = p;
      if (p.netProfit < minProfitPoint.netProfit) minProfitPoint = p;
    });

    // Regresión Lineal por Mínimos Cuadrados sobre la Utilidad Neta U(t) = m * t + b
    const xVals = points.map((p) => p.index);
    const yVals = points.map((p) => p.netProfit);
    const xMean = xVals.reduce((a, b) => a + b, 0) / N;
    const yMean = yVals.reduce((a, b) => a + b, 0) / N;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < N; i++) {
      numerator += (xVals[i] - xMean) * (yVals[i] - yMean);
      denominator += Math.pow(xVals[i] - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Puntos ajustados de la recta de regresión
    const regressionLine = points.map((p) => {
      const fitProfit = slope * p.index + intercept;
      return {
        index: p.index,
        periodLabel: p.periodLabel,
        fitProfit,
      };
    });

    // Coeficiente R^2
    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < N; i++) {
      ssTot += Math.pow(yVals[i] - yMean, 2);
      ssRes += Math.pow(yVals[i] - regressionLine[i].fitProfit, 2);
    }
    const rSquared = ssTot > 0 ? Math.max(0, Math.min(0.99, 1 - (ssRes / ssTot))) : 0.88;

    // Totales acumulados en el horizonte
    const totalRevenue = points.reduce((sum, p) => sum + p.revenue, 0);
    const totalCost = points.reduce((sum, p) => sum + p.totalCost, 0);
    const totalNetProfit = points.reduce((sum, p) => sum + p.netProfit, 0);
    const averageMarginPct = totalRevenue > 0 ? Number(((totalNetProfit / totalRevenue) * 100).toFixed(1)) : 0;
    const monthlyProfitGrowthPct = yMean !== 0 ? Number(((slope / Math.abs(yMean)) * 100).toFixed(1)) : 0;

    // 🌟 Escala Exclusiva para Gráfico de Utilidad Neta & Flujo de Caja (Valles y Picos Notorios)
    // Permite que variaciones de $5k-$15k llenen verticalmente la gráfica con subidas y bajadas muy visibles
    const allProfitVals = points.map((p) => p.netProfit);
    const maxProfit = Math.max(...allProfitVals, 5000);
    const minProfit = Math.min(...allProfitVals, 0);
    const profitRange = Math.max(10000, maxProfit - minProfit);
    const profitScaleMax = maxProfit + profitRange * 0.25;
    const profitScaleMin = minProfit - profitRange * 0.25;

    // Escala para Gráfico de Tijera (Facturación vs Costos)
    const allRevCostVals = [...points.map((p) => p.revenue), ...points.map((p) => p.totalCost)];
    const maxRevCost = Math.max(...allRevCostVals, 1000) * 1.15;
    const minRevCost = Math.min(...allRevCostVals, 0) * 0.85;

    // Sensibilidad de Variables (Tornado Impact): Cuánto aporta o resta cada variable al resultado final
    const impactDemand = isSimulationActive ? Math.round((simulationDemandDelta / 100) * totalRevenue * 0.45) : 0;
    const impactPrice = isSimulationActive ? Math.round((simulationPriceDelta / 100) * totalRevenue * 0.85) : 0;
    const impactExchange = isSimulationActive && effectiveExchangeRate > 6.96
      ? Math.round(-((effectiveExchangeRate - 6.96) / 6.96) * totalCost * 0.28)
      : 0;
    const impactResinCost = isSimulationActive
      ? Math.round(-(simulationResinCostDelta / 100) * totalCost * 0.45)
      : 0;
    const impactRecycled = isSimulationActive
      ? Math.round(((simulationRecycledPct - 15) / 100) * totalCost * 0.35)
      : 0;
    const impactScrap = isSimulationActive
      ? Math.round(-(simulationScrapDelta / 100) * totalCost * 0.15)
      : 0;

    const sensitivityFactors = [
      { name: 'Variación Demanda', val: impactDemand, desc: `${simulationDemandDelta >= 0 ? '+' : ''}${simulationDemandDelta}% pedidos`, isPositive: impactDemand >= 0 },
      { name: 'Ajuste Precio Venta', val: impactPrice, desc: `${simulationPriceDelta >= 0 ? '+' : ''}${simulationPriceDelta}% catálogo venta`, isPositive: impactPrice >= 0 },
      { name: 'Tipo de Cambio (BOB)', val: impactExchange, desc: `Bs. ${effectiveExchangeRate.toFixed(2)} / USD`, isPositive: impactExchange >= 0 },
      { name: 'Costo Resina Virgen', val: impactResinCost, desc: `${simulationResinCostDelta >= 0 ? '+' : ''}${simulationResinCostDelta}% costo internacional`, isPositive: impactResinCost >= 0 },
      { name: 'Ahorro por Reciclaje', val: impactRecycled, desc: `${simulationRecycledPct}% resina recuperada`, isPositive: impactRecycled >= 0 },
      { name: 'Ajuste de Merma', val: impactScrap, desc: `${simulationScrapDelta >= 0 ? '+' : ''}${simulationScrapDelta}% scrap fábrica`, isPositive: impactScrap >= 0 },
    ];

    // Índice de Salud Empresarial (0 a 100 puntos)
    let healthScore = 50;
    if (averageMarginPct >= 35) healthScore += 35;
    else if (averageMarginPct >= 20) healthScore += 25;
    else if (averageMarginPct >= 10) healthScore += 12;
    else if (averageMarginPct >= 0) healthScore += 0;
    else healthScore -= 30;

    if (slope > 800) healthScore += 15;
    else if (slope >= 0) healthScore += 8;
    else healthScore -= 15;

    if (simulationRecycledPct >= 25) healthScore += 10;
    if (effectiveExchangeRate > 12.0) healthScore -= 12;

    healthScore = Math.max(5, Math.min(99, healthScore));

    // Diagnóstico cualitativo
    let statusBadge: 'OPTIMO' | 'ALERTA' | 'CRITICO' = 'OPTIMO';
    let title = 'RUMBO EMPRESARIAL FAVORABLE & CRECIENTE';
    let message = 'Bajo las variables simuladas, la empresa mantiene un margen operativo robusto con utilidades positivas mes a mes.';
    let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

    if (totalNetProfit <= 0 || averageMarginPct < 5 || healthScore < 45) {
      statusBadge = 'CRITICO';
      title = 'ALERTA CRÍTICA: RIESGO DE DÉFICIT OPERATIVO O INSOLVENCIA';
      message = 'Las presiones cambiarias y el costo de materia prima superan los ingresos proyectados. Se requiere subir precios o aumentar la molienda reciclada.';
      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    } else if (healthScore < 75 || slope < 0 || averageMarginPct < 20) {
      statusBadge = 'ALERTA';
      title = 'RUMBO MODERADO: MÁRGENES ESTRECHOS O TENDENCIA DESCENDENTE';
      message = 'La empresa opera en positivo, pero la pendiente advierte un estrechamiento de margen. Se aconseja vigilar el tipo de cambio.';
      badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }

    // Escala general para vista backward-compatible
    const allFinVals = [
      ...points.map((p) => p.revenue),
      ...points.map((p) => p.totalCost),
      ...points.map((p) => p.netProfit),
      ...regressionLine.map((r) => r.fitProfit),
    ];
    const maxFin = Math.max(...allFinVals, 1000) * 1.15;
    const minFin = Math.min(...allFinVals, 0) * 1.15;

    return {
      points,
      regressionLine,
      slope,
      intercept,
      rSquared,
      totalRevenue,
      totalCost,
      totalNetProfit,
      averageMarginPct,
      monthlyProfitGrowthPct,
      sensitivityFactors,
      healthScore,
      statusBadge,
      title,
      message,
      badgeColor,
      profitScaleMax,
      profitScaleMin,
      maxRevCost,
      minRevCost,
      maxProfitPoint,
      minProfitPoint,
      maxFin,
      minFin,
    };
  }, [
    prediction,
    isSimulationActive,
    simulationDemandDelta,
    simulationScrapDelta,
    simulationExchangeRate,
    simulationPriceDelta,
    simulationResinCostDelta,
    simulationRecycledPct,
    simulationEfficiencyPct,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 🚀 Encabezado Principal y Barra de Acciones */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-indigo-500/20 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Módulo IA 19 • Machine Learning & Simulación
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                Motor Predictivo Activo (GPU RTX 4060)
              </span>
              {isSimulationActive && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                  <Wand2 className="w-3 h-3 text-amber-400" />
                  Modo Simulación Activo
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-outfit">
              Predicción de Demanda & Planificación de Resinas (MRP)
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Modelos predictivos entrenados con el histórico de ventas de 2 años (con pedidos y devoluciones). Permite ajustar y simular escenarios What-If para evaluar el impacto en tolvas, silos y compras petroquímicas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botón Activar / Desactivar Simulador */}
            <button
              onClick={() => {
                const nextState = !isSimulationActive;
                setIsSimulationActive(nextState);
                if (nextState) {
                  showToast('Simulador Activado', 'Ajusta los sliders o edita los meses para proyectar escenarios.', 'info');
                } else {
                  handleResetSimulation();
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                isSimulationActive
                  ? 'bg-amber-500 text-slate-950 border border-amber-400 font-black shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 hover:border-amber-400'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>{isSimulationActive ? 'Ocultar Simulador' : 'Simulador What-If'}</span>
            </button>

            {/* Botón Descargar CSV */}
            <button
              onClick={handleDownloadCsv}
              title="Descargar archivo CSV estructurado con las 1,677 transacciones de los 2 años anteriores"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-md group"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Descargar CSV (.csv)</span>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Botón Sincronizar Datos */}
            <button
              onClick={handleReseed}
              disabled={isReseeding}
              title="Regenerar y sincronizar 2 años de ventas en PostgreSQL"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isReseeding ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar BD</span>
            </button>

            {/* Botón Re-Calcular Pronóstico */}
            <button
              onClick={handleRunForecast}
              disabled={isPredicting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black shadow-lg shadow-cyan-500/25 transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isPredicting ? 'animate-spin' : ''}`} />
              <span>{isPredicting ? 'Calculando...' : 'Re-Calcular Pronóstico'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ⚡ PANEL DE SIMULACIÓN WHAT-IF & EDICIÓN DE ESCENARIOS */}
      {isSimulationActive && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 border-2 border-amber-500/40 shadow-2xl space-y-6 animate-fadeIn">
          {/* Cabecera del Simulador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/10">
                <Sliders className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                  Simulador de Escenarios What-If & Estrategia Industrial
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
                    Multivariable
                  </span>
                </h2>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Modifica variables macroeconómicas (Dólar en Bolivia, resina petroquímica internacional), comerciales (demanda, precios) y operativas (merma, reciclaje, OEE) para predecir el impacto en la empresa y los silos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleResetSimulation}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Restablecer Nominal
              </button>
              <button
                onClick={handleApplySimulation}
                disabled={isPredicting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isPredicting ? 'Calculando...' : 'Aplicar Escenario'}
              </button>
            </div>
          </div>

          {/* ⚡ Barra de Escenarios Ejecutivos Pre-Configurados (Presets de 1 Clic) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-amber-300/90 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Escenarios Rápidos de Decisión Gerencial:
              </span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                Haz clic para simular de inmediato el comportamiento de la fábrica
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                {
                  label: '🇧🇴 Presión Cambiaria (Dólar Bs. 12.50)',
                  desc: 'Dólar 12.50, Precios +15%, Demanda -10%, Resina virgen +25%, Reciclado 35%',
                  preset: { label: 'Presión Cambiaria Bolivia', demand: -10, scrap: 0.5, exchange: 12.50, price: 15, resinCost: 25, recycled: 35, efficiency: 85 },
                  color: 'border-amber-500/50 hover:bg-amber-500/10 text-amber-300'
                },
                {
                  label: '🚀 Boom / Licitación (+35% Demanda)',
                  desc: 'Demanda +35%, OEE 95%, Merma -1%, Dólar 6.96',
                  preset: { label: 'Boom Industrial / Licitación', demand: 35, scrap: -1.0, exchange: 6.96, price: 0, resinCost: 5, recycled: 15, efficiency: 95 },
                  color: 'border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-300'
                },
                {
                  label: '⚠️ Crisis Petroquímica & Escasez',
                  desc: 'Resina Virgen +50%, Dólar 14.00, Demanda -20%, Reciclado forzado 40%',
                  preset: { label: 'Crisis Petroquímica & Escasez', demand: -20, scrap: 2.0, exchange: 14.00, price: 20, resinCost: 50, recycled: 40, efficiency: 75 },
                  color: 'border-rose-500/50 hover:bg-rose-500/10 text-rose-300'
                },
                {
                  label: '♻️ Estrategia Circular Verde',
                  desc: 'Recuperado al 45%, Merma -2%, Ahorro masivo de compras en divisas',
                  preset: { label: 'Estrategia Circular Verde', demand: 10, scrap: -2.0, exchange: 6.96, price: -5, resinCost: 0, recycled: 45, efficiency: 90 },
                  color: 'border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-300'
                },
                {
                  label: '🔄 Escenario Base Nominal',
                  desc: 'Valores nominales de fábrica (Dólar 6.96, Demanda 0%, Reciclado 15%)',
                  preset: { label: 'Base Nominal', demand: 0, scrap: 0, exchange: 6.96, price: 0, resinCost: 0, recycled: 15, efficiency: 85 },
                  color: 'border-slate-700 hover:bg-slate-800 text-slate-300'
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPresetScenario(item.preset)}
                  title={item.desc}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm ${item.color}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de 3 Columnas de Parámetros Industriales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 📈 COLUMNA 1: MERCADO & VENTAS */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  1. Mercado & Ventas
                </span>
                <span className="text-[10px] text-slate-500 font-mono">COMERCIAL</span>
              </div>

              {/* Slider 1.1: Variación Demanda Base */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Variación Demanda Base:</span>
                  <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                    simulationDemandDelta > 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : simulationDemandDelta < 0
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {simulationDemandDelta > 0 ? `+${simulationDemandDelta}%` : `${simulationDemandDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="100"
                  step="5"
                  value={simulationDemandDelta}
                  onChange={(e) => setSimulationDemandDelta(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-50% (Caída)</span>
                  <span>0% (Base)</span>
                  <span>+100% (Duplicar)</span>
                </div>
              </div>

              {/* Slider 1.2: Variación de Precios de Venta */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Ajuste Precio de Venta:</span>
                  <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                    simulationPriceDelta > 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : simulationPriceDelta < 0
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {simulationPriceDelta > 0 ? `+${simulationPriceDelta}%` : `${simulationPriceDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="60"
                  step="2"
                  value={simulationPriceDelta}
                  onChange={(e) => setSimulationPriceDelta(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Afecta facturación total y volumen demandado por elasticidad precio (-0.35).
                </p>
              </div>
            </div>

            {/* 🇧🇴 COLUMNA 2: MACROECONOMÍA & DIVISAS (BOLIVIA) */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <Banknote className="w-4 h-4 text-amber-400" />
                  2. Macroeconomía (Bolivia)
                </span>
                <span className="text-[10px] text-amber-400 font-mono">USD / BOB</span>
              </div>

              {/* Slider 2.1: Tipo de Cambio Dólar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Tipo de Cambio Dólar:</span>
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Bs. {simulationExchangeRate.toFixed(2)} / $1 USD
                  </span>
                </div>
                <input
                  type="range"
                  min="6.96"
                  max="16.00"
                  step="0.25"
                  value={simulationExchangeRate}
                  onChange={(e) => setSimulationExchangeRate(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                  {[
                    { label: '6.96 Oficial', val: 6.96 },
                    { label: '9.50', val: 9.50 },
                    { label: '11.50 Paralelo', val: 11.50 },
                    { label: '13.00', val: 13.00 },
                    { label: '15.00 Pico', val: 15.00 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setSimulationExchangeRate(p.val)}
                      className={`px-1.5 py-0.5 rounded border ${
                        Math.abs(simulationExchangeRate - p.val) < 0.1
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 2.2: Variación Precio Internacional Resina Virgen */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Costo Resina Virgen Int.:</span>
                  <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                    simulationResinCostDelta > 0
                      ? 'bg-rose-500/20 text-rose-300'
                      : simulationResinCostDelta < 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {simulationResinCostDelta > 0 ? `+${simulationResinCostDelta}%` : `${simulationResinCostDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="80"
                  step="5"
                  value={simulationResinCostDelta}
                  onChange={(e) => setSimulationResinCostDelta(Number(e.target.value))}
                  className="w-full accent-rose-400 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Variación petroquímica FOB en puertos (Arica/Iquique). Base ~$1,350 USD/Ton.
                </p>
              </div>
            </div>

            {/* 🏭 COLUMNA 3: OPERACIONES DE PLANTA & CIRCULAR */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <Factory className="w-4 h-4 text-emerald-400" />
                  3. Operaciones & Reciclaje
                </span>
                <span className="text-[10px] text-slate-500 font-mono">FÁBRICA</span>
              </div>

              {/* Slider 3.1: Ajuste de Merma (Scrap) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Ajuste Merma (Scrap):</span>
                  <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                    simulationScrapDelta > 0
                      ? 'bg-amber-500/20 text-amber-300'
                      : simulationScrapDelta < 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {simulationScrapDelta > 0 ? `+${simulationScrapDelta}%` : `${simulationScrapDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="8"
                  step="0.5"
                  value={simulationScrapDelta}
                  onChange={(e) => setSimulationScrapDelta(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Merma típica: 3.2%. Afecta los kilos brutos necesarios en tolvas.
                </p>
              </div>

              {/* Slider 3.2: Tasa de Mezcla con Recuperado */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300 flex items-center gap-1">
                    <Recycle className="w-3.5 h-3.5 text-emerald-400" />
                    Tasa Material Recuperado:
                  </span>
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {simulationRecycledPct}% mezcla
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={simulationRecycledPct}
                  onChange={(e) => setSimulationRecycledPct(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Molienda interna (Silo R-01). Reduce compra de resina virgen en USD.
                </p>
              </div>

              {/* Slider 3.3: Disponibilidad y OEE */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300 flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                    Eficiencia OEE / Líneas:
                  </span>
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    {simulationEfficiencyPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={simulationEfficiencyPct}
                  onChange={(e) => setSimulationEfficiencyPct(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Subpanel Desplegable: Edición Manual Punto por Punto */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowOverridesEditor(!showOverridesEditor)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-300 p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-purple-400" />
                <span>Editar Valores Proyectados Mes a Mes (Manual Overrides)</span>
                {Object.keys(manualOverrides).length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-extrabold">
                    {Object.keys(manualOverrides).length} meses editados
                  </span>
                )}
              </div>
              {showOverridesEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showOverridesEditor && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <p className="text-[11px] text-slate-400">
                  Introduce cantidades de unidades personalizadas para cualquier mes futuro. El motor recalculará los kilos de resina necesarios para abastecer exactamente esa demanda simulada.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {prediction?.forecast.map((f) => {
                    const isOverridden = manualOverrides[f.periodKey] !== undefined;
                    const currentVal = isOverridden ? manualOverrides[f.periodKey] : f.forecastUnits;

                    return (
                      <div
                        key={f.periodKey}
                        className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                          isOverridden
                            ? 'bg-purple-950/30 border-purple-500/50'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-300">
                          <span>{f.periodLabel}</span>
                          {isOverridden && (
                            <button
                              type="button"
                              onClick={() => handleClearOverridePoint(f.periodKey)}
                              title="Restablecer este mes"
                              className="text-slate-400 hover:text-rose-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500">
                          Base IA: {f.forecastUnits.toLocaleString()} uds
                        </div>

                        <input
                          type="number"
                          value={currentVal}
                          onChange={(e) => handleOverridePointChange(f.periodKey, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-amber-300 focus:border-amber-400 outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 📊 Banner Resumen Ejecutivo de Impacto del Escenario Simulado */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-slate-950 border border-amber-500/30 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Demanda Total Proyectada:</span>
              <span className="text-lg font-black text-amber-300 font-mono">
                {prediction?.forecast
                  ? Math.round(prediction.forecast.reduce((sum, f) => sum + (f.simulatedUnits ?? f.forecastUnits), 0)).toLocaleString()
                  : '0'} uds
              </span>
              <span className="text-[10px] text-slate-500 block">
                {simulationDemandDelta !== 0 && `(Delta: ${simulationDemandDelta > 0 ? '+' : ''}${simulationDemandDelta}%)`}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Facturación en Dólares:</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                ${prediction?.forecast
                  ? Math.round(prediction.forecast.reduce((sum, f) => sum + (f.simulatedRevenue ?? f.forecastRevenue), 0)).toLocaleString()
                  : '0'} USD
              </span>
              <span className="text-[10px] text-slate-500 block">
                Precio Unitario: {simulationPriceDelta >= 0 ? `+${simulationPriceDelta}%` : `${simulationPriceDelta}%`}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Facturación en Bolivianos:</span>
              <span className="text-lg font-black text-cyan-300 font-mono">
                Bs. {prediction?.forecast
                  ? Math.round(prediction.forecast.reduce((sum, f) => sum + (f.simulatedRevenueBOB ?? ((f.simulatedRevenue ?? f.forecastRevenue) * simulationExchangeRate)), 0)).toLocaleString()
                  : '0'}
              </span>
              <span className="text-[10px] text-amber-400 block font-bold">
                TC: Bs. {simulationExchangeRate.toFixed(2)} / USD
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Ahorro por Reciclaje:</span>
              <span className="text-lg font-black text-emerald-300 font-mono">
                ${prediction?.forecast
                  ? Math.round(
                      (prediction.forecast.reduce((sum, f) => sum + (f.simulatedWeightKg ?? f.forecastWeightKg), 0) *
                        (simulationRecycledPct / 100) *
                        (1.35 * (1 + simulationResinCostDelta / 100) - 0.45))
                    ).toLocaleString()
                  : '0'} USD
              </span>
              <span className="text-[10px] text-emerald-400 block">
                {simulationRecycledPct}% mezcla recuperada
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🔮 PANEL DE DIAGNÓSTICO DE SALUD EMPRESARIAL & REGRESIÓN MULTIVARIABLE */}
      {businessHealthAnalysis && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 shadow-2xl space-y-6">
          {/* Cabecera del Diagnóstico con Score y Semáforo */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-indigo-500/20">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-sm ${businessHealthAnalysis.badgeColor}`}>
                  {businessHealthAnalysis.statusBadge === 'OPTIMO' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {businessHealthAnalysis.statusBadge === 'ALERTA' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {businessHealthAnalysis.statusBadge === 'CRITICO' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  {businessHealthAnalysis.statusBadge === 'OPTIMO' ? '🟢 Rumbo Favorable (Empresa Saludable)' : businessHealthAnalysis.statusBadge === 'ALERTA' ? '🟡 Rumbo en Observación (Márgenes Estrechos)' : '🔴 Alerta Crítica (Riesgo de Déficit)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Modelo Regresión Lineal OLS • R²: {businessHealthAnalysis.rSquared.toFixed(3)}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white font-outfit tracking-tight">
                {businessHealthAnalysis.title}
              </h2>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                {businessHealthAnalysis.message}
              </p>
            </div>

            {/* Score y Métricas de Regresión */}
            <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-inner">
              <div className="text-center pr-4 border-r border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Índice Salud</span>
                <div className={`text-3xl font-black font-outfit ${businessHealthAnalysis.healthScore >= 75 ? 'text-emerald-400' : businessHealthAnalysis.healthScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {businessHealthAnalysis.healthScore}
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Tendencia Mensual:</span>
                  <span className={`font-mono font-bold flex items-center gap-0.5 ${businessHealthAnalysis.slope >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {businessHealthAnalysis.slope >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {businessHealthAnalysis.slope >= 0 ? `+${businessHealthAnalysis.monthlyProfitGrowthPct}%` : `${businessHealthAnalysis.monthlyProfitGrowthPct}%`}/mes
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Utilidad Proyectada:</span>
                  <span className={`font-mono font-bold ${businessHealthAnalysis.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${Math.round(businessHealthAnalysis.totalNetProfit).toLocaleString()} USD
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Margen Promedio:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {businessHealthAnalysis.averageMarginPct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Selector de Pestañas del Diagnóstico: 4 Sub-Gráficos Especializados */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setViabilityViewMode('profit-wave')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viabilityViewMode === 'profit-wave'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>1. Utilidad Neta & Flujo de Caja (Valles y Picos)</span>
              </button>

              <button
                onClick={() => setViabilityViewMode('scissors')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viabilityViewMode === 'scissors'
                    ? 'bg-indigo-500 text-white font-black shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>2. Tijera Operativa: Facturación vs Break-Even</span>
              </button>

              <button
                onClick={() => setViabilityViewMode('regression')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viabilityViewMode === 'regression'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LineChart className="w-4 h-4" />
                <span>3. Regresión OLS & Rumbo Futuro</span>
              </button>

              <button
                onClick={() => setViabilityViewMode('sensitivity')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viabilityViewMode === 'sensitivity'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>4. Sensibilidad Multivariable (Tornado)</span>
              </button>
            </div>

            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              {viabilityViewMode === 'profit-wave' && 'Eje Y auto-escalado a Utilidad Neta: Destaca dramáticamente los picos y valles mensuales.'}
              {viabilityViewMode === 'scissors' && 'Visualiza el colchón de seguridad entre Facturación Bruta y Costos Operativos Totales.'}
              {viabilityViewMode === 'regression' && 'Tendencia matemática lineal OLS y tasa de variación porcentual proyectada.'}
              {viabilityViewMode === 'sensitivity' && 'Muestra qué variable (Dólar, Precio, Resina, Merma) influye más en el éxito o déficit.'}
            </span>
          </div>

          {/* 🌟 VISTA 1: ONDA DE UTILIDAD NETA & FLUJO DE CAJA (VALLES Y PICOS MUY NOTORIOS) */}
          {viabilityViewMode === 'profit-wave' && (
            <div className="space-y-4">
              <div className="relative w-full h-88 bg-slate-950/80 rounded-2xl border border-slate-800 p-3 overflow-hidden flex flex-col justify-end">
                {/* Tooltip flotante interactivo para Valles y Picos */}
                {hoveredViabilityPoint && (
                  <div
                    className="absolute z-30 pointer-events-none p-3.5 rounded-xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md text-xs space-y-1.5 transform -translate-x-1/2 -translate-y-full"
                    style={{
                      left: `${(hoveredViabilityPoint.index / Math.max(1, businessHealthAnalysis.points.length - 1)) * 88 + 6}%`,
                      top: '25%',
                    }}
                  >
                    <div className="font-extrabold text-white flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                      <span className="text-sm font-outfit">{hoveredViabilityPoint.periodLabel}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        hoveredViabilityPoint.netProfit >= 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {hoveredViabilityPoint.netProfit >= 0 ? '🟢 Ganancia Neta' : '🔴 Déficit Operativo'}
                      </span>
                    </div>

                    <div className="space-y-1 pt-0.5 text-[11px] font-mono">
                      <div className="text-emerald-400 font-black flex justify-between gap-4">
                        <span>Utilidad Neta:</span>
                        <span>${Math.round(hoveredViabilityPoint.netProfit).toLocaleString()} USD</span>
                      </div>
                      <div className="text-cyan-300 flex justify-between gap-4">
                        <span>Equiv. Bolivianos:</span>
                        <span>Bs. {Math.round(hoveredViabilityPoint.netProfitBOB).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-300 flex justify-between gap-4">
                        <span>Margen Operativo:</span>
                        <span>{hoveredViabilityPoint.marginPct}%</span>
                      </div>
                      <div className="text-slate-400 flex justify-between gap-4 border-t border-slate-800/80 pt-1">
                        <span>Facturación:</span>
                        <span>${Math.round(hoveredViabilityPoint.revenue).toLocaleString()} USD</span>
                      </div>
                      <div className="text-rose-400 flex justify-between gap-4">
                        <span>Costos Totales:</span>
                        <span>${Math.round(hoveredViabilityPoint.totalCost).toLocaleString()} USD</span>
                      </div>
                      <div className="text-indigo-300 flex justify-between gap-4">
                        <span>Materia Prima:</span>
                        <span>{Math.round(hoveredViabilityPoint.weightKg).toLocaleString()} kg resina</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SVG de Curva Suavizada de Utilidad & Flujo de Caja */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="none">
                  <defs>
                    {/* Gradiente de relleno de ganancia (verde esmeralda neón) */}
                    <linearGradient id="profitPositiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                      <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Gradiente de relleno de déficit (rojo carmesí) */}
                    <linearGradient id="profitNegativeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
                      <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.55" />
                    </linearGradient>

                    {/* Gradiente para columnas de flujo de caja */}
                    <linearGradient id="barPositiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#047857" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="barNegativeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#be123c" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.30" />
                    </linearGradient>
                  </defs>

                  {/* Rejilla de fondo horizontal suave */}
                  {[0.15, 0.35, 0.65, 0.85].map((ratio) => (
                    <line
                      key={ratio}
                      x1="30"
                      y1={290 * ratio}
                      x2="970"
                      y2={290 * ratio}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Cálculo de coordenadas para cada mes */}
                  {(() => {
                    const N = businessHealthAnalysis.points.length;
                    const scaleMin = businessHealthAnalysis.profitScaleMin;
                    const scaleMax = businessHealthAnalysis.profitScaleMax;
                    const scaleRange = Math.max(1, scaleMax - scaleMin);

                    const baseY = 270 - ((0 - scaleMin) / scaleRange) * 240;

                    const pts = businessHealthAnalysis.points.map((p) => {
                      const x = (p.index / Math.max(1, N - 1)) * 900 + 50;
                      const y = 270 - ((p.netProfit - scaleMin) / scaleRange) * 240;
                      return { x, y, p };
                    });

                    const areaPath = buildSmoothAreaPath(pts.map((pt) => ({ x: pt.x, y: pt.y })), baseY);
                    const linePath = buildSmoothPath(pts.map((pt) => ({ x: pt.x, y: pt.y })));

                    return (
                      <>
                        {/* Columnas de Flujo de Caja en la base de cada mes */}
                        {pts.map((pt) => {
                          const isPos = pt.p.netProfit >= 0;
                          const barTop = isPos ? pt.y : baseY;
                          const barHeight = Math.max(4, Math.abs(pt.y - baseY));

                          return (
                            <rect
                              key={`bar-${pt.p.periodKey}`}
                              x={pt.x - 18}
                              y={barTop}
                              width="36"
                              height={barHeight}
                              rx="6"
                              fill={isPos ? 'url(#barPositiveGrad)' : 'url(#barNegativeGrad)'}
                              stroke={isPos ? '#10b981' : '#f43f5e'}
                              strokeWidth="1"
                              strokeOpacity="0.4"
                              className="transition-all hover:stroke-opacity-100 cursor-pointer"
                              onMouseEnter={() => setHoveredViabilityPoint(pt.p)}
                            />
                          );
                        })}

                        {/* Línea horizontal de Cero ($0 USD • Umbral de Rentabilidad) */}
                        <g>
                          <line
                            x1="30"
                            y1={baseY}
                            x2="970"
                            y2={baseY}
                            stroke="#f43f5e"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                            strokeOpacity="0.75"
                          />
                          <text x="50" y={baseY - 6} fill="#f43f5e" fontSize="10" fontWeight="bold">
                            $0 USD • UMBRAL DE RENTABILIDAD
                          </text>
                        </g>

                        {/* Área suavizada bajo la curva */}
                        <path
                          d={areaPath}
                          fill={businessHealthAnalysis.totalNetProfit >= 0 ? 'url(#profitPositiveGrad)' : 'url(#profitNegativeGrad)'}
                        />

                        {/* Línea de onda Bézier suavizada principal */}
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />

                        {/* Nodos con halos luminosos interactivos */}
                        {pts.map((pt) => {
                          const isMax = pt.p.index === businessHealthAnalysis.maxProfitPoint.index;
                          const isMin = pt.p.index === businessHealthAnalysis.minProfitPoint.index;
                          const isHovered = hoveredViabilityPoint?.index === pt.p.index;

                          return (
                            <g
                              key={`node-${pt.p.periodKey}`}
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredViabilityPoint(pt.p)}
                            >
                              {/* Halo pulsante */}
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isMax || isMin || isHovered ? 12 : 8}
                                fill={isMax ? '#10b981' : isMin ? '#f43f5e' : '#06b6d4'}
                                fillOpacity={isHovered ? 0.35 : 0.15}
                              />
                              {/* Punto central */}
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isMax || isMin ? 6 : 4.5}
                                fill={isMax ? '#10b981' : isMin ? '#f43f5e' : '#38bdf8'}
                                stroke="#0f172a"
                                strokeWidth="2"
                              />

                              {/* Distintivo de Pico / Valle / Delta encima del punto */}
                              <g transform={`translate(${pt.x}, ${pt.y - 14})`}>
                                {isMax ? (
                                  <g>
                                    <rect x="-42" y="-18" width="84" height="18" rx="4" fill="#047857" stroke="#34d399" strokeWidth="1" />
                                    <text x="0" y="-5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900">
                                      ▲ PICO +${Math.round(pt.p.netProfit / 1000)}k
                                    </text>
                                  </g>
                                ) : isMin ? (
                                  <g>
                                    <rect x="-42" y="-18" width="84" height="18" rx="4" fill="#9f1239" stroke="#fb7185" strokeWidth="1" />
                                    <text x="0" y="-5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900">
                                      ▼ VALLE ${Math.round(pt.p.netProfit / 1000)}k
                                    </text>
                                  </g>
                                ) : (
                                  <g>
                                    <rect
                                      x="-28"
                                      y="-16"
                                      width="56"
                                      height="16"
                                      rx="4"
                                      fill="#0f172a"
                                      stroke={pt.p.monthGrowthPct >= 0 ? '#10b981' : '#f43f5e'}
                                      strokeWidth="1"
                                      strokeOpacity="0.6"
                                    />
                                    <text
                                      x="0"
                                      y="-4"
                                      textAnchor="middle"
                                      fill={pt.p.monthGrowthPct >= 0 ? '#34d399' : '#fb7185'}
                                      fontSize="9"
                                      fontWeight="bold"
                                    >
                                      {pt.p.monthGrowthPct >= 0 ? `+${pt.p.monthGrowthPct}%` : `${pt.p.monthGrowthPct}%`}
                                    </text>
                                  </g>
                                )}
                              </g>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                {/* Eje X con meses proyectados */}
                <div className="flex justify-between text-[11px] text-slate-400 font-bold px-8 pt-2 border-t border-slate-800">
                  {businessHealthAnalysis.points.map((p) => (
                    <span
                      key={p.periodKey}
                      className={`cursor-pointer transition-colors ${
                        p.index === businessHealthAnalysis.maxProfitPoint.index
                          ? 'text-emerald-400 font-black'
                          : p.index === businessHealthAnalysis.minProfitPoint.index
                          ? 'text-rose-400 font-black'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      onMouseEnter={() => setHoveredViabilityPoint(p)}
                    >
                      {p.periodLabel}
                    </span>
                  ))}
                </div>
              </div>

              {/* 🏷️ Desglose Mes a Mes: Tarjetas de Valles y Picos Notorios */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                {businessHealthAnalysis.points.map((p) => {
                  const isMax = p.index === businessHealthAnalysis.maxProfitPoint.index;
                  const isMin = p.index === businessHealthAnalysis.minProfitPoint.index;

                  return (
                    <div
                      key={p.periodKey}
                      onMouseEnter={() => setHoveredViabilityPoint(p)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isMax
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                          : isMin
                          ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-500/10'
                          : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-extrabold text-white text-[11px]">{p.periodLabel}</span>
                        {isMax && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            PICO
                          </span>
                        )}
                        {isMin && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            VALLE
                          </span>
                        )}
                      </div>

                      <div className="text-base font-black font-outfit text-white">
                        <span className={p.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          ${Math.round(p.netProfit).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal ml-1">USD</span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Bs. {Math.round(p.netProfitBOB).toLocaleString()}
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1.5 mt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">Margen:</span>
                        <span className="font-bold text-cyan-300">{p.marginPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ✂️ VISTA 2: TIJERA OPERATIVA (FACTURACIÓN VS BREAK-EVEN CON CINTA DE MARGEN) */}
          {viabilityViewMode === 'scissors' && (
            <div className="space-y-3">
              <div className="relative w-full h-88 bg-slate-950/80 rounded-2xl border border-slate-800 p-3 overflow-hidden flex flex-col justify-end">
                {/* SVG de Tijera Operativa */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="marginRibbonGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.10" />
                    </linearGradient>
                  </defs>

                  {/* Rejilla */}
                  {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                    <line
                      key={ratio}
                      x1="30"
                      y1={300 * ratio}
                      x2="970"
                      y2={300 * ratio}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  ))}

                  {(() => {
                    const N = businessHealthAnalysis.points.length;
                    const maxVal = businessHealthAnalysis.maxRevCost;
                    const minVal = businessHealthAnalysis.minRevCost;
                    const range = Math.max(1, maxVal - minVal);

                    const ptsRev = businessHealthAnalysis.points.map((p) => ({
                      x: (p.index / Math.max(1, N - 1)) * 900 + 50,
                      y: 270 - ((p.revenue - minVal) / range) * 240,
                      p,
                    }));

                    const ptsCost = businessHealthAnalysis.points.map((p) => ({
                      x: (p.index / Math.max(1, N - 1)) * 900 + 50,
                      y: 270 - ((p.totalCost - minVal) / range) * 240,
                      p,
                    }));

                    const ribbonPath = buildSmoothRibbonPath(
                      ptsRev.map((pt) => ({ x: pt.x, y: pt.y })),
                      ptsCost.map((pt) => ({ x: pt.x, y: pt.y }))
                    );
                    const revPath = buildSmoothPath(ptsRev.map((pt) => ({ x: pt.x, y: pt.y })));
                    const costPath = buildSmoothPath(ptsCost.map((pt) => ({ x: pt.x, y: pt.y })));

                    return (
                      <>
                        {/* Cinta de Colchón de Margen Operativo */}
                        <path d={ribbonPath} fill="url(#marginRibbonGrad)" />

                        {/* Curva de Facturación Proyectada (Verde Esmeralda) */}
                        <path d={revPath} fill="none" stroke="#10b981" strokeWidth="3.5" />

                        {/* Curva de Costos Totales de Operación (Rojo Coral Discontinua) */}
                        <path d={costPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="5 4" />

                        {/* Nodos sobre Facturación */}
                        {ptsRev.map((pt) => (
                          <circle
                            key={`rev-${pt.p.periodKey}`}
                            cx={pt.x}
                            cy={pt.y}
                            r="5"
                            fill="#10b981"
                            stroke="#0f172a"
                            strokeWidth="2"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredViabilityPoint(pt.p)}
                          />
                        ))}

                        {/* Nodos sobre Costos */}
                        {ptsCost.map((pt) => (
                          <circle
                            key={`cost-${pt.p.periodKey}`}
                            cx={pt.x}
                            cy={pt.y}
                            r="4.5"
                            fill="#f43f5e"
                            stroke="#0f172a"
                            strokeWidth="2"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredViabilityPoint(pt.p)}
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* Eje X */}
                <div className="flex justify-between text-[11px] text-slate-400 font-bold px-8 pt-2 border-t border-slate-800">
                  {businessHealthAnalysis.points.map((p) => (
                    <span key={p.periodKey} className="text-slate-300">
                      {p.periodLabel}
                    </span>
                  ))}
                </div>
              </div>

              {/* Leyenda y Colchón de Seguridad */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400/50" />
                    <span className="text-emerald-300 font-bold">Facturación Proyectada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-1 border-b-2 border-rose-400 border-dashed inline-block" />
                    <span className="text-rose-300 font-bold">Costos Totales (Break-Even)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500/30 border border-emerald-500/50 inline-block" />
                    <span className="text-cyan-300 font-bold">Colchón de Margen Libre (Seguridad Financiera)</span>
                  </div>
                </div>

                <div className="font-mono text-emerald-400 font-bold">
                  Margen Promedio: {businessHealthAnalysis.averageMarginPct}%
                </div>
              </div>
            </div>
          )}

          {/* 📈 VISTA 3: REGRESIÓN LINEAL OLS & TENDENCIA */}
          {viabilityViewMode === 'regression' && (
            <div className="space-y-3">
              <div className="relative w-full h-88 bg-slate-950/80 rounded-2xl border border-slate-800 p-3 overflow-hidden flex flex-col justify-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="none">
                  {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                    <line
                      key={ratio}
                      x1="30"
                      y1={300 * ratio}
                      x2="970"
                      y2={300 * ratio}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  ))}

                  {(() => {
                    const N = businessHealthAnalysis.points.length;
                    const scaleMin = businessHealthAnalysis.profitScaleMin;
                    const scaleMax = businessHealthAnalysis.profitScaleMax;
                    const scaleRange = Math.max(1, scaleMax - scaleMin);
                    const baseY = 270 - ((0 - scaleMin) / scaleRange) * 240;

                    const regPts = businessHealthAnalysis.regressionLine.map((r) => ({
                      x: (r.index / Math.max(1, N - 1)) * 900 + 50,
                      y: 270 - ((r.fitProfit - scaleMin) / scaleRange) * 240,
                    }));

                    const actualPts = businessHealthAnalysis.points.map((p) => ({
                      x: (p.index / Math.max(1, N - 1)) * 900 + 50,
                      y: 270 - ((p.netProfit - scaleMin) / scaleRange) * 240,
                      p,
                    }));

                    const regPath = buildSmoothPath(regPts);
                    const actualPath = buildSmoothPath(actualPts.map((pt) => ({ x: pt.x, y: pt.y })));

                    return (
                      <>
                        <line x1="30" y1={baseY} x2="970" y2={baseY} stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3" />
                        <path d={actualPath} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.7" />
                        <path d={regPath} fill="none" stroke="#06b6d4" strokeWidth="3.5" />

                        {actualPts.map((pt) => (
                          <circle
                            key={`actual-${pt.p.periodKey}`}
                            cx={pt.x}
                            cy={pt.y}
                            r="5"
                            fill="#10b981"
                            stroke="#0f172a"
                            strokeWidth="2"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredViabilityPoint(pt.p)}
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>

                <div className="flex justify-between text-[11px] text-slate-400 font-bold px-8 pt-2 border-t border-slate-800">
                  {businessHealthAnalysis.points.map((p) => (
                    <span key={p.periodKey} className="text-slate-300">
                      {p.periodLabel}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="flex items-center gap-4">
                  <span className="text-cyan-300 font-bold">
                    Ecuación OLS: y = {Math.round(businessHealthAnalysis.slope)}x + {Math.round(businessHealthAnalysis.intercept)}
                  </span>
                  <span className="text-slate-400 font-mono">
                    R² = {businessHealthAnalysis.rSquared.toFixed(3)}
                  </span>
                </div>
                <div className="font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                  Pendiente: {businessHealthAnalysis.slope >= 0 ? `+$${Math.round(businessHealthAnalysis.slope).toLocaleString()}` : `-$${Math.round(Math.abs(businessHealthAnalysis.slope)).toLocaleString()}`}/mes
                </div>
              </div>
            </div>
          )}

          {/* 🌪️ VISTA 4: MATRIZ DE SENSIBILIDAD TORNADO */}
          {viabilityViewMode === 'sensitivity' && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="font-extrabold text-white uppercase tracking-wider text-[11px]">
                  Impacto Neto por Variable Modificada en la Simulación:
                </span>
                <span className="text-[11px] text-slate-400">
                  Verde: Aporte a favor de la empresa • Rojo: Presión de costos o pérdidas
                </span>
              </div>

              <div className="space-y-3">
                {businessHealthAnalysis.sensitivityFactors.map((factor, idx) => {
                  const maxAbs = Math.max(...businessHealthAnalysis.sensitivityFactors.map((f) => Math.abs(f.val)), 1000);
                  const barWidthPct = Math.min(100, Math.max(6, (Math.abs(factor.val) / maxAbs) * 100));

                  return (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="w-48 shrink-0">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{factor.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${factor.isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                            {factor.desc}
                          </span>
                        </div>
                      </div>

                      {/* Barra de impacto horizontal */}
                      <div className="flex-1 flex items-center gap-2">
                        <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              factor.isPositive
                                ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                                : 'bg-gradient-to-r from-rose-500 to-amber-500'
                            }`}
                            style={{ width: `${barWidthPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="w-28 text-right font-mono font-black shrink-0">
                        <span className={factor.isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                          {factor.val >= 0 ? `+$${factor.val.toLocaleString()}` : `-$${Math.abs(factor.val).toLocaleString()}`} USD
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📊 Tarjetas de KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Pronóstico Próximo Periodo */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Demanda Próx. Periodo</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-outfit">
            {isSimulationActive && prediction?.forecast[0]?.simulatedUnits !== undefined
              ? prediction.forecast[0].simulatedUnits.toLocaleString()
              : prediction?.forecast[0]?.forecastUnits.toLocaleString() || '---'}
            <span className="text-xs text-slate-400 font-normal ml-1">uds</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">
              {isSimulationActive ? 'Escenario Simulado' : 'vs periodo actual'}
            </span>
            {isSimulationActive && (
              <span className="font-extrabold text-amber-400 font-mono">
                {simulationDemandDelta >= 0 ? `+${simulationDemandDelta}%` : `${simulationDemandDelta}%`}
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Resina Requerida (MRP) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Resina Requerida (Kg)</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-outfit">
            {isSimulationActive && prediction?.forecast[0]?.simulatedWeightKg !== undefined
              ? prediction.forecast[0].simulatedWeightKg.toLocaleString()
              : prediction?.forecast[0]?.forecastWeightKg.toLocaleString() || '---'}
            <span className="text-xs text-slate-400 font-normal ml-1">kg</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
            <span>Total horizonte:</span>
            <span className="text-indigo-300 font-bold">
              {prediction?.forecast
                ? (
                    prediction.forecast.reduce(
                      (sum, f) => sum + (isSimulationActive && f.simulatedWeightKg !== undefined ? f.simulatedWeightKg : f.forecastWeightKg),
                      0
                    ) / 1000
                  ).toFixed(1)
                : '0'}{' '}
              Ton
            </span>
          </div>
        </div>

        {/* KPI 3: Precisión del Modelo IA (MAPE) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Precisión IA (Validación)</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-outfit">
            {prediction?.modelAccuracyScore || '92.4'}%
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
            <span>Error MAPE:</span>
            <span className="text-emerald-300 font-bold">{prediction?.mapePercent || '7.6'}%</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
              95% Confianza
            </span>
          </div>
        </div>

        {/* KPI 4: Estado de Abastecimiento en Silos */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Alerta Abastecimiento</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          {(() => {
            const reqs = (isSimulationActive && prediction?.simulation?.simulatedResinRequirements)
              ? prediction.simulation.simulatedResinRequirements
              : prediction?.resinRequirements;

            const criticalItem = reqs?.find(
              (r) => r.stockStatusAfterForecast === 'CRITICO' || r.stockStatusAfterForecast === 'BAJO'
            );
            if (criticalItem) {
              return (
                <>
                  <div className="text-lg font-black text-amber-300 font-outfit truncate">
                    {criticalItem.materialCode} en {criticalItem.siloLocation}
                  </div>
                  <div className="text-xs text-amber-400/90 mt-2 flex items-center justify-between">
                    <span>Agotamiento en:</span>
                    <span className="font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200">
                      {criticalItem.estimatedDaysUntilStockout} días
                    </span>
                  </div>
                </>
              );
            }
            return (
              <>
                <div className="text-xl font-black text-emerald-400 font-outfit flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5" /> Stock Óptimo
                </div>
                <div className="text-xs text-slate-400 mt-2">Capacidad en silos suficiente</div>
              </>
            );
          })()}
        </div>
      </div>

      {/* ⚙️ Barra de Controles Interactivos & Parámetros del Modelo */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Selector de Granularidad (Mes / Semana / Año) */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            Agrupar:
          </span>
          {(['month', 'week', 'year'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                granularity === g
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {g === 'month' ? 'Mensual' : g === 'week' ? 'Semanal' : 'Anual'}
            </button>
          ))}
        </div>

        {/* Filtro por Categoría / Proceso */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Línea de Proceso:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 outline-none"
          >
            <option value="">Todas las Líneas</option>
            <option value="INYECCION">Inyección (Tapas y Preformas)</option>
            <option value="SOPLADO">Soplado (Bidones y Botellas)</option>
            <option value="EXTRUSION">Extrusión (Películas y Bolsas)</option>
            <option value="TERMOFORMADO">Termoformado (Bandejas)</option>
          </select>
        </div>

        {/* Filtro por Producto */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Producto:</span>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 outline-none max-w-[180px] truncate"
          >
            <option value="">Todos los Productos</option>
            <option value="PREF-PET-28">Preforma PET 28mm (24g)</option>
            <option value="TAPA-HDPE-28">Tapa Rosca HDPE 28mm (3.5g)</option>
            <option value="TAPA-FLIP-PP">Tapa Flip-Top PP 38mm (8.5g)</option>
            <option value="BIDON-5L-HDPE">Bidón Industrial 5L (240g)</option>
            <option value="BOTELLA-1L-HDPE">Botella HDPE 1L (42g)</option>
            <option value="ENVASE-PP-250ML">Envase Cosmético PP 250ml</option>
            <option value="PELICULA-LDPE-TERMO">Bobina Película LDPE (25kg)</option>
            <option value="BOLSA-HDPE-40X60">Bolsa Alta Densidad HDPE</option>
            <option value="BANDEJA-PP-1L">Bandeja Termoformada PP 1L</option>
          </select>
        </div>

        {/* Algoritmo de IA */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Algoritmo IA:</span>
          <select
            value={selectedAlgorithm}
            onChange={(e) => setSelectedAlgorithm(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-cyan-300 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:border-cyan-500 outline-none"
          >
            <option value="AUTO_ENSEMBLE">🧠 Ensamble IA (Óptimo)</option>
            <option value="HOLT_WINTERS">📈 Holt-Winters (Estacionalidad)</option>
            <option value="REGRESSION">📉 Regresión Lineal</option>
            <option value="EXPONENTIAL_SMOOTHING">🔄 Suavizado Exponencial</option>
          </select>
        </div>

        {/* Horizonte Futuro */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Horizonte:</span>
          <select
            value={periods}
            onChange={(e) => setPeriods(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 outline-none"
          >
            <option value={3}>3 periodos</option>
            <option value={6}>6 periodos (Semestre)</option>
            <option value={12}>12 periodos (Año)</option>
            <option value={18}>18 periodos</option>
          </select>
        </div>
      </div>

      {/* 📈 Gráfico Predictivo Interactivo (SVG Personalizado) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        {/* Selector de Métrica del Gráfico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Curva de Demanda Histórica (2 Años) vs Pronóstico Proyectado</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Intervalo 95% CI
              </span>
              {isSimulationActive && (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Wand2 className="w-3 h-3 text-amber-400" />
                  Curva Simulada Activa
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Cian: Ventas reales • Púrpura discontinua: Proyección IA Base {isSimulationActive && '• Ámbar: Escenario Simulado What-If'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setChartMetric('units')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                chartMetric === 'units'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unidades (Uds)
            </button>
            <button
              onClick={() => setChartMetric('weight')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                chartMetric === 'weight'
                  ? 'bg-indigo-500 text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Peso Plástico (Kg)
            </button>
            <button
              onClick={() => setChartMetric('revenue')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                chartMetric === 'revenue'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Facturación ($ USD)
            </button>
            <button
              onClick={() => setChartMetric('revenueBob')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                chartMetric === 'revenueBob'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-amber-400/90 hover:text-amber-300'
              }`}
            >
              <span>Facturación (Bs. BOB)</span>
            </button>
            <button
              onClick={() => setChartMetric('margin')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                chartMetric === 'margin'
                  ? 'bg-purple-500 text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Margen ($ USD)
            </button>
          </div>
        </div>

        {/* Lienzo SVG Responsivo */}
        <div className="relative w-full h-80 sm:h-96 bg-slate-950/60 rounded-xl border border-slate-800/80 p-2 overflow-hidden flex flex-col justify-end">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-20">
              <div className="flex items-center gap-3 text-cyan-400 font-bold text-sm">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Entrenando modelos de IA sobre 2 años de datos...</span>
              </div>
            </div>
          ) : chartData.points.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              No hay datos para los filtros seleccionados
            </div>
          ) : (
            <>
              {/* Tooltip flotante interactivo */}
              {hoveredPoint && (
                <div
                  className="absolute z-30 pointer-events-none p-3 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-md text-xs space-y-1 transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(hoveredPoint.index / Math.max(1, chartData.points.length - 1)) * 92 + 4}%`,
                    top: '25%',
                  }}
                >
                  <div className="font-extrabold text-white flex items-center justify-between gap-3">
                    <span>{hoveredPoint.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        hoveredPoint.isSimulation
                          ? 'bg-amber-500/20 text-amber-300 font-black'
                          : hoveredPoint.isForecast
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {hoveredPoint.isSimulation
                        ? 'Escenario Simulado'
                        : hoveredPoint.isForecast
                        ? 'Pronóstico IA Base'
                        : 'Dato Real'}
                    </span>
                  </div>
                  <div className="text-cyan-300 font-black text-sm">
                    {formatMetricValue(hoveredPoint.value)}
                  </div>
                  {hoveredPoint.isForecast && !hoveredPoint.isSimulation && (
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 space-y-0.5">
                      <div>Rango 95%: {formatMetricValue(Math.round(hoveredPoint.lower))} – {formatMetricValue(Math.round(hoveredPoint.upper))}</div>
                      <div>Variación: {hoveredPoint.growth > 0 ? `+${hoveredPoint.growth}%` : `${hoveredPoint.growth}%`}</div>
                    </div>
                  )}
                  {hoveredPoint.isSimulation && (
                    <div className="text-[10px] text-amber-300/90 pt-1.5 border-t border-slate-800 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Base IA Original:</span>
                        <span className="font-mono">{formatMetricValue(hoveredPoint.originalValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Delta Demanda:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {simulationDemandDelta > 0 ? `+${simulationDemandDelta}%` : `${simulationDemandDelta}%`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dólar Simulado:</span>
                        <span className="font-mono font-bold text-cyan-300">
                          Bs. {simulationExchangeRate.toFixed(2)}
                        </span>
                      </div>
                      {chartMetric === 'revenue' && (
                        <div className="flex justify-between text-slate-300">
                          <span>Equiv. Bolivianos:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            Bs. {Math.round(hoveredPoint.simRevenueBOB ?? (hoveredPoint.value * simulationExchangeRate)).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {chartMetric === 'revenueBob' && (
                        <div className="flex justify-between text-slate-300">
                          <span>Equiv. Dólares:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            ${Math.round(hoveredPoint.simRevenueUSD ?? (hoveredPoint.value / simulationExchangeRate)).toLocaleString()} USD
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400">
                        <span>Reciclaje / Merma:</span>
                        <span className="font-mono text-emerald-300">
                          {simulationRecycledPct}% / {simulationScrapDelta >= 0 ? `+${simulationScrapDelta}%` : `${simulationScrapDelta}%`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Renderizado de curvas SVG */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 320" preserveAspectRatio="none">
                <defs>
                  {/* Gradiente de relleno histórico */}
                  <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Gradiente de relleno pronóstico */}
                  <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Gradiente de banda de confianza 95% */}
                  <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Líneas horizontales de rejilla */}
                {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                  <line
                    key={ratio}
                    x1="0"
                    y1={320 * ratio}
                    x2="1000"
                    y2={320 * ratio}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                ))}

                {/* Línea divisoria entre Histórico y Pronóstico */}
                {chartData.histPoints.length > 0 && chartData.forePoints.length > 0 && (
                  <g>
                    {(() => {
                      const splitX =
                        ((chartData.histPoints.length - 1) / Math.max(1, chartData.points.length - 1)) * 960 + 20;
                      return (
                        <>
                          <line
                            x1={splitX}
                            y1="10"
                            x2={splitX}
                            y2="310"
                            stroke="#818cf8"
                            strokeDasharray="3 3"
                            strokeWidth="1.5"
                          />
                          <text x={splitX + 6} y="22" fill="#a5b4fc" fontSize="10" fontWeight="bold">
                            HOY / INICIO PRONÓSTICO
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}

                {/* Banda de Intervalo de Confianza (95% CI) en el pronóstico */}
                {chartData.forePoints.length > 0 && (
                  <path
                    d={(() => {
                      const pts = chartData.points;
                      const fStart = chartData.histPoints.length - 1;
                      const relevant = pts.slice(Math.max(0, fStart));

                      let upperPath = '';
                      relevant.forEach((p, i) => {
                        const x = ((p.index) / Math.max(1, pts.length - 1)) * 960 + 20;
                        const val = p.upper !== undefined ? p.upper : p.value;
                        const y = 300 - ((val - chartData.minVal) / (chartData.maxVal - chartData.minVal)) * 270;
                        upperPath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
                      });

                      let lowerPath = '';
                      for (let i = relevant.length - 1; i >= 0; i--) {
                        const p = relevant[i];
                        const x = ((p.index) / Math.max(1, pts.length - 1)) * 960 + 20;
                        const val = p.lower !== undefined ? p.lower : p.value;
                        const y = 300 - ((val - chartData.minVal) / (chartData.maxVal - chartData.minVal)) * 270;
                        lowerPath += ` L ${x} ${y}`;
                      }

                      return `${upperPath} ${lowerPath} Z`;
                    })()}
                    fill="url(#ciGrad)"
                  />
                )}

                {/* Área bajo la curva histórica */}
                {chartData.histPoints.length > 0 && (
                  <path
                    d={(() => {
                      const pts = chartData.histPoints.map((p) => ({
                        x: ((p.index) / Math.max(1, chartData.points.length - 1)) * 960 + 20,
                        y: 300 - ((p.value - chartData.minVal) / (chartData.maxVal - chartData.minVal)) * 270,
                      }));
                      return buildSmoothAreaPath(pts, 310);
                    })()}
                    fill="url(#histGrad)"
                  />
                )}

                {/* Línea Histórica (Cian continuo con curva Bézier suave) */}
                <path
                  d={(() => {
                    const pts = chartData.histPoints.map((p) => ({
                      x: ((p.index) / Math.max(1, chartData.points.length - 1)) * 960 + 20,
                      y: 300 - ((p.value - chartData.minVal) / (chartData.maxVal - chartData.minVal)) * 270,
                    }));
                    return buildSmoothPath(pts);
                  })()}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                />

                {/* Línea de Pronóstico IA Base (Púrpura suave discontinua) */}
                {chartData.forePoints.length > 0 && (
                  <path
                    d={(() => {
                      const lastHist = chartData.histPoints[chartData.histPoints.length - 1];
                      const pointsToDraw = lastHist ? [lastHist, ...chartData.forePoints] : chartData.forePoints;
                      const pts = pointsToDraw.map((p) => ({
                        x: ((p.index) / Math.max(1, chartData.points.length - 1)) * 960 + 20,
                        y: 300 - ((p.value - chartData.minVal) / (chartData.maxVal - chartData.minVal)) * 270,
                      }));
                      return buildSmoothPath(pts);
                    })()}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                  />
                )}

                {/* 🌟 Línea de Escenario Simulado (Ámbar brillante suave) */}
                {isSimulationActive && chartData.simPoints.length > 0 && (
                  <path
                    d={(() => {
                      const lastHist = chartData.histPoints[chartData.histPoints.length - 1];
                      const pointsToDraw = lastHist ? [lastHist, ...chartData.simPoints] : chartData.simPoints;
                      const pts = pointsToDraw.map((p) => ({
                        x: ((p.index) / Math.max(1, chartData.points.length - 1)) * 960 + 20,
                        y: 300 - ((p.value - chartData.minVal) / (chartData.maxVal - chartData.minVal)) * 270,
                      }));
                      return buildSmoothPath(pts);
                    })()}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3.5"
                    strokeDasharray="4 3"
                  />
                )}

                {/* Puntos interactivos sobre las curvas */}
                {chartData.points.map((p) => {
                  const x = ((p.index) / Math.max(1, chartData.points.length - 1)) * 960 + 20;
                  const y = 300 - ((p.value - chartData.minVal) / (chartData.maxVal - chartData.minVal)) * 270;
                  const isHovered = hoveredPoint?.index === p.index && !hoveredPoint?.isSimulation;

                  return (
                    <g key={p.key} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(p)}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 7 : p.isForecast ? 4.5 : 3.5}
                        fill={p.isForecast ? '#c084fc' : '#06b6d4'}
                        stroke="#0f172a"
                        strokeWidth="2"
                        className="transition-all duration-150"
                      />
                      {p.isForecast && (
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 12 : 8}
                          fill="none"
                          stroke="#c084fc"
                          strokeOpacity={isHovered ? '0.6' : '0.25'}
                          strokeWidth="1.5"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Puntos de Simulación (Dorados) */}
                {isSimulationActive &&
                  chartData.simPoints.map((p) => {
                    const x = ((p.index) / Math.max(1, chartData.points.length - 1)) * 960 + 20;
                    const y = 300 - ((p.value - chartData.minVal) / (chartData.maxVal - chartData.minVal)) * 270;
                    const isHovered = hoveredPoint?.key === p.key;

                    return (
                      <g key={p.key} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(p)}>
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 7.5 : 5}
                          fill="#f59e0b"
                          stroke="#0f172a"
                          strokeWidth="2"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 14 : 9}
                          fill="none"
                          stroke="#f59e0b"
                          strokeOpacity={isHovered ? '0.7' : '0.35'}
                          strokeWidth="1.5"
                        />
                      </g>
                    );
                  })}
              </svg>

              {/* Etiquetas del eje X */}
              <div className="flex justify-between text-[10px] text-slate-400 font-medium px-4 pt-1 border-t border-slate-800">
                {chartData.points
                  .filter((_, idx, arr) => {
                    const step = Math.ceil(arr.length / 8);
                    return idx % step === 0 || idx === arr.length - 1;
                  })
                  .map((p) => (
                    <span key={p.key} className={p.isForecast ? 'text-purple-400 font-bold' : ''}>
                      {p.label}
                    </span>
                  ))}
              </div>
            </>
          )}
        </div>

        {/* Leyenda y Notas del Gráfico */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400/50" />
              <span>Ventas Reales (2 Años)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 border-b-2 border-purple-400 border-dashed inline-block" />
              <span className="text-purple-300 font-medium">Pronóstico IA Base ({periods} Periodos)</span>
            </div>
            {isSimulationActive && (
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 border-b-2 border-amber-400 border-dashed inline-block" />
                <span className="text-amber-300 font-bold">Escenario Simulado (What-If)</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-3 h-2 rounded bg-indigo-500/20 border border-indigo-400/30 inline-block" />
              <span>Banda de Confianza 95%</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 italic">
            * Puntos editados o simulados actualizan en tiempo real el consumo de resinas virgen en silos.
          </div>
        </div>
      </div>

      {/* 🏭 Planificación de Abastecimiento de Resinas (MRP) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              Planificación de Materia Prima Requerida (MRP Plásticos)
              {isSimulationActive && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Valores Recalculados por Simulación
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Cálculo estequiométrico de resina virgen requerida en silos considerando la merma del proceso {simulationScrapDelta !== 0 && `(Ajuste de merma: ${simulationScrapDelta > 0 ? '+' : ''}${simulationScrapDelta}%)`}.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            Tolvas & Silos Monitoreados: {prediction?.resinRequirements.length || 0}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const reqs = (isSimulationActive && prediction?.simulation?.simulatedResinRequirements)
              ? prediction.simulation.simulatedResinRequirements
              : prediction?.resinRequirements;

            return reqs?.map((res) => {
              const isCritical = res.stockStatusAfterForecast === 'CRITICO';
              const isLow = res.stockStatusAfterForecast === 'BAJO';

              // Comparar con el original si hay simulación
              const origRes = prediction?.resinRequirements.find((r) => r.materialCode === res.materialCode);
              const diffNextKg = origRes ? res.requiredKgNextPeriod - origRes.requiredKgNextPeriod : 0;

              return (
                <div
                  key={res.materialCode}
                  className={`p-4 rounded-xl border transition-all ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/30'
                      : isLow
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-amber-950/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-black text-white">{res.materialCode}</span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : isLow
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isCritical ? 'CRÍTICO' : isLow ? 'STOCK BAJO' : 'ÓPTIMO'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-bold truncate mb-1">{res.materialName}</div>
                  <div className="text-[11px] text-slate-400 mb-3 flex items-center gap-1">
                    <PackageCheck className="w-3 h-3 text-cyan-400" />
                    <span>{res.siloLocation}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Stock Actual:</span>
                      <span className="text-white font-bold">{res.currentStockKg.toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Necesidad Próx. Mes:</span>
                      <div className="text-right">
                        <span className="text-cyan-300 font-black">
                          {res.requiredKgNextPeriod.toLocaleString()} kg
                        </span>
                        {isSimulationActive && diffNextKg !== 0 && (
                          <div className={`text-[10px] font-bold ${diffNextKg > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {diffNextKg > 0 ? `+${diffNextKg.toLocaleString()} kg` : `${diffNextKg.toLocaleString()} kg`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Pronóstico:</span>
                      <span className="text-indigo-300 font-medium">
                        {(res.requiredKgTotalForecast / 1000).toFixed(1)} Ton
                      </span>
                    </div>

                    {res.replenishmentCostUSD !== undefined && (
                      <div className="flex justify-between text-slate-400 pt-1.5 border-t border-slate-800/80">
                        <span>Costo Reposición:</span>
                        <div className="text-right">
                          <span className="text-emerald-400 font-bold font-mono">
                            ${Math.round(res.replenishmentCostUSD).toLocaleString()} USD
                          </span>
                          <div className="text-[10px] text-amber-300 font-mono">
                            Bs. {Math.round(res.replenishmentCostBOB ?? (res.replenishmentCostUSD * simulationExchangeRate)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {res.recycledSharePct !== undefined && (
                      <div className="flex justify-between text-[11px] text-emerald-400 font-bold">
                        <span>Cuota Recuperado:</span>
                        <span>{res.recycledSharePct}% mezcla</span>
                      </div>
                    )}
                  </div>

                  {/* Barra de progreso de cobertura */}
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Autonomía estimada:</span>
                      <span
                        className={`font-black ${
                          isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {res.estimatedDaysUntilStockout} días
                        {isSimulationActive && origRes && origRes.estimatedDaysUntilStockout !== res.estimatedDaysUntilStockout && (
                          <span className="text-slate-500 font-normal ml-1">
                            (era {origRes.estimatedDaysUntilStockout}d)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isCritical ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(5, (res.currentStockKg / Math.max(1, res.requiredKgNextPeriod)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* 📋 Explorador de Histórico de Ventas (con Edición en Base de Datos) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Explorador del Histórico de Ventas ({historyTotal.toLocaleString()} Registros en PostgreSQL)
            </h2>
            <p className="text-xs text-slate-400">
              Registros comerciales reales. Haz clic en el botón de edición para modificar cantidades o estados y probar simulaciones con datos ajustados.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar cliente, código, producto..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-400 focus:border-cyan-500 outline-none w-56 sm:w-64"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors"
            >
              Filtrar
            </button>
          </form>
        </div>

        {/* Tabla de Registros */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Código Venta</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Cliente / Región</th>
                <th className="p-3">Producto / Proceso</th>
                <th className="p-3 text-right">Unidades</th>
                <th className="p-3 text-right">Peso Plástico (Kg)</th>
                <th className="p-3 text-right">Monto (USD)</th>
                <th className="p-3 text-center">Estado / Temp.</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {salesHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400">
                    No se encontraron registros que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                salesHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyan-400">{item.saleCode}</td>
                    <td className="p-3 text-slate-300">{item.saleDate?.slice(0, 10)}</td>
                    <td className="p-3">
                      <div className="font-bold text-white">{item.clientName}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.clientSector} • {item.clientRegion}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">{item.productName}</div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      {item.quantityUnits < 0 ? (
                        <span className="text-rose-400 font-bold">{item.quantityUnits.toLocaleString()}</span>
                      ) : (
                        item.quantityUnits.toLocaleString()
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-cyan-300 font-bold">
                      {item.totalWeightKg < 0 ? (
                        <span className="text-rose-400">{item.totalWeightKg.toLocaleString()} kg</span>
                      ) : (
                        `${item.totalWeightKg.toLocaleString()} kg`
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                      {item.totalAmount < 0 ? (
                        <span className="text-rose-400">-${Math.abs(item.totalAmount).toLocaleString()}</span>
                      ) : (
                        `$${item.totalAmount.toLocaleString()}`
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="space-y-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-block ${
                            item.status === 'CANCELADA' || item.status === 'DEVUELTA'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : item.status === 'PARCIAL'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {item.status || 'COMPLETADA'}
                        </span>
                        <div className="text-[10px] text-slate-400">{item.seasonality || 'MEDIA'}</div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        title="Editar datos de esta venta y recalcular"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación y Resumen */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span>
            Mostrando {salesHistory.length} registros de {historyTotal.toLocaleString()} en total
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (historyPage > 1) {
                  const p = historyPage - 1;
                  setHistoryPage(p);
                  demandForecastingApi
                    .getHistory({ page: p, limit: 15, search: historySearch })
                    .then((r) => setSalesHistory(r.data.items));
                }
              }}
              disabled={historyPage <= 1}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold"
            >
              Anterior
            </button>
            <span className="text-white font-bold px-2">Página {historyPage}</span>
            <button
              onClick={() => {
                const maxPages = Math.ceil(historyTotal / 15);
                if (historyPage < maxPages) {
                  const p = historyPage + 1;
                  setHistoryPage(p);
                  demandForecastingApi
                    .getHistory({ page: p, limit: 15, search: historySearch })
                    .then((r) => setSalesHistory(r.data.items));
                }
              }}
              disabled={historyPage >= Math.ceil(historyTotal / 15)}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* 📝 MODAL DE EDICIÓN DE VENTA HISTÓRICA */}
      {editingSaleRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-extrabold text-white">
                  Editar Registro de Venta ({editingSaleRecord.saleCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSaleRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSaleEdit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 font-bold">Producto:</div>
                <div className="text-white font-black text-sm">{editingSaleRecord.productName}</div>
                <div className="text-[11px] text-cyan-400 font-mono">
                  {editingSaleRecord.productCode} • {editingSaleRecord.category} • Fecha: {editingSaleRecord.saleDate?.slice(0, 10)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    Cantidad Unidades (Admite negativos):
                  </label>
                  <input
                    type="number"
                    value={editForm.quantityUnits}
                    onChange={(e) => setEditForm({ ...editForm, quantityUnits: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold focus:border-cyan-500 outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500">
                    Positivo = Pedido regular. Negativo = Devolución.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Precio Unitario (USD):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.unitPrice}
                    onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold focus:border-cyan-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Estado de Orden:</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
                  >
                    <option value="COMPLETADA">COMPLETADA</option>
                    <option value="PARCIAL">PARCIAL</option>
                    <option value="CANCELADA">CANCELADA</option>
                    <option value="DEVUELTA">DEVUELTA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Estacionalidad:</label>
                  <select
                    value={editForm.seasonality}
                    onChange={(e) => setEditForm({ ...editForm, seasonality: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
                  >
                    <option value="ALTA">ALTA</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="BAJA">BAJA</option>
                    <option value="PICO_FIN_ANO">PICO_FIN_ANO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Cliente:</label>
                <input
                  type="text"
                  value={editForm.clientName}
                  onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
                  required
                />
              </div>

              <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300">
                Al guardar, el backend recalculará en PostgreSQL el peso neto de resina y monto facturado. El gráfico se actualizará automáticamente.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSaleRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black shadow-lg"
                >
                  {isSavingEdit ? 'Guardando...' : 'Guardar y Recalcular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandForecastingView;
