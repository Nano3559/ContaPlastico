export type UserRole = 'ADMIN' | 'ALMACEN' | 'PRODUCCION' | 'SUPERVISOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  shift: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export type MaterialType = 'RESINA' | 'MASTERBATCH' | 'ADITIVO' | 'RECUPERADO';

export type ProcessType = 'EXTRUSION' | 'INYECCION' | 'SOPLADO' | 'TERMOFORMADO';

export type StockStatus = 'OPTIMO' | 'BAJO' | 'CRITICO';

export type RequestStatus = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'COMPLETADA';

export type ScrapCause = 'ARRANQUE_MAQUINA' | 'CAMBIO_COLOR' | 'ATASCO' | 'DESCALIBRACION';

export type AlertSeverity = 'WARNING' | 'CRITICAL';

export type MovementType = 'ENTRADA' | 'SALIDA' | 'CONSUMO' | 'MERMA';

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  type: MaterialType;
  category: ProcessType;
  density: number;
  meltFlowIndex: number;
  unit: string;
  currentStockKg: number;
  minStockKg: number;
  maxCapacityKg: number;
  siloLocation: string;
  status: StockStatus;
  supplierId?: string | null;
  supplier?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface RawMaterialFilters {
  search?: string;
  type?: MaterialType;
  minStockAlert?: boolean;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface StockAlert {
  id: string;
  materialId: string;
  materialName: string;
  currentStockKg: number;
  minStockKg: number;
  severity: AlertSeverity;
  triggeredAt: string;
}

export interface BatchEntryPayload {
  materialId: string;
  supplierId: string;
  supplierBatchNumber: string;
  quantityKg: number;
  invoiceNumber: string;
  qualityCertificate: boolean;
  siloOrWarehouseLocation: string;
  operatorNotes: string;
}

export interface ProductionRequestPayload {
  orderCode: string;
  line: string;
  targetProduct: string;
  requiredMaterials: Array<{
    materialId: string;
    quantityKg: number;
  }>;
}

export interface ScrapPayload {
  productionOrderId: string;
  consumedRawMaterialKg: number;
  producedGoodKg: number;
  scrapRecoverableKg: number;
  scrapDiscardKg: number;
  cause: ScrapCause;
}

export interface ProductionRequestItem {
  id: string;
  productionRequestId: string;
  materialId: string;
  quantityKg: number;
  material: RawMaterial;
}

export interface ProductionRequest {
  id: string;
  orderCode: string;
  line: string;
  processType: ProcessType;
  targetProduct: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  requestedById: string;
  requestedBy: {
    id: string;
    name: string;
  };
  materials: ProductionRequestItem[];
}

export interface Movement {
  id: string;
  type: MovementType;
  quantityKg: number;
  materialId: string;
  material: {
    id: string;
    code: string;
    name: string;
  };
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  productionRequestId?: string | null;
  productionRequest?: {
    id: string;
    orderCode: string;
    status: RequestStatus;
  } | null;
  notes?: string | null;
  createdAt: string;
}

export interface MovementFilters {
  type?: MovementType;
  materialId?: string;
}

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  EntryScreen: undefined;
  RequestsScreen: undefined;
};

export type MainTabParamList = {
  Inicio: undefined;
  Stock: undefined;
  Movimientos: undefined;
  Alertas: undefined;
  Perfil: undefined;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  ALMACEN: 'Almacén',
  PRODUCCION: 'Producción',
  SUPERVISOR: 'Supervisor',
};

export const SHIFT_LABELS: Record<string, string> = {
  TURNO_MANANA: 'Turno Mañana',
  TURNO_TARDE: 'Turno Tarde',
  TURNO_NOCHE: 'Turno Noche',
  MANANA: 'Turno Mañana',
  TARDE: 'Turno Tarde',
  NOCHE: 'Turno Noche',
  MAÑANA: 'Turno Mañana',
  General: 'Turno General',
  'Mañana': 'Turno Mañana',
  'Tarde': 'Turno Tarde',
  'Noche': 'Turno Noche',
};

export function shiftLabel(shift?: string | null): string | null {
  if (!shift) return null;
  const key = shift.trim().toUpperCase();
  if (SHIFT_LABELS[key]) return SHIFT_LABELS[key];
  if (SHIFT_LABELS[shift]) return SHIFT_LABELS[shift];
  return shift;
}

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  RESINA: 'Resina',
  MASTERBATCH: 'Masterbatch',
  ADITIVO: 'Aditivo',
  RECUPERADO: 'Recuperado',
};

export const PROCESS_LABELS: Record<ProcessType, string> = {
  EXTRUSION: 'Extrusión',
  INYECCION: 'Inyección',
  SOPLADO: 'Soplado',
  TERMOFORMADO: 'Termoformado',
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  OPTIMO: 'Óptimo',
  BAJO: 'Bajo',
  CRITICO: 'Crítico',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  COMPLETADA: 'Completada',
};

export const SCRAP_CAUSE_LABELS: Record<ScrapCause, string> = {
  ARRANQUE_MAQUINA: 'Arranque de máquina',
  CAMBIO_COLOR: 'Cambio de color',
  ATASCO: 'Atasco',
  DESCALIBRACION: 'Descalibración',
};

export const PRODUCTION_LINES: Array<{ value: string; label: string }> = [
  { value: 'EXTRUSION_01', label: 'Extrusión 01' },
  { value: 'EXTRUSION_02', label: 'Extrusión 02' },
  { value: 'INYECCION_01', label: 'Inyección 01' },
  { value: 'INYECCION_02', label: 'Inyección 02' },
  { value: 'SOPLADO_01', label: 'Soplado 01' },
  { value: 'TERMOFORMADO_01', label: 'Termoformado 01' },
];

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  WARNING: 'Advertencia',
  CRITICAL: 'Crítico',
};
