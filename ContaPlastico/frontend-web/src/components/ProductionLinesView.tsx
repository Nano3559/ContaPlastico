import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  Cpu, 
  Activity, 
  Gauge, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  FlaskConical, 
  PlusCircle, 
  Clock, 
  Power,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { productionRequestsApi, rawMaterialsApi } from '../services/api';
import type { ProductionRequest, RawMaterial } from '../types';
import { BomRecipeCalculatorModal } from './BomRecipeCalculatorModal';
import { useToast } from '../context/ToastContext';

interface MachineLine {
  id: string;
  name: string;
  type: 'EXTRUSION' | 'INYECCION' | 'SOPLADO' | 'TERMOFORMADO';
  status: 'RUNNING' | 'MAINTENANCE' | 'IDLE';
  currentOrder: string;
  product: string;
  speedKgHr: number;
  temperatureC: number;
  pressureBar: number;
  activeOperator: string;
  formula: string;
  shiftKgTotal: number;
}

export const ProductionLinesView: React.FC = () => {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [showBomModal, setShowBomModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [lines, setLines] = useState<MachineLine[]>([
    {
      id: 'ext-01',
      name: 'Línea de Extrusión Film 01 (Bolsas)',
      type: 'EXTRUSION',
      status: 'RUNNING',
      currentOrder: 'OP-2026-440',
      product: 'Bolsa Plástica Biodegradable 40x50',
      speedKgHr: 185.5,
      temperatureC: 195,
      pressureBar: 240,
      activeOperator: 'Carlos Mamani (Turno Mañana)',
      formula: '70% HDPE + 25% Molido + 5% MB Blanco',
      shiftKgTotal: 1250
    },
    {
      id: 'ext-02',
      name: 'Línea de Extrusión Lámina 02',
      type: 'EXTRUSION',
      status: 'RUNNING',
      currentOrder: 'OP-2026-441',
      product: 'Lámina PP para Termoformado 0.8mm',
      speedKgHr: 220.0,
      temperatureC: 210,
      pressureBar: 260,
      activeOperator: 'Pedro Ramos (Turno Mañana)',
      formula: '96% PP Copolímero + 4% MB Azul',
      shiftKgTotal: 1760
    },
    {
      id: 'inj-01',
      name: 'Inyectora Engel 300T (Tapas & Envases)',
      type: 'INYECCION',
      status: 'RUNNING',
      currentOrder: 'OP-2026-442',
      product: 'Tapa Rosca 28mm PCO-1881',
      speedKgHr: 95.0,
      temperatureC: 230,
      pressureBar: 310,
      activeOperator: 'Raúl Mendoza (Turno Mañana)',
      formula: '95% PP Homopolímero + 5% MB Rojo',
      shiftKgTotal: 760
    },
    {
      id: 'sop-01',
      name: 'Sopladora Bekum 01 (Botellas 1L)',
      type: 'SOPLADO',
      status: 'MAINTENANCE',
      currentOrder: 'Mantenimiento Preventivo',
      product: 'Envase HDPE 1000ml Industrial',
      speedKgHr: 0,
      temperatureC: 25,
      pressureBar: 0,
      activeOperator: 'Taller de Matricería',
      formula: 'En espera de arranque',
      shiftKgTotal: 0
    }
  ]);

  useEffect(() => {
    setIsLoading(true);
    rawMaterialsApi.getAll().then(res => {
      setMaterials(res.data);
      setIsLoading(false);
    });
  }, []);

  const totalSpeed = lines.filter(l => l.status === 'RUNNING').reduce((acc, l) => acc + l.speedKgHr, 0);
  const totalShiftKg = lines.reduce((acc, l) => acc + l.shiftKgTotal, 0);
  const activeCount = lines.filter(l => l.status === 'RUNNING').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Factory className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Módulo 10 — Monitoreo de Producción</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">
            Líneas de Producción & Extrusoras en Planta
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Control de velocidad de extrusión (kg/h), temperaturas de husillo, presiones de inyección y recetas de mezcla activas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBomModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/20 transition-all"
          >
            <FlaskConical className="w-4 h-4" />
            <span>Formulador de Recetas BOM</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Líneas Activas</span>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{activeCount} / {lines.length} Máquinas</div>
            <span className="text-[10px] text-emerald-400/80 font-medium">75% capacidad operativa</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Power className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Ritmo de Planta Actual</span>
            <div className="text-xl font-extrabold text-cyan-400 mt-0.5">{totalSpeed.toFixed(1)} kg/h</div>
            <span className="text-[10px] text-cyan-400/80 font-medium">Alimentación a tolvas</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Procesado en Turno</span>
            <div className="text-xl font-extrabold text-white mt-0.5">+{totalShiftKg.toLocaleString()} kg</div>
            <span className="text-[10px] text-purple-400 font-medium">Turno Mañana en curso</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Eficiencia OEE Planta</span>
            <div className="text-xl font-extrabold text-indigo-400 mt-0.5">89.4%</div>
            <span className="text-[10px] text-indigo-400/80 font-medium">Calidad y disponibilidad OK</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Gauge className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Machine Lines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {lines.map((line) => {
          const isRunning = line.status === 'RUNNING';

          return (
            <div
              key={line.id}
              className={`p-5 rounded-2xl border transition-all ${
                isRunning 
                  ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/40' 
                  : 'bg-slate-900/50 border-slate-800/60 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <h3 className="font-extrabold text-white text-base font-outfit">{line.name}</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Operador: <strong className="text-slate-300">{line.activeOperator}</strong></span>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                  isRunning 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                }`}>
                  {isRunning ? 'EN PRODUCCIÓN' : 'MANTENIMIENTO'}
                </span>
              </div>

              {/* Order & Formula Info */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 mb-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Orden de Trabajo:</span>
                  <span className="font-mono font-bold text-indigo-400">{line.currentOrder}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Producto Fabricado:</span>
                  <span className="font-bold text-white">{line.product}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                  <span className="text-slate-400 text-[10px]">Receta BOM Activa:</span>
                  <span className="font-medium text-emerald-400 text-[11px] truncate max-w-[220px]">{line.formula}</span>
                </div>
              </div>

              {/* Live Machine Telemetry Parameters */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Velocidad</span>
                  <strong className="text-cyan-400 font-mono text-sm">{line.speedKgHr} kg/h</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Temp. Husillo</span>
                  <strong className="text-amber-400 font-mono text-sm">{line.temperatureC}°C</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Presión Hidráulica</span>
                  <strong className="text-purple-400 font-mono text-sm">{line.pressureBar} bar</strong>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal Formulador BOM */}
      {showBomModal && (
        <BomRecipeCalculatorModal
          materials={materials}
          onClose={() => setShowBomModal(false)}
          onOrderCreated={() => {
            showToast('Orden Creada para Línea', 'Se ha emitido la orden y enviado la receta a planta.', 'success');
          }}
        />
      )}

    </div>
  );
};
