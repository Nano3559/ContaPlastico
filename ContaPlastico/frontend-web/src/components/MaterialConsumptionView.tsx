import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  ArrowUpRight, 
  Layers, 
  TrendingDown, 
  CheckCircle2, 
  PlusCircle, 
  Clock, 
  Database, 
  X,
  History,
  AlertCircle,
  Coins
} from 'lucide-react';
import { rawMaterialsApi } from '../services/api';
import type { RawMaterial } from '../types';
import { useToast } from '../context/ToastContext';

interface HopperConsumption {
  id: string;
  orderNumber: string;
  machineLine: string;
  materialName: string;
  siloSource: string;
  quantityConsumedKg: number;
  costUsd: number;
  shift: string;
  operator: string;
  time: string;
}

export const MaterialConsumptionView: React.FC = () => {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  const [consumptions, setConsumptions] = useState<HopperConsumption[]>([
    {
      id: 'c-01',
      orderNumber: 'OP-2026-440',
      machineLine: 'Línea de Extrusión Film 01',
      materialName: 'Polietileno de Alta Densidad (HDPE)',
      siloSource: 'Almacén 1 (Silo A2)',
      quantityConsumedKg: 420.0,
      costUsd: 798.0,
      shift: 'Turno Mañana (06:00 - 14:00)',
      operator: 'Carlos Mamani',
      time: '10:30 AM'
    },
    {
      id: 'c-02',
      orderNumber: 'OP-2026-440',
      machineLine: 'Línea de Extrusión Film 01',
      materialName: 'Material Recuperado Molido (PP)',
      siloSource: 'Almacén Reciclaje (Tolva R1)',
      quantityConsumedKg: 150.0,
      costUsd: 142.5,
      shift: 'Turno Mañana (06:00 - 14:00)',
      operator: 'Carlos Mamani',
      time: '10:30 AM'
    },
    {
      id: 'c-03',
      orderNumber: 'OP-2026-441',
      machineLine: 'Línea de Extrusión Lámina 02',
      materialName: 'Polipropileno (PP)',
      siloSource: 'Almacén 1 (Silo A1)',
      quantityConsumedKg: 580.0,
      costUsd: 1073.0,
      shift: 'Turno Mañana (06:00 - 14:00)',
      operator: 'Pedro Ramos',
      time: '09:15 AM'
    },
    {
      id: 'c-04',
      orderNumber: 'OP-2026-442',
      machineLine: 'Inyectora Engel 300T',
      materialName: 'Masterbatch Negro (MB)',
      siloSource: 'Almacén 1 (Estante B)',
      quantityConsumedKg: 15.0,
      costUsd: 48.0,
      shift: 'Turno Mañana (06:00 - 14:00)',
      operator: 'Raúl Mendoza',
      time: '08:45 AM'
    }
  ]);

  const [formData, setFormData] = useState({
    orderNumber: 'OP-2026-440',
    machineLine: 'Línea de Extrusión Film 01',
    materialId: '',
    quantityKg: 100,
    operator: 'Carlos Mamani (Operador)'
  });

  useEffect(() => {
    setIsLoading(true);
    rawMaterialsApi.getAll().then(res => {
      setMaterials(res.data);
      if (res.data.length > 0) {
        setFormData(prev => ({ ...prev, materialId: res.data[0].id }));
      }
      setIsLoading(false);
    });
  }, []);

  const totalKg = consumptions.reduce((acc, c) => acc + c.quantityConsumedKg, 0);
  const totalCost = consumptions.reduce((acc, c) => acc + c.costUsd, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selMat = materials.find(m => m.id === formData.materialId);
    const price = selMat?.costPerKg || 1.85;
    const cost = formData.quantityKg * price;

    const newCons: HopperConsumption = {
      id: `c-${Date.now()}`,
      orderNumber: formData.orderNumber,
      machineLine: formData.machineLine,
      materialName: selMat?.name || 'Resina Polimérica',
      siloSource: selMat?.siloLocation || 'Silo 1',
      quantityConsumedKg: Number(formData.quantityKg),
      costUsd: cost,
      shift: 'Turno Mañana (06:00 - 14:00)',
      operator: formData.operator,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConsumptions([newCons, ...consumptions]);
    setShowModal(false);
    showToast(
      'Consumo Registrado',
      `Bajados ${formData.quantityKg} kg de ${selMat?.name} hacia ${formData.machineLine} ($${cost.toFixed(2)} USD).`,
      'success'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Scale className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Módulo 12 — Consumo de Material</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">
            Dosificación & Consumo en Tolvas de Máquinas
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Trazabilidad de resinas bajadas de silos a tolvas por orden de trabajo, operador y cálculo de costo en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Consumo en Tolva</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Total Consumido Hoy</span>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">{totalKg.toLocaleString()} kg</div>
            <span className="text-[10px] text-amber-400/80 font-medium">{consumptions.length} despachos a tolva</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Scale className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Costo Total Material</span>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5 font-mono">
              ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
            <span className="text-[10px] text-emerald-400/80 font-medium">Insumos procesados</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Recuperado Utilizado</span>
            <div className="text-xl font-extrabold text-cyan-400 mt-0.5">150 kg (12.9%)</div>
            <span className="text-[10px] text-cyan-400/80 font-medium">Ahorro en resina virgen</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Turno en Curso</span>
            <div className="text-xl font-extrabold text-white mt-0.5">Mañana</div>
            <span className="text-[10px] text-purple-400 font-medium">Supervisor: Roberto Gómez</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Consumption Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Hora / OP</th>
              <th className="py-3.5 px-4">Máquina & Operario</th>
              <th className="py-3.5 px-4">Materia Prima & Silo Origen</th>
              <th className="py-3.5 px-4 text-right">Kilos Consumidos</th>
              <th className="py-3.5 px-4 text-right">Costo Insumo ($)</th>
              <th className="py-3.5 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {consumptions.map((c) => (
              <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-mono font-bold text-amber-400">{c.orderNumber}</div>
                  <div className="text-[10px] text-slate-500">{c.time} • {c.shift.split(' ')[0]}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-bold text-white text-xs">{c.machineLine}</div>
                  <div className="text-[11px] text-slate-400">{c.operator}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-200">{c.materialName}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Database className="w-3 h-3 text-cyan-400" />
                    {c.siloSource}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-extrabold text-amber-400 text-sm font-mono">
                    {c.quantityConsumedKg.toLocaleString()} kg
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    ${c.costUsd.toFixed(2)} USD
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Dosificado
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Registrar Consumo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              Registrar Bajada de Material a Tolva
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Descuenta stock del silo y carga insumo a la orden de trabajo.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Orden de Producción (OP)</label>
                <input
                  type="text"
                  required
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Línea / Máquina Destino</label>
                <select
                  value={formData.machineLine}
                  onChange={(e) => setFormData({ ...formData, machineLine: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="Línea de Extrusión Film 01">Línea de Extrusión Film 01 (Bolsas)</option>
                  <option value="Línea de Extrusión Lámina 02">Línea de Extrusión Lámina 02 (Termoformado)</option>
                  <option value="Inyectora Engel 300T">Inyectora Engel 300T (Tapas)</option>
                  <option value="Sopladora Bekum 01">Sopladora Bekum 01 (Botellas)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Materia Prima a Dosificar</label>
                <select
                  value={formData.materialId}
                  onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.siloLocation}) — Stock: {m.currentStockKg}kg (${(m.costPerKg || 1.85).toFixed(2)}/kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 mb-1">Kilos a Cargar (kg)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantityKg}
                    onChange={(e) => setFormData({ ...formData, quantityKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-amber-500/50 text-amber-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Operador Responsable</label>
                  <input
                    type="text"
                    required
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
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
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20"
                >
                  Confirmar Dosificación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
