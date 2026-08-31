import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  Check, 
  X, 
  Layers, 
  Scale, 
  AlertCircle, 
  FileCheck, 
  Send,
  FlaskConical,
  Sparkles
} from 'lucide-react';
import { productionRequestsApi, rawMaterialsApi } from '../services/api';
import type { ProductionRequest, RawMaterial, ProcessCategory } from '../types';
import { BomRecipeCalculatorModal } from './BomRecipeCalculatorModal';

export const ProductionOrdersView: React.FC = () => {
  const [requests, setRequests] = useState<ProductionRequest[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showBomModal, setShowBomModal] = useState<boolean>(false);

  // Form State
  const [formState, setFormState] = useState({
    orderNumber: `OP-2026-${Math.floor(100 + Math.random() * 900)}`,
    line: 'Línea de Extrusión 01',
    processType: 'EXTRUSION' as ProcessCategory,
    productName: 'Bolsa Plástica Biodegradable 40x50 cm',
    materialId: '',
    quantityKg: 1200,
    requestedBy: 'Ing. Pedro Ramos (Producción)'
  });

  const loadData = async () => {
    setIsLoading(true);
    const [reqRes, matRes] = await Promise.all([
      productionRequestsApi.getAll(),
      rawMaterialsApi.getAll()
    ]);
    setRequests(reqRes.data);
    setMaterials(matRes.data);
    if (matRes.data.length > 0 && !formState.materialId) {
      setFormState(prev => ({ ...prev, materialId: matRes.data[0].id }));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string) => {
    await productionRequestsApi.approve(id);
    loadData();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const selMat = materials.find(m => m.id === formState.materialId);
    await productionRequestsApi.create({
      orderCode: formState.orderNumber,
      line: formState.line,
      processType: formState.processType,
      targetProduct: formState.productName,
      requiredMaterials: [
        {
          materialId: selMat?.id || '',
          materialName: selMat?.name || 'Polímero',
          quantityKg: Number(formState.quantityKg)
        }
      ],
      requestedBy: formState.requestedBy
    });
    setShowModal(false);
    loadData();
  };

  const filtered = requests.filter(r => 
    filterStatus === 'ALL' || r.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Factory className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Despacho & Producción</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">
            Órdenes de Producción & Solicitudes de Despacho
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Sincronización en tiempo real con las solicitudes emitidas desde la aplicación móvil de los operadores en piso de planta.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBomModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold text-xs shadow-lg transition-all"
          >
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span>Formulador BOM (Recetas)</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Solicitud Rápida</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 w-fit">
        {['ALL', 'PENDIENTE', 'APROBADA'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === st
                ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {st === 'ALL' ? 'Todas' : st}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((req) => (
          <div
            key={req.id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-purple-400">{req.orderNumber}</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  req.status === 'APROBADA'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}>
                  {req.status}
                </span>
              </div>

              <h3 className="font-bold text-white text-base mb-1">{req.productName}</h3>
              <p className="text-xs text-slate-400 mb-3">{req.line} • {req.processType}</p>

              {/* Required Materials Badges */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 mb-4">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                  Material Requerido:
                </span>
                {req.requiredMaterials.map((rm, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">{rm.materialName}</span>
                    <span className="font-mono font-bold text-cyan-400">{rm.quantityKg.toLocaleString()} kg</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <div className="text-[11px] text-slate-400">
                <span>Por: </span>
                <strong className="text-slate-200">{req.requestedBy}</strong>
              </div>

              {req.status === 'PENDIENTE' ? (
                <button
                  onClick={() => handleApprove(req.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aprobar & Despachar</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Despacho Completado
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Nueva Solicitud */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Factory className="w-5 h-5 text-purple-400" />
              Nueva Solicitud de Material a Silos
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Emitir orden de entrega para alimentar tolvas de extrusoras o inyectoras.
            </p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Código de Orden</label>
                  <input
                    type="text"
                    required
                    value={formState.orderNumber}
                    onChange={(e) => setFormState({ ...formState, orderNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Proceso</label>
                  <select
                    value={formState.processType}
                    onChange={(e) => setFormState({ ...formState, processType: e.target.value as ProcessCategory })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="EXTRUSION">EXTRUSIÓN</option>
                    <option value="INYECCION">INYECCIÓN</option>
                    <option value="SOPLADO">SOPLADO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Línea o Máquina</label>
                <input
                  type="text"
                  required
                  value={formState.line}
                  onChange={(e) => setFormState({ ...formState, line: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Producto Objetivo</label>
                <input
                  type="text"
                  required
                  value={formState.productName}
                  onChange={(e) => setFormState({ ...formState, productName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Materia Prima</label>
                  <select
                    value={formState.materialId}
                    onChange={(e) => setFormState({ ...formState, materialId: e.target.value })}
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
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cantidad (kg)</label>
                  <input
                    type="number"
                    required
                    value={formState.quantityKg}
                    onChange={(e) => setFormState({ ...formState, quantityKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-bold shadow-lg shadow-purple-500/20"
                >
                  Emitir Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Formulador de Recetas BOM */}
      {showBomModal && (
        <BomRecipeCalculatorModal
          materials={materials}
          onClose={() => setShowBomModal(false)}
          onOrderCreated={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};

