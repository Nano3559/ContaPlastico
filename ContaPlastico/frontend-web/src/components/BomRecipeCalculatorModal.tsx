import React, { useState, useMemo } from 'react';
import { 
  X, 
  FlaskConical, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  Layers, 
  ArrowRight,
  Info,
  Scale
} from 'lucide-react';
import type { RawMaterial, ProcessCategory } from '../types';
import { productionRequestsApi } from '../services/api';

interface BomRecipeCalculatorModalProps {
  materials: RawMaterial[];
  onClose: () => void;
  onOrderCreated: () => void;
}

interface BomComponent {
  materialId: string;
  percentage: number; // 0 to 100
}

interface PresetRecipe {
  id: string;
  name: string;
  processType: ProcessCategory;
  defaultBatchKg: number;
  productName: string;
  components: {
    materialNameKeyword: string;
    percentage: number;
  }[];
}

const PRESET_RECIPES: PresetRecipe[] = [
  {
    id: 'film-eco',
    name: 'Film Extrusión — Bolsa Biodegradable (Estándar)',
    processType: 'EXTRUSION',
    defaultBatchKg: 1500,
    productName: 'Bolsa PlastControl Bio 40x50 cm',
    components: [
      { materialNameKeyword: 'HDPE', percentage: 70 },
      { materialNameKeyword: 'RECUPERADO', percentage: 25 },
      { materialNameKeyword: 'MASTERBATCH', percentage: 5 }
    ]
  },
  {
    id: 'inj-caps',
    name: 'Inyección Alta Precisión — Tapas y Envases',
    processType: 'INYECCION',
    defaultBatchKg: 800,
    productName: 'Tapa Rosca 28mm PCO-1881',
    components: [
      { materialNameKeyword: 'PP', percentage: 96 },
      { materialNameKeyword: 'MASTERBATCH', percentage: 4 }
    ]
  },
  {
    id: 'blow-bottle',
    name: 'Soplado de Cuerpos Huecos — Botella 1 Litro',
    processType: 'SOPLADO',
    defaultBatchKg: 1200,
    productName: 'Envase HDPE 1000ml Industrial',
    components: [
      { materialNameKeyword: 'HDPE', percentage: 80 },
      { materialNameKeyword: 'RECUPERADO', percentage: 17 },
      { materialNameKeyword: 'MASTERBATCH', percentage: 3 }
    ]
  }
];

export const BomRecipeCalculatorModal: React.FC<BomRecipeCalculatorModalProps> = ({
  materials,
  onClose,
  onOrderCreated
}) => {
  const [orderCode, setOrderCode] = useState(`OP-REC-${Math.floor(100 + Math.random() * 900)}`);
  const [line, setLine] = useState('Línea de Extrusión 01');
  const [processType, setProcessType] = useState<ProcessCategory>('EXTRUSION');
  const [productName, setProductName] = useState('Bolsa PlastControl Bio 40x50 cm');
  const [targetBatchKg, setTargetBatchKg] = useState<number>(1500);
  const [requestedBy, setRequestedBy] = useState('Ing. Pedro Ramos (Jefe de Planta)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial default formulation components
  const [components, setComponents] = useState<BomComponent[]>(() => {
    if (materials.length >= 2) {
      return [
        { materialId: materials[0]?.id || '', percentage: 75 },
        { materialId: materials[1]?.id || '', percentage: 25 }
      ];
    }
    return materials.length > 0 ? [{ materialId: materials[0].id, percentage: 100 }] : [];
  });

  // Apply a preset recipe
  const applyPreset = (preset: PresetRecipe) => {
    setProductName(preset.productName);
    setProcessType(preset.processType);
    setTargetBatchKg(preset.defaultBatchKg);

    const newComps: BomComponent[] = [];
    preset.components.forEach(comp => {
      // Find material matching keyword
      const matched = materials.find(m => 
        m.name.toUpperCase().includes(comp.materialNameKeyword.toUpperCase()) ||
        m.type.toUpperCase().includes(comp.materialNameKeyword.toUpperCase()) ||
        m.code.toUpperCase().includes(comp.materialNameKeyword.toUpperCase())
      );
      if (matched) {
        newComps.push({ materialId: matched.id, percentage: comp.percentage });
      } else if (materials.length > 0) {
        newComps.push({ materialId: materials[0].id, percentage: comp.percentage });
      }
    });

    if (newComps.length > 0) {
      setComponents(newComps);
    }
  };

  const handleAddComponent = () => {
    if (materials.length === 0) return;
    const unusedMat = materials.find(m => !components.some(c => c.materialId === m.id)) || materials[0];
    setComponents([...components, { materialId: unusedMat.id, percentage: 0 }]);
  };

  const handleRemoveComponent = (index: number) => {
    setComponents(components.filter((_, idx) => idx !== index));
  };

  const handleUpdateComponent = (index: number, field: keyof BomComponent, value: string | number) => {
    setComponents(components.map((comp, idx) => {
      if (idx !== index) return comp;
      return { ...comp, [field]: value };
    }));
  };

  // Calculations
  const totalPercentage = useMemo(() => {
    return components.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);
  }, [components]);

  const calculatedItems = useMemo(() => {
    return components.map(c => {
      const mat = materials.find(m => m.id === c.materialId);
      const reqKg = (targetBatchKg * (Number(c.percentage) || 0)) / 100;
      const stockKg = mat?.currentStockKg || 0;
      const isSufficient = stockKg >= reqKg;
      const shortageKg = isSufficient ? 0 : reqKg - stockKg;
      return {
        ...c,
        material: mat,
        requiredKg: reqKg,
        availableStockKg: stockKg,
        isSufficient,
        shortageKg
      };
    });
  }, [components, targetBatchKg, materials]);

  const hasAnyShortage = calculatedItems.some(i => !i.isSufficient);
  const isValidPercentage = Math.abs(totalPercentage - 100) < 0.01;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPercentage || targetBatchKg <= 0 || components.length === 0) return;

    setIsSubmitting(true);
    try {
      await productionRequestsApi.create({
        orderCode: orderCode,
        line: line,
        processType: processType,
        targetProduct: productName,
        requiredMaterials: calculatedItems.map(item => ({
          materialId: item.material?.id || '',
          materialName: item.material ? `${item.material.name} (${item.percentage}%)` : 'Material',
          quantityKg: Number(item.requiredKg.toFixed(2))
        })),
        requestedBy: requestedBy
      });
      onOrderCreated();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white font-outfit">Formulador de Recetas & Mezclas (BOM)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Bill of Materials
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Calcula la dosificación exacta de resina virgen, molido recuperado y masterbatch con validación de stock de silos en tiempo real.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmitOrder} className="p-6 space-y-6">
          
          {/* Quick Presets Section */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Cargar Recetas Estándar Preconfiguradas
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {PRESET_RECIPES.map(preset => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="p-3 rounded-xl bg-slate-900/90 hover:bg-purple-950/30 border border-slate-800 hover:border-purple-500/40 text-left transition-all group"
                >
                  <div className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>{preset.processType}</span>
                    <span className="font-mono text-purple-400">Lote base: {preset.defaultBatchKg} kg</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Top Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Código de Orden</label>
              <input
                type="text"
                required
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Línea o Extrusora</label>
              <input
                type="text"
                required
                value={line}
                onChange={(e) => setLine(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Proceso</label>
              <select
                value={processType}
                onChange={(e) => setProcessType(e.target.value as ProcessCategory)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white"
              >
                <option value="EXTRUSION">EXTRUSIÓN</option>
                <option value="INYECCION">INYECCIÓN</option>
                <option value="SOPLADO">SOPLADO</option>
                <option value="TERMOFORMADO">TERMOFORMADO</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-cyan-400 mb-1 flex items-center justify-between">
                <span>Total Lote Deseado</span>
                <Scale className="w-3 h-3 text-cyan-400" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="10"
                  required
                  value={targetBatchKg}
                  onChange={(e) => setTargetBatchKg(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-cyan-500/50 text-cyan-300 font-extrabold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">KG</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Producto Objetivo</label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>

          {/* BOM Components Breakdown Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Matriz de Componentes & Dosificación
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono ${
                  isValidPercentage 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  Total: {totalPercentage.toFixed(1)}% / 100%
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddComponent}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                <span>Agregar Materia Prima</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Materia Prima / Silo</th>
                    <th className="py-3 px-4 w-28 text-center">% Mezcla</th>
                    <th className="py-3 px-4 text-right">Cantidad Requerida</th>
                    <th className="py-3 px-4 text-right">Stock en Silo</th>
                    <th className="py-3 px-4 text-center">Validación</th>
                    <th className="py-3 px-4 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {calculatedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <select
                          value={item.materialId}
                          onChange={(e) => handleUpdateComponent(idx, 'materialId', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-medium focus:border-purple-500"
                        >
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.type}) — {m.siloLocation}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={item.percentage}
                            onChange={(e) => handleUpdateComponent(idx, 'percentage', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-center font-bold text-white bg-slate-900 border border-slate-700 rounded-lg text-xs"
                          />
                          <span className="text-slate-500 font-bold text-xs">%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-extrabold text-cyan-400 text-sm">
                          {item.requiredKg.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono text-slate-300">
                          {item.availableStockKg.toLocaleString()} kg
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.isSufficient ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Disponible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3" />
                            Faltan {item.shortageKg.toFixed(0)} kg
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation Warnings */}
          {!isValidPercentage && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                La suma de los porcentajes de la receta debe ser exactamente <strong>100%</strong> (actualmente: <strong>{totalPercentage.toFixed(1)}%</strong>).
              </span>
            </div>
          )}

          {hasAnyShortage && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>
                <strong>Alerta de Abastecimiento:</strong> Uno o más materiales no cuentan con stock suficiente en los silos para cubrir el lote de {targetBatchKg.toLocaleString()} kg.
              </span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Solicitado por: <strong className="text-slate-200">{requestedBy}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isValidPercentage || isSubmitting || components.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-extrabold shadow-lg shadow-purple-500/20 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Emitiendo Orden...' : 'Crear Orden con Mezcla BOM'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
