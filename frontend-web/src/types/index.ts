export type MaterialType = 'RESINA' | 'MASTERBATCH' | 'ADITIVO' | 'RECUPERADO';
export type ProcessCategory = 'EXTRUSION' | 'INYECCION' | 'SOPLADO' | 'TERMOFORMADO';
export type StockStatus = 'OPTIMO' | 'BAJO' | 'CRITICO';

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  type: MaterialType;
  category: ProcessCategory;
  density: number; // g/cm³
  meltFlowIndex: number; // g/10min (MFI)
  unit: string;
  currentStockKg: number;
  minStockKg: number;
  maxCapacityKg: number;
  costPerKg?: number; // Precio de compra USD/kg
  siloLocation: string;
  status: StockStatus;
  colorCode: string;
  supplier: string;
  lastUpdated: string;
}

export interface BatchEntry {
  id: string;
  entryCode: string;
  materialId: string;
  materialName: string;
  supplierName: string;
  supplierBatch: string;
  quantityKg: number;
  unitPricePerKg?: number; // Precio de compra por kg en factura
  totalCostUsd?: number; // Costo total del lote (USD)
  invoiceNumber: string;
  siloDestination: string;
  qualityCertificatePassed: boolean;
  receivedBy: string;
  createdAt: string;
}

export interface ProductionRequest {
  id: string;
  orderNumber: string;
  line: string;
  processType: ProcessCategory;
  productName: string;
  requiredMaterials: {
    materialId?: string;
    materialName: string;
    quantityKg: number;
  }[];
  requestedBy: string;
  status: 'PENDIENTE' | 'APROBADA' | 'EN_PROCESO' | 'COMPLETADA';
  createdAt: string;
}

export interface ScrapRecord {
  id: string;
  orderNumber: string;
  machineLine: string;
  rawMaterialUsedKg: number;
  finishedProductKg: number;
  recoverableScrapKg: number; // Mermas molibles
  discardScrapKg: number; // Purgas no recuperables
  scrapPercentage: number;
  cause: string;
  operator: string;
  createdAt: string;
}

export interface StockAlert {
  id: string;
  materialName: string;
  silo: string;
  currentKg: number;
  minKg: number;
  severity: 'WARNING' | 'CRITICAL';
  timestamp: string;
}

export type UserRole = 'ADMIN' | 'ALMACEN' | 'PRODUCCION' | 'SUPERVISOR';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  shift: string;
}

export interface SaleRecord {
  id: string;
  saleCode: string;
  saleDate: string;
  productCode: string;
  productName: string;
  category: ProcessCategory;
  clientName: string;
  clientSector?: string;
  clientRegion?: string;
  quantityUnits: number;
  unitWeightKg: number;
  totalWeightKg: number;
  unitPrice: number;
  totalAmount: number;
  rawMaterialId?: string;
  seasonality?: string;
  status: string;
  createdAt: string;
  rawMaterial?: {
    code: string;
    name: string;
    siloLocation: string;
  };
}

export interface HistoricalDemandDataPoint {
  periodKey: string;
  periodLabel: string;
  date: string;
  actualUnits: number;
  actualWeightKg: number;
  actualRevenue: number;
  transactionsCount: number;
}

export interface ForecastDemandDataPoint {
  periodKey: string;
  periodLabel: string;
  date: string;
  forecastUnits: number;
  lowerBoundUnits: number;
  upperBoundUnits: number;
  forecastWeightKg: number;
  forecastRevenue: number;
  forecastRevenueBOB?: number;
  confidenceLevel: number;
  growthVsPreviousPeriod: number;
  isSimulated?: boolean;
  simulatedUnits?: number;
  simulatedWeightKg?: number;
  simulatedRevenue?: number;
  simulatedRevenueBOB?: number;
  simulatedResinCostUSD?: number;
  simulatedResinCostBOB?: number;
  simulatedMarginUSD?: number;
  simulatedMarginPct?: number;
}

export interface ResinRequirementItem {
  materialCode: string;
  materialName: string;
  materialType: string;
  siloLocation: string;
  currentStockKg: number;
  minStockKg: number;
  requiredKgNextPeriod: number;
  requiredKgTotalForecast: number;
  stockStatusAfterForecast: 'OPTIMO' | 'BAJO' | 'CRITICO';
  estimatedDaysUntilStockout: number;
  replenishmentCostUSD?: number;
  replenishmentCostBOB?: number;
  recycledSharePct?: number;
}

export interface DemandPredictionResult {
  granularity: 'month' | 'week' | 'year';
  algorithm: string;
  periodsForecasted: number;
  modelAccuracyScore: number;
  mapePercent: number;
  historical: HistoricalDemandDataPoint[];
  forecast: ForecastDemandDataPoint[];
  resinRequirements: ResinRequirementItem[];
  simulation?: {
    isSimulated: boolean;
    demandDeltaPct: number;
    scrapDeltaPct: number;
    exchangeRateBOB?: number;
    priceDeltaPct?: number;
    resinCostDeltaPct?: number;
    recycledMaterialPct?: number;
    plantEfficiencyPct?: number;
    simulatedResinRequirements?: ResinRequirementItem[];
  };
  metadata: {
    totalHistoricalDataPoints: number;
    trainedUpToDate: string;
    filterProduct: string;
    filterCategory: string;
  };
}

export interface DemandSummary {
  totalTransactions: number;
  totalUnitsSold: number;
  totalPlasticTons: number;
  totalRevenueUSD: number;
  averageOrderWeightKg: number;
  yoyGrowthPercent: number;
  topProducts: {
    productCode: string;
    productName: string;
    category: ProcessCategory;
    totalUnits: number;
    totalWeightKg: number;
    totalRevenue: number;
    ordersCount: number;
  }[];
  materialsInInventory: {
    id: string;
    code: string;
    name: string;
    currentStockKg: number;
    minStockKg: number;
    siloLocation: string;
    status: StockStatus;
  }[];
}

