import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  PlusCircle, 
  AlertTriangle, 
  CheckCircle, 
  TrendingDown, 
  Factory, 
  Scale, 
  Check, 
  X
} from 'lucide-react';
import type { RawMaterial, BatchEntry, ProductionRequest, ScrapRecord, MaterialType } from '../types';
import { mockMaterials, mockEntries, mockRequests, mockScrap, mockAlerts } from '../data/mockData';

export const InteractiveDemo: React.FC = () => {
  // State
  const [materials, setMaterials] = useState<RawMaterial[]>(mockMaterials);
  const [entries, setEntries] = useState<BatchEntry[]>(mockEntries);
  const [requests, setRequests] = useState<ProductionRequest[]>(mockRequests);
  const [scrapRecords, setScrapRecords] = useState<ScrapRecord[]>(mockScrap);
  
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'entries' | 'requests' | 'scrap' | 'alerts'>('inventory');

  // New Entry Modal State
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [newEntryMaterial, setNewEntryMaterial] = useState<string>(mockMaterials[0].id);
  const [newEntryQuantity, setNewEntryQuantity] = useState<number>(2500);
  const [newEntrySupplier, setNewEntrySupplier] = useState<string>('Petroquímica del Sur S.A.');
  const [newEntryBatch, setNewEntryBatch] = useState<string>('LOT-2026-993');

  // Scrap Calculator State
  const [calcUsed, setCalcUsed] = useState<number>(1000);
  const [calcGood, setCalcGood] = useState<number>(940);
  const [calcRecoverable, setCalcRecoverable] = useState<number>(45);
  const [calcDiscard, setCalcDiscard] = useState<number>(15);
  const [calcCause, setCalcCause] = useState<string>('Calibración y purga de cambio de color');

  // Filtered Materials
  const filteredMaterials = materials.filter(m => {
    const matchesType = filterType === 'ALL' || m.type === filterType;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.siloLocation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Handle New Entry Submission
  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMat = materials.find(m => m.id === newEntryMaterial);
    if (!targetMat) return;

    const newBatch: BatchEntry = {
      id: `ent-${Date.now()}`,
      entryCode: `ENT-2026-${Math.floor(100 + Math.random() * 900)}`,
      materialId: targetMat.id,
      materialName: targetMat.name,
      supplierName: newEntrySupplier,
      supplierBatch: newEntryBatch,
      quantityKg: Number(newEntryQuantity),
      invoiceNumber: `F001-${Math.floor(10000 + Math.random() * 90000)}`,
      siloDestination: targetMat.siloLocation,
      qualityCertificatePassed: true,
      receivedBy: 'Operador en Turno',
      createdAt: 'Hace un momento'
    };

    // Update state
    setEntries([newBatch, ...entries]);
    setMaterials(materials.map(m => {
      if (m.id === targetMat.id) {
        const newStock = m.currentStockKg + Number(newEntryQuantity);
        const newStatus = newStock > m.minStockKg ? 'OPTIMO' : (newStock > m.minStockKg * 0.5 ? 'BAJO' : 'CRITICO');
        return {
          ...m,
          currentStockKg: newStock,
          status: newStatus,
          lastUpdated: 'Recién actualizado'
        };
      }
      return m;
    }));

    setShowEntryModal(false);
  };

  // Handle Request Approval
  const handleApproveRequest = (id: string) => {
    setRequests(requests.map(r => {
      if (r.id === id) {
        return { ...r, status: 'APROBADA' };
      }
      return r;
    }));
  };

  // Handle Scrap Add
  const handleAddScrap = (e: React.FormEvent) => {
    e.preventDefault();
    const scrapPct = Number((((calcUsed - calcGood) / calcUsed) * 100).toFixed(2));
    const newScrap: ScrapRecord = {
      id: `scr-${Date.now()}`,
      orderNumber: `OP-EXT-${Math.floor(400 + Math.random() * 100)}`,
      machineLine: 'Línea de Extrusión 02',
      rawMaterialUsedKg: Number(calcUsed),
      finishedProductKg: Number(calcGood),
      recoverableScrapKg: Number(calcRecoverable),
      discardScrapKg: Number(calcDiscard),
      scrapPercentage: scrapPct,
      cause: calcCause,
      operator: 'Supervisor de Turno',
      createdAt: 'Hace un momento'
    };
    setScrapRecords([newScrap, ...scrapRecords]);
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-2xl font-extrabold text-white font-outfit">
              Dashboard Interactivo de Control
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Vista previa funcional con datos mock para probar inventarios, entradas, solicitudes y cálculo de mermas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowEntryModal(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Entrada</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-900/90 rounded-xl border border-slate-800 mb-6">
        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'inventory'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Inventario & Silos ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('entries')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'entries'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Historial de Entradas ({entries.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('requests')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'requests'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Factory className="w-3.5 h-3.5" />
          <span>Despacho a Planta ({requests.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('scrap')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'scrap'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Calculadora de Merma ({scrapRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'alerts'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Alertas de Stock ({mockAlerts.length})</span>
        </button>
      </div>

      {/* Tab 1: INVENTORY */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por resina, código o silo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {(['ALL', 'RESINA', 'MASTERBATCH', 'RECUPERADO', 'ADITIVO'] as (MaterialType | 'ALL')[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    filterType === type 
                      ? 'bg-cyan-500 text-slate-950 font-bold' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {type === 'ALL' ? 'Todos' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Materia Prima / Código</th>
                  <th className="py-3 px-4">Tipo & Proceso</th>
                  <th className="py-3 px-4">Ubicación / Silo</th>
                  <th className="py-3 px-4">Propiedades Reológicas</th>
                  <th className="py-3 px-4 text-right">Stock Actual</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{mat.name}</div>
                      <div className="font-mono text-[10px] text-cyan-400">{mat.code} • Prov: {mat.supplier}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[10px] mr-1.5">
                        {mat.type}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {mat.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-200">{mat.siloLocation}</span>
                      <div className="text-[10px] text-slate-500">Cap: {mat.maxCapacityKg.toLocaleString()} kg</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      <div>MFI: {mat.meltFlowIndex} g/10min</div>
                      <div className="text-slate-500">Densidad: {mat.density} g/cm³</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-white text-sm">{mat.currentStockKg.toLocaleString()} {mat.unit}</div>
                      <div className="text-[10px] text-slate-400">Mín: {mat.minStockKg.toLocaleString()} kg</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        mat.status === 'OPTIMO'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : mat.status === 'BAJO'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse'
                      }`}>
                        {mat.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Tab 2: ENTRIES */}
      {activeSubTab === 'entries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-cyan-400" />
              Entradas de Materia Prima en Báscula
            </h3>
            <button
              onClick={() => setShowEntryModal(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors"
            >
              + Nueva Recepción
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                      {entry.entryCode}
                    </span>
                    <span className="text-[10px] text-slate-400">{entry.createdAt}</span>
                  </div>
                  <h4 className="font-bold text-white text-sm mb-1">{entry.materialName}</h4>
                  <p className="text-xs text-slate-400 mb-2">Proveedor: <span className="text-slate-200">{entry.supplierName}</span></p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 mb-3">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Lote Origen:</span>
                      <span className="font-mono text-slate-300">{entry.supplierBatch}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Factura / Guía:</span>
                      <span className="font-mono text-slate-300">{entry.invoiceNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs">
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Inspección Aprobada
                  </span>
                  <span className="font-extrabold text-cyan-400 text-sm">
                    +{entry.quantityKg.toLocaleString()} kg
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: PRODUCTION REQUESTS */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Factory className="w-4 h-4 text-purple-400" />
              Solicitudes de Despacho para Extrusión e Inyección
            </h3>
          </div>

          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-purple-400">{req.orderNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-semibold">{req.processType}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      req.status === 'APROBADA'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{req.productName}</h4>
                  <p className="text-xs text-slate-400">{req.line} • Solicitado por: {req.requestedBy}</p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {req.requiredMaterials.map((rm, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {rm.materialName}: <strong className="text-cyan-300">{rm.quantityKg} kg</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  {req.status === 'PENDIENTE' ? (
                    <button
                      onClick={() => handleApproveRequest(req.id)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aprobar & Despachar</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Despachado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: SCRAP CALCULATOR */}
      {activeSubTab === 'scrap' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Form */}
          <div className="lg:col-span-6 glass-panel p-5 rounded-2xl border border-slate-800">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              Calculadora de Balance de Masa & Merma
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Materia Prima Utilizada = Producto Bueno + Scrap Molino + Purga Desecho
            </p>

            <form onSubmit={handleAddScrap} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Materia Prima Total Alimentada (kg)
                </label>
                <input
                  type="number"
                  value={calcUsed}
                  onChange={(e) => setCalcUsed(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-emerald-400 mb-1">
                    Producto Conforme (kg)
                  </label>
                  <input
                    type="number"
                    value={calcGood}
                    onChange={(e) => setCalcGood(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-cyan-400 mb-1">
                    Scrap Molible (kg)
                  </label>
                  <input
                    type="number"
                    value={calcRecoverable}
                    onChange={(e) => setCalcRecoverable(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-rose-400 mb-1">
                    Desecho Purga (kg)
                  </label>
                  <input
                    type="number"
                    value={calcDiscard}
                    onChange={(e) => setCalcDiscard(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Causa de la Merma
                </label>
                <input
                  type="text"
                  value={calcCause}
                  onChange={(e) => setCalcCause(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">% Merma Total Calculado:</span>
                <span className="text-base font-extrabold text-amber-400">
                  {calcUsed > 0 ? (((calcUsed - calcGood) / calcUsed) * 100).toFixed(2) : 0}%
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Guardar Registro de Merma
              </button>
            </form>
          </div>

          {/* Scrap History */}
          <div className="lg:col-span-6 space-y-3">
            <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              Historial Reciente de Mermas por Línea
            </h4>

            {scrapRecords.map((scr) => (
              <div key={scr.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-amber-400">{scr.orderNumber}</span>
                  <span className="text-slate-400 text-[10px]">{scr.createdAt}</span>
                </div>
                <div className="text-white font-medium mb-1">{scr.machineLine} — {scr.cause}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <span>Alimentado: <strong className="text-slate-200">{scr.rawMaterialUsedKg} kg</strong></span>
                  <span>Recuperado: <strong className="text-emerald-400">+{scr.recoverableScrapKg} kg</strong></span>
                  <span>Merma: <strong className="text-amber-400">{scr.scrapPercentage}%</strong></span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Tab 5: ALERTS */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Job programado en background (@nestjs/schedule) activo cada 15 minutos.</span>
            </div>
            <span className="text-[10px] font-mono bg-amber-900/40 px-2 py-0.5 rounded border border-amber-700/50">
              Cron: */15 * * * *
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockAlerts.map((alt) => (
              <div key={alt.id} className="p-4 rounded-xl bg-slate-900/90 border border-rose-900/40 shadow-lg relative overflow-hidden">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                    {alt.severity}
                  </span>
                  <span className="text-[10px] text-slate-400">{alt.timestamp}</span>
                </div>
                <h4 className="font-bold text-white text-sm mb-1">{alt.materialName}</h4>
                <p className="text-xs text-slate-400 mb-3">{alt.silo}</p>
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-rose-400 font-bold">Stock Actual: {alt.currentKg} kg</span>
                  <span className="text-slate-400">Stock Mínimo Requerido: {alt.minKg} kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: New Batch Entry */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <button 
              onClick={() => setShowEntryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              Recepción de Materia Prima en Báscula
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ingresa el peso neto y lote de petroquímica para actualizar el silo correspondiente.
            </p>

            <form onSubmit={handleCreateEntry} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Polímero / Materia Prima
                </label>
                <select
                  value={newEntryMaterial}
                  onChange={(e) => setNewEntryMaterial(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.siloLocation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proveedor
                </label>
                <input
                  type="text"
                  value={newEntrySupplier}
                  onChange={(e) => setNewEntrySupplier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lote de Fábrica
                  </label>
                  <input
                    type="text"
                    value={newEntryBatch}
                    onChange={(e) => setNewEntryBatch(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Peso Neto (kg)
                  </label>
                  <input
                    type="number"
                    value={newEntryQuantity}
                    onChange={(e) => setNewEntryQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Certificado de Calidad y MFI verificado conforme en báscula.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
                >
                  Guardar e Ingresar a Silo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
};
