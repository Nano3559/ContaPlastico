import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  PlusCircle, 
  Database, 
  Layers, 
  Gauge, 
  X, 
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Boxes,
  DollarSign,
  Coins
} from 'lucide-react';
import { rawMaterialsApi } from '../services/api';
import type { RawMaterial, MaterialType, ProcessCategory, StockStatus } from '../types';
import { useToast } from '../context/ToastContext';

export const RawMaterialsView: React.FC = () => {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);

  // Form State para nueva materia prima con precio de compra
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'RESINA' as MaterialType,
    category: 'EXTRUSION' as ProcessCategory,
    density: 0.955,
    meltFlowIndex: 0.35,
    unit: 'kg',
    currentStockKg: 5000,
    minStockKg: 2000,
    maxCapacityKg: 15000,
    costPerKg: 1.85,
    siloLocation: 'Silo A-03',
    supplier: 'Petroquímica del Golfo',
    colorCode: '#06b6d4'
  });

  const loadMaterials = async () => {
    setIsLoading(true);
    const res = await rawMaterialsApi.getAll();
    setMaterials(res.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await rawMaterialsApi.create(formData);
    showToast(
      'Materia Prima Registrada',
      `${formData.name} creada con costo base de $${formData.costPerKg.toFixed(2)} USD/kg.`,
      'success'
    );
    setShowCreateModal(false);
    loadMaterials();
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.siloLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalStock = materials.reduce((acc, m) => acc + m.currentStockKg, 0);
  const totalValuationUsd = materials.reduce((acc, m) => acc + (m.currentStockKg * (m.costPerKg || 1.80)), 0);
  const criticalCount = materials.filter(m => m.status === 'CRITICO').length;
  const lowCount = materials.filter(m => m.status === 'BAJO').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Boxes className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Catálogo, Silos & Precios</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">
            Materias Primas, Silos & Valuación de Inventario
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Control de inventario físico, precios de compra petroquímica ($/kg), densidades y fluidéz (MFI).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Materia Prima</span>
          </button>
        </div>
      </div>

      {/* Mini KPI Cards con Valorización Financiera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Total en Silos</span>
            <div className="text-xl font-extrabold text-white mt-0.5">{totalStock.toLocaleString()} kg</div>
            <span className="text-[10px] text-cyan-400 font-medium">{materials.length} materias registradas</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* KPI Financiero: Valor Total del Inventario */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Valor Total en Silos</span>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5 font-mono">
              ${totalValuationUsd.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-emerald-400/80 font-medium">Valuación USD en planta</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Alerta de Stock Bajo</span>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">{lowCount} Polímeros</div>
            <span className="text-[10px] text-amber-400/80 font-medium">Requiere reorden</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Stock Crítico</span>
            <div className="text-xl font-extrabold text-rose-400 mt-0.5">{criticalCount} Silos</div>
            <span className="text-[10px] text-rose-400/80 font-medium">Riesgo de paro de línea</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Gauge className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por resina, código o silo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {['ALL', 'RESINA', 'MASTERBATCH', 'RECUPERADO', 'ADITIVO'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  typeFilter === type
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {type === 'ALL' ? 'Todos' : type}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="OPTIMO">Óptimo</option>
            <option value="BAJO">Bajo</option>
            <option value="CRITICO">Crítico</option>
          </select>
        </div>
      </div>

      {/* Silos Visual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMaterials.map((mat) => {
          const fillPercentage = Math.min(100, Math.round((mat.currentStockKg / mat.maxCapacityKg) * 100));
          const isLow = mat.status !== 'OPTIMO';

          return (
            <div
              key={mat.id}
              onClick={() => setSelectedMaterial(mat)}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                {/* Top Badge & Code */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400">
                    {mat.code}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    mat.status === 'OPTIMO'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : mat.status === 'BAJO'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse'
                  }`}>
                    {mat.status}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {mat.name}
                </h3>
                <p className="text-[11px] text-slate-400 mb-3">{mat.siloLocation} • {mat.category}</p>

                {/* Silo Capacity Visual Gauge */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400 text-[10px]">Nivel de Silo:</span>
                    <span className="font-extrabold text-white text-xs">{fillPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLow ? (mat.status === 'CRITICO' ? 'bg-rose-500' : 'bg-amber-500') : 'bg-cyan-400'
                      }`}
                      style={{ width: `${fillPercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>Stock: <strong className="text-slate-300">{mat.currentStockKg.toLocaleString()} kg</strong></span>
                    <span>Cap: {mat.maxCapacityKg.toLocaleString()} kg</span>
                  </div>
                </div>

                {/* Technical Specs: MFI & Density */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="block text-slate-500">MFI (g/10min):</span>
                    <span className="font-mono font-bold text-slate-200">{mat.meltFlowIndex}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="block text-slate-500">Densidad:</span>
                    <span className="font-mono font-bold text-slate-200">{mat.density} g/cm³</span>
                  </div>
                </div>

                {/* Precios & Valuación Financiera del Silo */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Precio Compra:</span>
                    <span className="font-mono font-black text-cyan-400 text-xs">
                      ${(mat.costPerKg || 1.85).toFixed(2)} /kg
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Valor en Silo:</span>
                    <span className="font-mono font-black text-emerald-400 text-xs">
                      ${(mat.currentStockKg * (mat.costPerKg || 1.85)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 mt-3 text-[11px] text-slate-400">
                <span className="truncate max-w-[150px]">{mat.supplier}</span>
                <span className="text-cyan-400 font-bold text-[10px] group-hover:translate-x-0.5 transition-transform">
                  Ver Ficha →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Ficha Técnica Detallada */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setSelectedMaterial(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Package className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">{selectedMaterial.code}</span>
                <h3 className="text-lg font-bold text-white">{selectedMaterial.name}</h3>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">Tipo de Polímero:</span>
                  <span className="font-semibold text-white">{selectedMaterial.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Proceso Recomendado:</span>
                  <span className="font-semibold text-white">{selectedMaterial.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Ubicación de Silo:</span>
                  <span className="font-semibold text-white">{selectedMaterial.siloLocation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Proveedor Petroquímico:</span>
                  <span className="font-semibold text-white">{selectedMaterial.supplier}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-slate-300 mb-2">Propiedades Reológicas & Físicas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Índice de Fluidez (MFI):</span>
                    <span className="font-mono text-cyan-300 font-bold">{selectedMaterial.meltFlowIndex} g/10min (190°C/2.16kg)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Densidad Estándar:</span>
                    <span className="font-mono text-cyan-300 font-bold">{selectedMaterial.density} g/cm³</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] block">Stock Actual</span>
                  <span className="font-bold text-white text-sm">{selectedMaterial.currentStockKg.toLocaleString()} kg</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Stock Mínimo</span>
                  <span className="font-bold text-amber-400 text-sm">{selectedMaterial.minStockKg.toLocaleString()} kg</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Capacidad Silo</span>
                  <span className="font-bold text-slate-300 text-sm">{selectedMaterial.maxCapacityKg.toLocaleString()} kg</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedMaterial(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Nueva Materia Prima */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              Registrar Nueva Materia Prima
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ingresa los parámetros técnicos y de almacenamiento para el balance de masas.
            </p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Código Único</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: HDPE-INJ-5502"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Polietileno de Alta Densidad"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tipo de Material</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as MaterialType })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="RESINA">RESINA VÍRGEN</option>
                    <option value="MASTERBATCH">MASTERBATCH (PIGMENTO)</option>
                    <option value="ADITIVO">ADITIVO QUÍMICO</option>
                    <option value="RECUPERADO">MATERIAL RECUPERADO (MOLINO)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Proceso Principal</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ProcessCategory })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="EXTRUSION">EXTRUSIÓN</option>
                    <option value="INYECCION">INYECCIÓN</option>
                    <option value="SOPLADO">SOPLADO</option>
                    <option value="TERMOFORMADO">TERMOFORMADO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">MFI (Índice Fluidez g/10min)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.meltFlowIndex}
                    onChange={(e) => setFormData({ ...formData, meltFlowIndex: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Densidad (g/cm³)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.density}
                    onChange={(e) => setFormData({ ...formData, density: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">Stock Inicial (kg)</label>
                  <input
                    type="number"
                    required
                    value={formData.currentStockKg}
                    onChange={(e) => setFormData({ ...formData, currentStockKg: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">Mínimo Alerta (kg)</label>
                  <input
                    type="number"
                    required
                    value={formData.minStockKg}
                    onChange={(e) => setFormData({ ...formData, minStockKg: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">Capacidad Silo (kg)</label>
                  <input
                    type="number"
                    required
                    value={formData.maxCapacityKg}
                    onChange={(e) => setFormData({ ...formData, maxCapacityKg: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Ubicación / Silo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Silo A-02"
                    value={formData.siloLocation}
                    onChange={(e) => setFormData({ ...formData, siloLocation: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Proveedor Habitual</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Braskem / Dow"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1">Precio Compra ($/kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    placeholder="1.85"
                    value={formData.costPerKg}
                    onChange={(e) => setFormData({ ...formData, costPerKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-emerald-500/50 text-emerald-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20"
                >
                  Guardar Materia Prima
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
