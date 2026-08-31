import type { RawMaterial, BatchEntry, ProductionRequest, ScrapRecord, StockAlert, UserProfile } from '../types';

export interface DashboardKPIs {
  totalMateriaPrimaKg: number;
  stockDisponibleKg: number;
  materialesStockBajoCount: number;
  materiaPrimaRecibidaKg: number;
  consumoDelMesKg: number;
  mermaDelMesKg: number;
}

export const mockDashboardKPIs: DashboardKPIs = {
  totalMateriaPrimaKg: 12500,
  stockDisponibleKg: 9850,
  materialesStockBajoCount: 8,
  materiaPrimaRecibidaKg: 1250,
  consumoDelMesKg: 4800,
  mermaDelMesKg: 350,
};

export const mockMaterials: RawMaterial[] = [
  {
    id: 'mat-001',
    code: 'MP001',
    name: 'Polipropileno (PP)',
    type: 'RESINA',
    category: 'INYECCION',
    density: 0.905,
    meltFlowIndex: 12.0,
    unit: 'kg',
    currentStockKg: 1500,
    minStockKg: 2000,
    maxCapacityKg: 5000,
    costPerKg: 1.85,
    siloLocation: 'Almacén 1 (Silo A1)',
    status: 'BAJO',
    colorCode: '#06b6d4',
    supplier: 'Proveedor A (Petroquímica)',
    lastUpdated: '18/08/2026',
  },
  {
    id: 'mat-002',
    code: 'MP002',
    name: 'Masterbatch Negro (MB)',
    type: 'MASTERBATCH',
    category: 'EXTRUSION',
    density: 1.25,
    meltFlowIndex: 8.5,
    unit: 'kg',
    currentStockKg: 250,
    minStockKg: 300,
    maxCapacityKg: 1000,
    costPerKg: 3.20,
    siloLocation: 'Almacén 1 (Estante B)',
    status: 'BAJO',
    colorCode: '#f59e0b',
    supplier: 'Proveedor B (Pigmentos)',
    lastUpdated: '18/08/2026',
  },
  {
    id: 'mat-003',
    code: 'MP003',
    name: 'Policloruro de Vinilo (PVC)',
    type: 'RESINA',
    category: 'EXTRUSION',
    density: 1.40,
    meltFlowIndex: 1.2,
    unit: 'kg',
    currentStockKg: 900,
    minStockKg: 800,
    maxCapacityKg: 3000,
    costPerKg: 1.45,
    siloLocation: 'Almacén 2 (Silo C)',
    status: 'OPTIMO',
    colorCode: '#10b981',
    supplier: 'Proveedor C (Polímeros)',
    lastUpdated: '19/08/2026',
  },
  {
    id: 'mat-004',
    code: 'MP004',
    name: 'Polietileno de Alta Densidad (HDPE)',
    type: 'RESINA',
    category: 'SOPLADO',
    density: 0.955,
    meltFlowIndex: 0.35,
    unit: 'kg',
    currentStockKg: 4200,
    minStockKg: 3000,
    maxCapacityKg: 8000,
    costPerKg: 1.90,
    siloLocation: 'Almacén 1 (Silo A2)',
    status: 'OPTIMO',
    colorCode: '#3b82f6',
    supplier: 'Proveedor A (Petroquímica)',
    lastUpdated: '19/08/2026',
  },
  {
    id: 'mat-005',
    code: 'MP005',
    name: 'Polietileno Tereftalato (PET Cristal)',
    type: 'RESINA',
    category: 'SOPLADO',
    density: 1.38,
    meltFlowIndex: 2.5,
    unit: 'kg',
    currentStockKg: 3000,
    minStockKg: 2500,
    maxCapacityKg: 6000,
    costPerKg: 1.75,
    siloLocation: 'Almacén 2 (Silo D)',
    status: 'OPTIMO',
    colorCode: '#8b5cf6',
    supplier: 'Proveedor D (Resinas del Sur)',
    lastUpdated: '17/08/2026',
  },
  {
    id: 'mat-006',
    code: 'MP006',
    name: 'Aditivo Anti-UV y Desmoldante',
    type: 'ADITIVO',
    category: 'INYECCION',
    density: 1.05,
    meltFlowIndex: 5.0,
    unit: 'kg',
    currentStockKg: 180,
    minStockKg: 200,
    maxCapacityKg: 500,
    costPerKg: 4.50,
    siloLocation: 'Almacén 1 (Estante A)',
    status: 'BAJO',
    colorCode: '#ec4899',
    supplier: 'Proveedor E (Química Fina)',
    lastUpdated: '18/08/2026',
  },
  {
    id: 'mat-007',
    code: 'MP007',
    name: 'Material Recuperado Molido (PP)',
    type: 'RECUPERADO',
    category: 'INYECCION',
    density: 0.910,
    meltFlowIndex: 14.0,
    unit: 'kg',
    currentStockKg: 1450,
    minStockKg: 1000,
    maxCapacityKg: 4000,
    costPerKg: 0.95,
    siloLocation: 'Almacén Reciclaje (Tolva R1)',
    status: 'OPTIMO',
    colorCode: '#14b8a6',
    supplier: 'Circuito Molino Interno',
    lastUpdated: 'Hoy',
  },
  {
    id: 'mat-008',
    code: 'MP008',
    name: 'Masterbatch Blanco Rutilo',
    type: 'MASTERBATCH',
    category: 'EXTRUSION',
    density: 1.65,
    meltFlowIndex: 7.0,
    unit: 'kg',
    currentStockKg: 120,
    minStockKg: 150,
    maxCapacityKg: 600,
    costPerKg: 3.60,
    siloLocation: 'Almacén 1 (Estante B)',
    status: 'BAJO',
    colorCode: '#f43f5e',
    supplier: 'Proveedor B (Pigmentos)',
    lastUpdated: '18/08/2026',
  }
];

export const mockEntries: BatchEntry[] = [
  {
    id: 'ent-01',
    entryCode: 'ENT-2026-001',
    materialId: 'mat-001',
    materialName: 'Polipropileno (PP)',
    supplierName: 'Proveedor A',
    supplierBatch: 'PP-2026-0818',
    quantityKg: 1000,
    unitPricePerKg: 1.85,
    totalCostUsd: 1850.0,
    invoiceNumber: 'FAC-00258',
    siloDestination: 'Almacén 1',
    qualityCertificatePassed: true,
    receivedBy: 'Rodrigo Alarcón (Almacén)',
    createdAt: '18/08/2026'
  },
  {
    id: 'ent-02',
    entryCode: 'ENT-2026-002',
    materialId: 'mat-002',
    materialName: 'Masterbatch Negro (MB)',
    supplierName: 'Proveedor B',
    supplierBatch: 'MB-2026-0818',
    quantityKg: 250,
    unitPricePerKg: 3.20,
    totalCostUsd: 800.0,
    invoiceNumber: 'FAC-00259',
    siloDestination: 'Almacén 1',
    qualityCertificatePassed: true,
    receivedBy: 'Rodrigo Alarcón (Almacén)',
    createdAt: '18/08/2026'
  },
  {
    id: 'ent-03',
    entryCode: 'ENT-2026-003',
    materialId: 'mat-003',
    materialName: 'Policloruro de Vinilo (PVC)',
    supplierName: 'Proveedor C',
    supplierBatch: 'PVC-2026-0819',
    quantityKg: 900,
    unitPricePerKg: 1.45,
    totalCostUsd: 1305.0,
    invoiceNumber: 'FAC-00260',
    siloDestination: 'Almacén 2',
    qualityCertificatePassed: true,
    receivedBy: 'Rodrigo Alarcón (Almacén)',
    createdAt: '19/08/2026'
  }
];

export interface StockMovement {
  id: string;
  fecha: string;
  materiaPrima: string;
  tipo: 'Entrada' | 'Salida' | 'Devolución' | 'Ajuste' | 'Merma' | 'Transferencia';
  cantidadKg: number;
  usuario: string;
  origenDestino: string;
}

export const mockMovements: StockMovement[] = [
  {
    id: 'mov-01',
    fecha: '18/08/2026',
    materiaPrima: 'Polipropileno',
    tipo: 'Entrada',
    cantidadKg: 1000,
    usuario: 'Juan (Almacén)',
    origenDestino: 'Proveedor A'
  },
  {
    id: 'mov-02',
    fecha: '18/08/2026',
    materiaPrima: 'Polipropileno',
    tipo: 'Salida',
    cantidadKg: -500,
    usuario: 'Pedro (Producción)',
    origenDestino: 'Línea de Inyección 01'
  },
  {
    id: 'mov-03',
    fecha: '19/08/2026',
    materiaPrima: 'Polipropileno',
    tipo: 'Devolución',
    cantidadKg: 20,
    usuario: 'Pedro (Producción)',
    origenDestino: 'Sobrante Devuelto a Almacén 1'
  },
  {
    id: 'mov-04',
    fecha: '19/08/2026',
    materiaPrima: 'Masterbatch Negro',
    tipo: 'Salida',
    cantidadKg: -20,
    usuario: 'Pedro (Producción)',
    origenDestino: 'Línea de Inyección 01'
  }
];

export const mockRequests: ProductionRequest[] = [
  {
    id: 'req-01',
    orderNumber: 'ORDEN #00025',
    line: 'Línea de Producción A',
    processType: 'INYECCION',
    productName: 'Envase plástico 1 litro / Botella (5.000 unidades)',
    requiredMaterials: [
      { materialName: 'Polipropileno', quantityKg: 500 },
      { materialName: 'Masterbatch', quantityKg: 20 },
      { materialName: 'Aditivo', quantityKg: 5 }
    ],
    requestedBy: 'Encargado de Producción',
    status: 'PENDIENTE',
    createdAt: 'Hoy, 08:30 AM'
  },
  {
    id: 'req-02',
    orderNumber: 'ORDEN #00024',
    line: 'Línea de Extrusión 02',
    processType: 'EXTRUSION',
    productName: 'Film Termocontraíble 50 micras (1.200 kg)',
    requiredMaterials: [
      { materialName: 'HDPE Resina', quantityKg: 1000 },
      { materialName: 'Material Recuperado', quantityKg: 200 }
    ],
    requestedBy: 'Encargado de Producción',
    status: 'APROBADA',
    createdAt: 'Ayer, 02:15 PM'
  }
];

export const mockScrap: ScrapRecord[] = [
  {
    id: 'scr-01',
    orderNumber: 'ORDEN #00025',
    machineLine: 'Inyectora 320T',
    rawMaterialUsedKg: 500,
    finishedProductKg: 480,
    recoverableScrapKg: 15,
    discardScrapKg: 5,
    scrapPercentage: 4.0,
    cause: 'Desperdicio durante producción y arranque de máquina',
    operator: 'Operador 01',
    createdAt: '19/08/2026'
  }
];

export const mockAlerts: StockAlert[] = [
  {
    id: 'alt-01',
    materialName: 'Masterbatch Negro (MB002)',
    silo: 'Almacén 1 (Estante B)',
    currentKg: 30,
    minKg: 50,
    severity: 'CRITICAL',
    timestamp: 'Hoy, 10:00 AM'
  },
  {
    id: 'alt-02',
    materialName: 'Polipropileno (MP001)',
    silo: 'Almacén 1 (Silo A1)',
    currentKg: 1500,
    minKg: 2000,
    severity: 'WARNING',
    timestamp: '18/08/2026'
  },
  {
    id: 'alt-03',
    materialName: 'Aditivo Anti-UV (MP006)',
    silo: 'Almacén 1 (Estante A)',
    currentKg: 180,
    minKg: 200,
    severity: 'WARNING',
    timestamp: '18/08/2026'
  },
  {
    id: 'alt-04',
    materialName: 'Masterbatch Blanco (MP008)',
    silo: 'Almacén 1 (Estante B)',
    currentKg: 120,
    minKg: 150,
    severity: 'WARNING',
    timestamp: '18/08/2026'
  }
];

export const mockUsers: UserProfile[] = [
  {
    id: 'u-01',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@plastcontrol.com',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    shift: 'Administrador General'
  },
  {
    id: 'u-02',
    name: 'Jorge Ramírez',
    email: 'jorge.ramirez@plastcontrol.com',
    role: 'ALMACEN',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    shift: 'Encargado de Almacén'
  },
  {
    id: 'u-03',
    name: 'Mario Paredes',
    email: 'mario.paredes@plastcontrol.com',
    role: 'PRODUCCION',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    shift: 'Encargado de Producción'
  },
  {
    id: 'u-04',
    name: 'Elena Torres',
    email: 'elena.torres@plastcontrol.com',
    role: 'SUPERVISOR',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&auto=format&fit=crop&q=80',
    shift: 'Supervisión Operativa'
  }
];
