/**
 * PlastControl — Capa de Servicios API para Frontend Web (Persona 2)
 * 
 * Conecta con el Backend NestJS (Persona 1) según el contrato API.md.
 * Incluye fallback inteligente a datos locales (mock) cuando el backend no esté activo.
 */

import {
  mockMaterials,
  mockEntries,
  mockRequests,
  mockScrap,
  mockAlerts,
  mockUsers,
  mockDashboardKPIs,
  mockMovements,
  type DashboardKPIs,
  type StockMovement
} from '../data/mockData';
import type {
  RawMaterial,
  BatchEntry,
  ProductionRequest,
  ScrapRecord,
  StockAlert,
  UserProfile,
  UserRole
} from '../types';

const getApiBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) return 'http://localhost:3000/api';
  }
  
  return 'https://contaplastico-backend.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

const normalizeDate = (value?: string) => {
  if (!value) return 'Reciente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const normalizeBatchEntry = (entry: any): BatchEntry => ({
  id: entry.id,
  entryCode: entry.entryCode || 'ENT-N/A',
  materialId: entry.materialId || entry.material?.id || '',
  materialName: entry.materialName || entry.material?.name || 'Materia prima',
  supplierName: entry.supplierName || entry.supplier?.name || 'Proveedor',
  supplierBatch: entry.supplierBatch || entry.supplierBatchNumber || 'Lote sin registro',
  quantityKg: Number(entry.quantityKg || 0),
  invoiceNumber: entry.invoiceNumber || 'FAC-SIN-NUMERO',
  siloDestination: entry.siloDestination || entry.siloOrWarehouseLocation || 'Silo no asignado',
  qualityCertificatePassed: entry.qualityCertificatePassed ?? entry.qualityCertificate ?? true,
  receivedBy: entry.receivedBy?.name || entry.receivedBy || 'Operador',
  createdAt: normalizeDate(entry.createdAt)
});

const normalizeProductionRequest = (req: any): ProductionRequest => ({
  id: req.id,
  orderNumber: req.orderCode || req.orderNumber || 'OP-SIN-CODIGO',
  line: req.line || 'Línea no registrada',
  processType: req.processType || 'EXTRUSION',
  productName: req.targetProduct || req.productName || 'Producto no registrado',
  requiredMaterials: (req.materials || req.requiredMaterials || []).map((item: any) => ({
    materialId: item.materialId || item.material?.id,
    materialName: item.materialName || item.material?.name || 'Material',
    quantityKg: Number(item.quantityKg || 0)
  })),
  requestedBy: req.requestedBy?.name || req.requestedBy || 'Operador',
  status: req.status || 'PENDIENTE',
  createdAt: normalizeDate(req.createdAt)
});

const normalizeScrapRecord = (scrap: any): ScrapRecord => ({
  id: scrap.id,
  orderNumber: scrap.productionRequest?.orderCode || scrap.orderNumber || 'OP-SIN-CODIGO',
  machineLine: scrap.productionRequest?.line || scrap.machineLine || 'Línea no registrada',
  rawMaterialUsedKg: Number(scrap.rawMaterialUsedKg || 0),
  finishedProductKg: Number(scrap.finishedProductKg || 0),
  recoverableScrapKg: Number(scrap.recoverableScrapKg || 0),
  discardScrapKg: Number(scrap.discardScrapKg || 0),
  scrapPercentage: Number(scrap.scrapPercentage || 0),
  cause: String(scrap.cause || 'SIN_CAUSA'),
  operator: scrap.operator?.name || scrap.operator || 'Operador',
  createdAt: normalizeDate(scrap.createdAt)
});

const normalizeStockAlert = (alert: any): StockAlert => ({
  id: alert.id,
  materialName: alert.material?.name || alert.materialName || 'Materia prima',
  silo: alert.material?.siloLocation || alert.silo || 'Silo no asignado',
  currentKg: Number(alert.currentStockKg || alert.currentKg || 0),
  minKg: Number(alert.minStockKg || alert.minKg || 0),
  severity: (alert.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING') as 'WARNING' | 'CRITICAL',
  timestamp: normalizeDate(alert.createdAt || alert.timestamp)
});

// Estado de conexión
let isBackendReachable = false;
let forceMockMode = false;

// Helper para headers de autenticación
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('plastcontrol_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

/**
 * Petición genérica con timeout y fallback a datos mock
 */
async function requestWithFallback<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackFn: () => T | Promise<T>
): Promise<{ data: T; isLive: boolean; error?: string }> {
  if (forceMockMode) {
    return { data: await fallbackFn(), isLive: false };
  }

  const doFetch = async (retryAuth = false): Promise<{ data: T; isLive: boolean; error?: string }> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        isBackendReachable = true;
        return { data, isLive: true };
      }

      const errorBody = await response.text();
      const errorMessage = errorBody || `HTTP ${response.status}`;
      isBackendReachable = true;

      if ((response.status === 401 || response.status === 403) && !retryAuth) {
        const hasStoredToken = !!localStorage.getItem('plastcontrol_token');
        if (hasStoredToken) {
          localStorage.removeItem('plastcontrol_token');
          localStorage.removeItem('plastcontrol_user');
        }

        try {
          await authApi.login('carlos.mendoza@plastcontrol.com', 'admin123');
          return doFetch(true);
        } catch {
          // continuar con fallback mock si el login no se puede completar
        }
      }

      if ((options.method || 'GET').toUpperCase() !== 'GET') {
        throw new Error(`[API] ${endpoint}: ${errorMessage}`);
      }

      console.warn(`[API] Endpoint ${endpoint} respondió con status ${response.status}. Usando mock.`);
      return { data: await fallbackFn(), isLive: false, error: `HTTP ${response.status}` };
    } catch (error) {
      isBackendReachable = false;
      return { data: await fallbackFn(), isLive: false };
    }
  };

  return doFetch();
}

// -------------------------------------------------------------
// 1. SERVICIO DE AUTENTICACIÓN & USUARIOS (/api/auth & /api/users)
// -------------------------------------------------------------
export const authApi = {
  async login(email: string, password?: string): Promise<{ user: UserProfile; token: string; isLive: boolean }> {
    const res = await requestWithFallback<{ accessToken: string; user: UserProfile }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password: password || '123456' })
      },
      () => {
        const found = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || mockUsers[0];
        return {
          accessToken: 'mock_jwt_token_' + Date.now(),
          user: found
        };
      }
    );

    if (res.data.accessToken) {
      localStorage.setItem('plastcontrol_token', res.data.accessToken);
      localStorage.setItem('plastcontrol_user', JSON.stringify(res.data.user));
    }

    return {
      user: res.data.user,
      token: res.data.accessToken,
      isLive: res.isLive
    };
  },

  logout(): void {
    localStorage.removeItem('plastcontrol_token');
    localStorage.removeItem('plastcontrol_user');
  },

  getStoredUser(): UserProfile | null {
    const userStr = localStorage.getItem('plastcontrol_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  async getUsers(): Promise<{ data: UserProfile[]; isLive: boolean }> {
    return requestWithFallback<UserProfile[]>('/users', { method: 'GET' }, () => mockUsers);
  }
};

// -------------------------------------------------------------
// 2. MATERIAS PRIMAS Y SILOS (/api/raw-materials)
// -------------------------------------------------------------
export const rawMaterialsApi = {
  async getAll(params?: { search?: string; type?: string; minStockAlert?: boolean }): Promise<{ data: RawMaterial[]; isLive: boolean; error?: string }> {
    let query = '';
    if (params) {
      const q = new URLSearchParams();
      if (params.search) q.append('search', params.search);
      if (params.type && params.type !== 'ALL') q.append('type', params.type);
      if (params.minStockAlert) q.append('minStockAlert', 'true');
      query = `?${q.toString()}`;
    }

    const res = await requestWithFallback<any[]>(
      `/raw-materials${query}`,
      { method: 'GET' },
      () => {
        let result = [...mockMaterials];
        if (params?.type && params.type !== 'ALL') {
          result = result.filter(m => m.type === params.type);
        }
        if (params?.search) {
          const s = params.search.toLowerCase();
          result = result.filter(m => m.name.toLowerCase().includes(s) || m.code.toLowerCase().includes(s) || m.siloLocation.toLowerCase().includes(s));
        }
        if (params?.minStockAlert) {
          result = result.filter(m => m.status !== 'OPTIMO');
        }
        return result;
      }
    );

    const mapped: RawMaterial[] = (res.data || []).map((m: any) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      type: m.type || 'RESINA',
      category: m.category || 'EXTRUSION',
      density: Number(m.density) || 0.95,
      meltFlowIndex: Number(m.meltFlowIndex) || 2.0,
      unit: m.unit || 'kg',
      currentStockKg: Number(m.currentStockKg) || 0,
      minStockKg: Number(m.minStockKg) || 1000,
      maxCapacityKg: Number(m.maxCapacityKg) || 20000,
      siloLocation: m.siloLocation || 'Silo A-01',
      status: m.status || (m.currentStockKg < m.minStockKg ? 'BAJO' : 'OPTIMO'),
      colorCode: m.colorCode || (m.type === 'MASTERBATCH' ? '#ec4899' : m.type === 'RECUPERADO' ? '#10b981' : '#06b6d4'),
      supplier: m.supplier?.name || m.supplier || 'Petroquímica Homologada',
      lastUpdated: 'En línea (BD)'
    }));

    return { data: mapped, isLive: res.isLive, error: res.error };
  },

  async getById(id: string): Promise<{ data: RawMaterial | null; isLive: boolean }> {
    return requestWithFallback<RawMaterial | null>(
      `/raw-materials/${id}`,
      { method: 'GET' },
      () => mockMaterials.find(m => m.id === id) || null
    );
  },

  async create(material: Partial<RawMaterial>): Promise<{ data: RawMaterial; isLive: boolean }> {
    const payload = {
      code: material.code || `MP-${Math.floor(100 + Math.random() * 900)}`,
      name: material.name || 'Nueva Resina',
      type: material.type || 'RESINA',
      category: material.category || 'EXTRUSION',
      density: Number(material.density) || 0.95,
      meltFlowIndex: Number(material.meltFlowIndex) || 2.0,
      unit: material.unit?.toUpperCase() || 'KG',
      currentStockKg: Number(material.currentStockKg) || 0,
      minStockKg: Number(material.minStockKg) || 1000,
      maxCapacityKg: Number(material.maxCapacityKg) || 20000,
      siloLocation: material.siloLocation || 'Silo A-01'
    };

    return requestWithFallback<RawMaterial>(
      '/raw-materials',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      () => {
        const newMat: RawMaterial = {
          id: `mat-${Date.now()}`,
          code: payload.code,
          name: payload.name,
          type: payload.type as any,
          category: payload.category as any,
          density: payload.density,
          meltFlowIndex: payload.meltFlowIndex,
          unit: payload.unit,
          currentStockKg: material.currentStockKg || 0,
          minStockKg: payload.minStockKg,
          maxCapacityKg: payload.maxCapacityKg,
          siloLocation: payload.siloLocation,
          status: (material.currentStockKg || 0) < payload.minStockKg ? 'BAJO' : 'OPTIMO',
          colorCode: material.colorCode || '#06b6d4',
          supplier: material.supplier || 'Petroquímica Nacional',
          lastUpdated: 'Recién creado'
        };
        mockMaterials.unshift(newMat);
        return newMat;
      }
    );
  },


  async updateStock(id: string, newStockKg: number): Promise<{ data: { success: boolean }; isLive: boolean }> {
    return requestWithFallback<{ success: boolean }>(
      `/raw-materials/${id}/stock`,
      {
        method: 'PATCH',
        body: JSON.stringify({ currentStockKg: newStockKg })
      },
      () => {
        const item = mockMaterials.find(m => m.id === id);
        if (item) {
          item.currentStockKg = newStockKg;
          item.status = newStockKg > item.minStockKg ? 'OPTIMO' : (newStockKg > item.minStockKg * 0.5 ? 'BAJO' : 'CRITICO');
          item.lastUpdated = 'Recién actualizado';
        }
        return { success: true };
      }
    );
  }
};

// -------------------------------------------------------------
// 3. ENTRADAS DE MATERIA PRIMA Y BÁSCULA (/api/entries)
// -------------------------------------------------------------
export interface CreateBatchEntryDto {
  materialId: string;
  materialName?: string;
  supplierName?: string;
  supplierBatch: string;
  quantityKg: number;
  unitPricePerKg?: number;
  totalCostUsd?: number;
  invoiceNumber: string;
  siloDestination: string;
  qualityCertificatePassed?: boolean;
  notes?: string;
  receivedBy?: string;
}

export const entriesApi = {
  async getAll(): Promise<{ data: BatchEntry[]; isLive: boolean }> {
    const res = await requestWithFallback<any[]>(
      '/entries',
      { method: 'GET' },
      () => mockEntries
    );

    return {
      data: (res.data || []).map(normalizeBatchEntry),
      isLive: res.isLive,
      error: res.error
    };
  },

  async create(dto: CreateBatchEntryDto): Promise<{ data: BatchEntry; isLive: boolean }> {
    return requestWithFallback<BatchEntry>(
      '/entries',
      {
        method: 'POST',
        body: JSON.stringify({
          materialId: dto.materialId,
          supplierId: (dto as any).supplierId,
          supplierBatchNumber: dto.supplierBatch,
          quantityKg: dto.quantityKg,
          unitPricePerKg: dto.unitPricePerKg,
          invoiceNumber: dto.invoiceNumber,
          siloOrWarehouseLocation: dto.siloDestination,
          qualityCertificate: dto.qualityCertificatePassed ?? true,
          operatorNotes: dto.notes
        })
      },
      () => {
        const targetMat = mockMaterials.find(m => m.id === dto.materialId);
        const priceKg = dto.unitPricePerKg || targetMat?.costPerKg || 1.85;
        const newEntry: BatchEntry = {
          id: `ent-${Date.now()}`,
          entryCode: `ENT-2026-${Math.floor(100 + Math.random() * 900)}`,
          materialId: dto.materialId,
          materialName: dto.materialName || targetMat?.name || 'Resina Polimérica',
          supplierName: dto.supplierName || targetMat?.supplier || 'Proveedor Petroquímico',
          supplierBatch: dto.supplierBatch,
          quantityKg: dto.quantityKg,
          unitPricePerKg: priceKg,
          totalCostUsd: dto.totalCostUsd || (dto.quantityKg * priceKg),
          invoiceNumber: dto.invoiceNumber,
          siloDestination: dto.siloDestination || targetMat?.siloLocation || 'Silo 1',
          qualityCertificatePassed: dto.qualityCertificatePassed ?? true,
          receivedBy: dto.receivedBy || 'Operador de Báscula',
          createdAt: 'Hace un momento'
        };

        mockEntries.unshift(newEntry);

        // Actualizar stock local si se está en mock
        if (targetMat) {
          targetMat.currentStockKg += dto.quantityKg;
          targetMat.status = targetMat.currentStockKg > targetMat.minStockKg ? 'OPTIMO' : 'BAJO';
          targetMat.lastUpdated = 'Recién ingresado';
        }

        // Registrar movimiento
        mockMovements.unshift({
          id: `mov-${Date.now()}`,
          fecha: 'Hoy',
          materiaPrima: newEntry.materialName,
          tipo: 'Entrada',
          cantidadKg: dto.quantityKg,
          usuario: newEntry.receivedBy,
          origenDestino: `Proveedor -> ${newEntry.siloDestination}`
        });

        return newEntry;
      }
    );
  }
};

// -------------------------------------------------------------
// 4. SOLICITUDES Y DESPACHOS A PRODUCCIÓN (/api/production-requests)
// -------------------------------------------------------------
export const productionRequestsApi = {
  async getAll(): Promise<{ data: ProductionRequest[]; isLive: boolean }> {
    const res = await requestWithFallback<any[]>(
      '/production-requests',
      { method: 'GET' },
      () => mockRequests
    );

    return {
      data: (res.data || []).map(normalizeProductionRequest),
      isLive: res.isLive,
      error: res.error
    };
  },

  async create(req: Partial<ProductionRequest> & { orderCode?: string; targetProduct?: string; requiredMaterials?: Array<{ materialId?: string; materialName?: string; quantityKg: number }> }): Promise<{ data: ProductionRequest; isLive: boolean }> {
    return requestWithFallback<ProductionRequest>(
      '/production-requests',
      {
        method: 'POST',
        body: JSON.stringify({
          orderCode: req.orderCode || req.orderNumber,
          line: req.line,
          processType: req.processType,
          targetProduct: req.targetProduct || req.productName,
          requiredMaterials: (req.requiredMaterials || []).map((item) => ({
            materialId: item.materialId,
            quantityKg: Number(item.quantityKg || 0)
          }))
        })
      },
      () => {
        const newReq: ProductionRequest = {
          id: `req-${Date.now()}`,
          orderNumber: req.orderCode || req.orderNumber || `OP-2026-${Math.floor(100 + Math.random() * 900)}`,
          line: req.line || 'Línea de Extrusión 01',
          processType: req.processType || 'EXTRUSION',
          productName: req.targetProduct || req.productName || 'Producto Plástico',
          requiredMaterials: req.requiredMaterials || [{ materialName: 'Polímero Base', quantityKg: 500 }],
          requestedBy: req.requestedBy || 'Supervisor de Turno',
          status: 'PENDIENTE',
          createdAt: 'Hace un momento'
        };
        mockRequests.unshift(newReq);
        return newReq;
      }
    );
  },

  async approve(id: string): Promise<{ data: { success: boolean }; isLive: boolean }> {
    return requestWithFallback<{ success: boolean }>(
      `/production-requests/${id}/approve`,
      { method: 'PATCH' },
      () => {
        const target = mockRequests.find(r => r.id === id);
        if (target) {
          target.status = 'APROBADA';
        }
        return { success: true };
      }
    );
  }
};

// -------------------------------------------------------------
// 5. CONTROL DE MERMA Y CONSUMO (/api/production/scrap)
// -------------------------------------------------------------
export interface CreateScrapDto {
  productionOrderId: string;
  materialId?: string;
  consumedRawMaterialKg: number;
  producedGoodKg: number;
  scrapRecoverableKg: number;
  scrapDiscardKg: number;
  cause: string;
  notes?: string;
  machineLine?: string;
  operator?: string;
}

export const scrapApi = {
  async getAll(): Promise<{ data: ScrapRecord[]; isLive: boolean }> {
    const res = await requestWithFallback<any[]>(
      '/production/scrap',
      { method: 'GET' },
      () => mockScrap
    );

    return {
      data: (res.data || []).map(normalizeScrapRecord),
      isLive: res.isLive,
      error: res.error
    };
  },

  async create(dto: CreateScrapDto): Promise<{ data: ScrapRecord; isLive: boolean }> {
    const cause = dto.cause?.toString().toUpperCase().includes('CAMBIO') || dto.cause?.toString().toUpperCase().includes('COLOR')
      ? 'CAMBIO_COLOR'
      : dto.cause?.toString().toUpperCase().includes('ARRANQUE')
        ? 'ARRANQUE_MAQUINA'
        : dto.cause?.toString().toUpperCase().includes('ATASCO')
          ? 'ATASCO'
          : dto.cause?.toString().toUpperCase().includes('CALIB') || dto.cause?.toString().toUpperCase().includes('DESCALIB')
            ? 'DESCALIBRACION'
            : dto.cause || 'ARRANQUE_MAQUINA';

    const scrapPct = Number(
      (((dto.consumedRawMaterialKg - dto.producedGoodKg) / dto.consumedRawMaterialKg) * 100).toFixed(2)
    );

    return requestWithFallback<ScrapRecord>(
      '/production/scrap',
      {
        method: 'POST',
        body: JSON.stringify({
          productionOrderId: dto.productionOrderId,
          materialId: dto.materialId,
          consumedRawMaterialKg: dto.consumedRawMaterialKg,
          producedGoodKg: dto.producedGoodKg,
          scrapRecoverableKg: dto.scrapRecoverableKg,
          scrapDiscardKg: dto.scrapDiscardKg,
          cause,
          notes: dto.notes || dto.cause
        })
      },
      () => {
        const newRecord: ScrapRecord = {
          id: `scr-${Date.now()}`,
          orderNumber: dto.productionOrderId,
          machineLine: dto.machineLine || 'Línea de Extrusión / Inyección',
          rawMaterialUsedKg: dto.consumedRawMaterialKg,
          finishedProductKg: dto.producedGoodKg,
          recoverableScrapKg: dto.scrapRecoverableKg,
          discardScrapKg: dto.scrapDiscardKg,
          scrapPercentage: scrapPct,
          cause: cause,
          operator: dto.operator || 'Supervisor de Planta',
          createdAt: 'Hace un momento'
        };
        mockScrap.unshift(newRecord);

        // Si hay scrap recuperable, aumentar stock de material recuperado mock
        const recMaterial = mockMaterials.find(m => m.type === 'RECUPERADO');
        if (recMaterial && dto.scrapRecoverableKg > 0) {
          recMaterial.currentStockKg += dto.scrapRecoverableKg;
          recMaterial.lastUpdated = 'Molienda interna ingresada';
        }

        return newRecord;
      }
    );
  }
};

// -------------------------------------------------------------
// 6. ALERTAS DE STOCK (/api/alerts)
// -------------------------------------------------------------
export const alertsApi = {
  async getAll(): Promise<{ data: StockAlert[]; isLive: boolean }> {
    const res = await requestWithFallback<any[]>(
      '/alerts',
      { method: 'GET' },
      () => mockAlerts
    );

    return {
      data: (res.data || []).map(normalizeStockAlert),
      isLive: res.isLive,
      error: res.error
    };
  }
};

// -------------------------------------------------------------
// 6.1. PROVEEDORES (/api/suppliers)
// -------------------------------------------------------------
export const suppliersApi = {
  async getAll(): Promise<{ data: any[]; isLive: boolean }> {
    return requestWithFallback<any[]>(
      '/suppliers',
      { method: 'GET' },
      () => [
        {
          id: 'prov-01',
          code: 'PROV-BRASKEM',
          name: 'Braskem Idesa S.A.P.I.',
          contactName: 'Roberto Viana',
          email: 'contacto.ventas@braskem.com',
          phone: '+52 55 5000 8000',
        },
        {
          id: 'prov-02',
          code: 'PROV-DOW',
          name: 'Dow Chemical Company',
          contactName: 'Laura Méndez',
          email: 'resinas.latam@dow.com',
          phone: '+1 800 258 2436',
        },
        {
          id: 'prov-03',
          code: 'PROV-SABIC',
          name: 'SABIC Petrochemicals',
          contactName: 'Carlos Andrade',
          email: 'orders.sabic@sabic.com',
          phone: '+1 713 555 0199',
        },
        {
          id: 'prov-04',
          code: 'PROV-PIGMENTOS',
          name: 'Colorants & Masterbatch Corp',
          contactName: 'Mariana Duarte',
          email: 'ventas@colorants.com',
          phone: '+58 212 555 4321',
        },
      ]
    );
  },

  async create(data: { code: string; name: string; contactName?: string; email?: string; phone?: string }): Promise<{ data: any; isLive: boolean }> {
    return requestWithFallback<any>(
      '/suppliers',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      () => ({
        id: `prov-${Date.now()}`,
        ...data,
      })
    );
  },

  async remove(id: string): Promise<{ data: any; isLive: boolean }> {
    return requestWithFallback<any>(
      `/suppliers/${id}`,
      { method: 'DELETE' },
      () => ({ success: true })
    );
  }
};


// -------------------------------------------------------------
// 7. KPIS Y DASHBOARD
// -------------------------------------------------------------
export const dashboardApi = {
  async getKPIs(): Promise<{ data: DashboardKPIs; isLive: boolean }> {
    return requestWithFallback<DashboardKPIs>(
      '/reports/dashboard-kpis',
      { method: 'GET' },
      () => {
        const totalStock = mockMaterials.reduce((acc, m) => acc + m.currentStockKg, 0);
        const lowStockCount = mockMaterials.filter(m => m.status !== 'OPTIMO').length;
        const totalReceived = mockEntries.reduce((acc, e) => acc + e.quantityKg, 0);
        const totalScrap = mockScrap.reduce((acc, s) => acc + s.recoverableScrapKg + s.discardScrapKg, 0);
        const totalConsumed = mockScrap.reduce((acc, s) => acc + s.rawMaterialUsedKg, 4800);

        return {
          totalMateriaPrimaKg: totalStock,
          stockDisponibleKg: totalStock * 0.85,
          materialesStockBajoCount: lowStockCount,
          materiaPrimaRecibidaKg: totalReceived,
          consumoDelMesKg: totalConsumed,
          mermaDelMesKg: totalScrap
        };
      }
    );
  },

  async getMovements(): Promise<{ data: StockMovement[]; isLive: boolean }> {
    return requestWithFallback<StockMovement[]>(
      '/movements',
      { method: 'GET' },
      () => mockMovements
    );
  }
};

// -------------------------------------------------------------
// 8. CONFIGURACIÓN & STATUS DE CONEXIÓN
// -------------------------------------------------------------
export const apiConfig = {
  getBaseUrl: () => API_BASE_URL,
  isLive: () => isBackendReachable,
  setForceMock: (force: boolean) => {
    forceMockMode = force;
  },
  isForceMock: () => forceMockMode,
  
  /**
   * Comprueba el estado de salud del backend de Persona 1
   */
  async checkHealth(): Promise<{ online: boolean; url: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      
      // Probar /health público
      let res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      if (!res.ok) {
        // Fallback a /raw-materials
        res = await fetch(`${API_BASE_URL}/raw-materials`, {
          method: 'GET',
          signal: controller.signal
        });
      }
      clearTimeout(timeoutId);

      const reachable = res.ok || res.status === 401 || res.status === 403;
      isBackendReachable = reachable;

      // Si el backend responde y no hay token guardado, auto-loguear al admin por defecto
      if (reachable && !localStorage.getItem('plastcontrol_token')) {
        try {
          await authApi.login('carlos.mendoza@plastcontrol.com', 'admin123');
        } catch {
          // Ignorar error si el usuario aún no existe
        }
      }

      return { online: reachable, url: API_BASE_URL };
    } catch {
      isBackendReachable = false;
      return { online: false, url: API_BASE_URL };
    }
  }
};

