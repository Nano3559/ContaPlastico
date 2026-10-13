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

export interface EppDetectionResult {
  hasHelmet: boolean;
  helmetConfidence: number; // 0 - 100
  hasVest: boolean;
  vestConfidence: number; // 0 - 100
  hasGlasses: boolean;
  glassesConfidence: number; // 0 - 100
  hasMask?: boolean;
  maskConfidence?: number;
  overallScore: number; // 0 - 100
  compliant: boolean;
  detectedAt: string;
  rejectionReasons: string[];
}

export interface SafetyAuditRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  shift: string;
  station: string; // ej: "Báscula Patio Norte", "Entrada Almacén Central"
  timestamp: string;
  compliant: boolean;
  hasHelmet: boolean;
  hasVest: boolean;
  hasGlasses: boolean;
  score: number;
  photoUrl?: string; // Data URL thumbnail
  bypassUsed?: boolean;
  supervisorNotes?: string;
}

export interface SafetyPass {
  token: string;
  userId: string;
  userName: string;
  approvedAt: string;
  expiresAt: string;
  station: string;
  details: EppDetectionResult;
}

