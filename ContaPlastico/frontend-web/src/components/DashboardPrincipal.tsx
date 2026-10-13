import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  PackageCheck, 
  AlertTriangle, 
  ArrowDownRight, 
  Flame, 
  TrendingDown, 
  PlusCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  Factory, 
  Sparkles,
  Shield,
  Loader2
} from 'lucide-react';
import { 
  mockDashboardKPIs, 
  mockMaterials, 
  mockEntries, 
  mockMovements, 
  mockRequests
} from '../data/mockData';
import { 
  rawMaterialsApi, 
  entriesApi, 
  productionRequestsApi,
  dashboardApi
} from '../services/api';
import type { UserProfile, ProductionRequest, BatchEntry, RawMaterial } from '../types';

interface DashboardPrincipalProps {
  currentUser: UserProfile;
  onOpenRoleModal: () => void;
  onNavigateSection?: (section: string) => void;
}

export const DashboardPrincipal: React.FC<DashboardPrincipalProps> = ({
  currentUser,
  onOpenRoleModal,
  onNavigateSection
}) => {
  const [requests, setRequests] = useState<ProductionRequest[]>([]);
  const [entries, setEntries] = useState<BatchEntry[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [kpis, setKpis] = useState(mockDashboardKPIs);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showQuickEntryModal, setShowQuickEntryModal] = useState<boolean>(false);
  const [newMaterialName, setNewMaterialName] = useState<string>('Polipropileno (PP)');
  const [newQty, setNewQty] = useState<number>(1000);
  const [newSupplier, setNewSupplier] = useState<string>('Proveedor A');
  const [newLot, setNewLot] = useState<string>('PP-2026-0819');
  const [newInvoice, setNewInvoice] = useState<string>('FAC-00261');

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [reqRes, entRes, matRes, kpisRes] = await Promise.all([
        productionRequestsApi.getAll(),
        entriesApi.getAll(),
        rawMaterialsApi.getAll(),
        dashboardApi.getKPIs()
      ]);
      setRequests(reqRes.data);
      setEntries(entRes.data);
      setMaterials(matRes.data);
      setKpis(kpisRes.data ?? mockDashboardKPIs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter low stock materials
  const lowStockMaterials = materials.filter(
    (m) => m.status === 'BAJO' || m.status === 'CRITICO' || m.currentStockKg < m.minStockKg
  );

  const formatNumber = (value: number) => new Intl.NumberFormat('es-MX').format(Math.round(value));

  const handleApproveRequest = async (id: string) => {
    await productionRequestsApi.approve(id);
    loadDashboardData();
  };

  const handleCreateQuickEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMat = materials[0];
    await entriesApi.create({
      materialId: targetMat?.id || 'mat-001',
      materialName: newMaterialName,
      supplierName: newSupplier,
      supplierBatch: newLot,
      quantityKg: Number(newQty),
      invoiceNumber: newInvoice,
      siloDestination: targetMat?.siloLocation || 'Silo A-01',
      qualityCertificatePassed: true,
      receivedBy: currentUser.name
    });
    setShowQuickEntryModal(false);
    loadDashboardData();
  };


  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Banner / Welcome & Role Context */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 p-6 sm:p-8 border border-slate-800 shadow-2xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Sistema de Control de Materia Prima • Fábrica de Plásticos
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Persona B (Web)
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-outfit">
              Dashboard Principal de Inventario
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Panel central de control para monitorear balances de masa, niveles de silos, consumo en extrusión/inyección y solicitudes operativas.
            </p>
          </div>

          {/* User Badge & Quick Role Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">{currentUser.name}</div>
                <div className="text-[11px] font-medium text-cyan-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Rol: {currentUser.role}</span>
                </div>
              </div>
              <button
                onClick={onOpenRoleModal}
                className="ml-2 px-2.5 py-1 text-[11px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-700"
                title="Cambiar de Rol (Admin, Almacén, Producción)"
              >
                Cambiar Rol
              </button>
            </div>

            <button
              onClick={() => setShowQuickEntryModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Entrada</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6 INDICADORES CLAVE DEL DOCUMENTO OFICIAL (PUNTO 3) */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 font-outfit">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Indicadores Globales del Sistema (Punto 3 del Proyecto)
          </h2>
          <span className="text-xs text-slate-400 font-mono">Actualizado: Agosto 2026</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Card 1: MATERIA PRIMA TOTAL */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Materia Prima Total
              </span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {formatNumber(kpis.totalMateriaPrimaKg)} <span className="text-xs font-semibold text-cyan-400">kg</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> 100%
              </span>
              <span>Capacidad en planta</span>
            </div>
          </div>

          {/* Card 2: STOCK DISPONIBLE */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Stock Disponible
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {formatNumber(kpis.stockDisponibleKg)} <span className="text-xs font-semibold text-emerald-400">kg</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold">78.8%</span>
              <span>Listo para producción</span>
            </div>
          </div>

          {/* Card 3: STOCK BAJO */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Stock Bajo
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
              {kpis.materialesStockBajoCount} <span className="text-xs font-semibold text-slate-300">materiales</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Requiere reposición</span>
            </div>
          </div>

          {/* Card 4: MATERIA PRIMA RECIBIDA */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Recibida (Mes)
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {formatNumber(kpis.materiaPrimaRecibidaKg)} <span className="text-xs font-semibold text-blue-400">kg</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-cyan-400 font-semibold">+3 entradas</span>
              <span>Recepción en báscula</span>
            </div>
          </div>

          {/* Card 5: CONSUMO DEL MES */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Consumo del Mes
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {formatNumber(kpis.consumoDelMesKg)} <span className="text-xs font-semibold text-purple-400">kg</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-purple-400 font-semibold">Extrusión / Iny.</span>
              <span>Procesado</span>
            </div>
          </div>

          {/* Card 6: MERMA DEL MES */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-rose-500/40 transition-all group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Merma del Mes
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono tracking-tight">
              {mockDashboardKPIs.mermaDelMesKg.toLocaleString()} <span className="text-xs font-semibold text-slate-300">kg</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-300">
              <span>Tasa: <strong>7.29%</strong></span>
              <span className="text-[10px] text-slate-400">(recuperable: 80%)</span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAS 4 SECCIONES DETALLADAS DEL PUNTO 3: */}
      {/* 1. Entradas Recientes | 2. Salidas Recientes */}
      {/* 3. Stock Bajo         | 4. Últimas Solicitudes de Producción */}
      {/* ========================================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 📥 PANEL 1: ENTRADAS RECIENTES (PUNTO 3 & EJERCICIO 2) */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-outfit">Entradas Recientes de Materia Prima</h3>
                  <p className="text-[11px] text-slate-400">Recepción de camiones y descarga en almacén</p>
                </div>
              </div>
              <button 
                onClick={() => setShowQuickEntryModal(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
              >
                + Nueva Entrada
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                    <th className="pb-2">Fecha / Factura</th>
                    <th className="pb-2">Materia Prima</th>
                    <th className="pb-2">Proveedor & Lote</th>
                    <th className="pb-2 text-right">Cantidad</th>
                    <th className="pb-2 text-center">Ubicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-mono text-[11px]">
                        <div className="font-semibold text-slate-200">{entry.createdAt}</div>
                        <div className="text-[10px] text-cyan-400">{entry.invoiceNumber}</div>
                      </td>
                      <td className="py-2.5">
                        <div className="font-bold text-white text-xs">{entry.materialName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{entry.entryCode}</div>
                      </td>
                      <td className="py-2.5 text-[11px]">
                        <div>{entry.supplierName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Lote: {entry.supplierBatch}</div>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-emerald-400 text-xs">
                        +{entry.quantityKg.toLocaleString()} kg
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {entry.siloDestination}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Fórmula: <strong className="text-slate-300">Stock actual = Stock anterior + Cantidad recibida</strong></span>
            <span className="text-cyan-400 font-medium">3 registros mostrados</span>
          </div>
        </div>

        {/* 📤 PANEL 2: SALIDAS RECIENTES Y MOVIMIENTOS (PUNTO 3 & EJERCICIO 11) */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-outfit">Salidas Recientes & Movimientos</h3>
                  <p className="text-[11px] text-slate-400">Despachos hacia producción y devoluciones</p>
                </div>
              </div>
              <span className="text-xs text-purple-400 font-mono font-bold">Historial de Turno</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2">Materia Prima</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2 text-right">Cantidad</th>
                    <th className="pb-2 text-right">Usuario / Destino</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {mockMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        {mov.fecha}
                      </td>
                      <td className="py-2.5 font-bold text-white text-xs">
                        {mov.materiaPrima}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          mov.tipo === 'Entrada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          mov.tipo === 'Salida' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {mov.tipo}
                        </span>
                      </td>
                      <td className={`py-2.5 text-right font-mono font-bold text-xs ${
                        mov.cantidadKg > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {mov.cantidadKg > 0 ? `+${mov.cantidadKg}` : mov.cantidadKg} kg
                      </td>
                      <td className="py-2.5 text-right text-[11px]">
                        <div className="text-slate-200 font-semibold">{mov.usuario}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{mov.origenDestino}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Control de flujo físico según orden de producción</span>
            <span className="text-purple-400 font-semibold">Balance de almacén</span>
          </div>
        </div>

        {/* ⚠️ PANEL 3: MATERIAS PRIMAS CON STOCK BAJO (PUNTO 3 & EJERCICIO 9) */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-outfit">Materias Primas con Stock Bajo</h3>
                  <p className="text-[11px] text-slate-400">Alerta automática: Stock Actual &lt; Stock Mínimo Permitido</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {lowStockMaterials.length} en riesgo
              </span>
            </div>

            <div className="space-y-3">
              {lowStockMaterials.slice(0, 4).map((mat) => {
                const pct = Math.min(100, Math.round((mat.currentStockKg / mat.minStockKg) * 100));
                return (
                  <div key={mat.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-2">
                          <span>{mat.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {mat.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{mat.siloLocation} • Prov: {mat.supplier}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-amber-400">
                          {mat.currentStockKg} <span className="text-[10px] text-slate-400 font-normal">/ {mat.minStockKg} kg</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          pct < 50 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {pct}% del mínimo
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${pct < 50 ? 'bg-rose-500' : 'bg-amber-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Notificación enviada a compras y jefe de almacén</span>
            <button 
              onClick={() => onNavigateSection?.('inventario')}
              className="text-amber-400 hover:text-amber-300 font-semibold"
            >
              Ver Inventario Completo ➔
            </button>
          </div>
        </div>

        {/* 🏭 PANEL 4: ÚLTIMAS SOLICITUDES DE PRODUCCIÓN (PUNTO 3, EJERCICIO 4 & 6) */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Factory className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-outfit">Últimas Solicitudes de Producción</h3>
                  <p className="text-[11px] text-slate-400">Órdenes de producción esperando entrega de material</p>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-bold">Flujo OP</span>
            </div>

            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-cyan-400">{req.orderNumber}</span>
                      <span className="text-xs font-bold text-white">{req.productName}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'APROBADA' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-slate-400">Materiales requeridos:</span>
                    {req.requiredMaterials.map((rm, idx) => (
                      <span key={idx} className="font-medium text-slate-200">
                        • {rm.materialName}: <strong className="text-cyan-300">{rm.quantityKg} kg</strong>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{req.line} • Solicitado por: {req.requestedBy}</span>
                    {req.status === 'PENDIENTE' && (currentUser.role === 'ADMIN' || currentUser.role === 'ALMACEN') && (
                      <button
                        onClick={() => handleApproveRequest(req.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-all shadow-md shadow-emerald-500/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprobar Salida</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Al aprobar: <strong className="text-slate-300">Stock = Stock anterior - Cantidad entregada</strong></span>
            <span className="text-emerald-400 font-medium">Control de Órdenes</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL PARA REGISTRAR ENTRADA RÁPIDA (EJERCICIO 2) */}
      {/* ========================================================================= */}
      {showQuickEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1 font-outfit">
              Ejercicio 2: Registrar Entrada de Materia Prima
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Llegada de camión a fábrica. El stock aumentará automáticamente según la fórmula indicada.
            </p>

            <form onSubmit={handleCreateQuickEntry} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Materia Prima:</label>
                <select
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Polipropileno (PP)">Polipropileno (PP) - Resina</option>
                  <option value="Masterbatch Negro (MB)">Masterbatch Negro (MB)</option>
                  <option value="Policloruro de Vinilo (PVC)">Policloruro de Vinilo (PVC)</option>
                  <option value="Polietileno de Alta Densidad (HDPE)">Polietileno de Alta Densidad (HDPE)</option>
                  <option value="Aditivo Anti-UV">Aditivo Anti-UV</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Proveedor:</label>
                  <input
                    type="text"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cantidad (kg):</label>
                  <input
                    type="number"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Número de Lote:</label>
                  <input
                    type="text"
                    value={newLot}
                    onChange={(e) => setNewLot(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Número de Factura:</label>
                  <input
                    type="text"
                    value={newInvoice}
                    onChange={(e) => setNewInvoice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
                <span className="text-cyan-400 font-bold">Fórmula aplicada:</span> Stock actual = {1500} kg + {newQty} kg = <span className="font-bold text-emerald-400">{1500 + Number(newQty)} kg</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuickEntryModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
