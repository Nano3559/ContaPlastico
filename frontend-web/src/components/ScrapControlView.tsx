import React, { useState, useEffect } from 'react';
import { 
  TrendingDown, 
  Scale, 
  PlusCircle, 
  RotateCcw, 
  AlertTriangle, 
  PieChart, 
  CheckCircle2, 
  Flame, 
  Recycle,
  Sparkles,
  DollarSign,
  Coins,
  ArrowUpRight,
  TrendingUp,
  Settings2
} from 'lucide-react';
import { scrapApi, rawMaterialsApi } from '../services/api';
import type { ScrapRecord, RawMaterial } from '../types';
import { useToast } from '../context/ToastContext';

export const ScrapControlView: React.FC = () => {
  const { showToast } = useToast();
  const [scrapList, setScrapList] = useState<ScrapRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Financial Cost Configuration ($/kg USD)
  const [priceVirginKg, setPriceVirginKg] = useState<number>(1.85); // Costo resina virgen
  const [priceRecoveredKg, setPriceRecoveredKg] = useState<number>(1.15); // Valor rescate molino
  const [showCostConfig, setShowCostConfig] = useState<boolean>(false);

  // Form State
  const [calcUsed, setCalcUsed] = useState<number>(1000);
  const [calcGood, setCalcGood] = useState<number>(930);
  const [calcRecoverable, setCalcRecoverable] = useState<number>(50);
  const [calcDiscard, setCalcDiscard] = useState<number>(20);
  const [calcCause, setCalcCause] = useState<string>('Calibración y purga de cambio de color');
  const [calcLine, setCalcLine] = useState<string>('Línea de Extrusión 02');
  const [calcOrder, setCalcOrder] = useState<string>('OP-2026-440');

  const loadData = async () => {
    setIsLoading(true);
    const res = await scrapApi.getAll();
    setScrapList(res.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUsed = scrapList.reduce((acc, s) => acc + s.rawMaterialUsedKg, 0);
  const totalGood = scrapList.reduce((acc, s) => acc + s.finishedProductKg, 0);
  const totalRecoverable = scrapList.reduce((acc, s) => acc + s.recoverableScrapKg, 0);
  const totalDiscard = scrapList.reduce((acc, s) => acc + s.discardScrapKg, 0);
  const avgScrapPct = totalUsed > 0 ? (((totalUsed - totalGood) / totalUsed) * 100).toFixed(2) : '0';

  // Financial metrics
  const totalDiscardLossUsd = totalDiscard * priceVirginKg;
  const totalRecoveredSavingsUsd = totalRecoverable * priceRecoveredKg;
  const netFinancialImpactUsd = totalDiscardLossUsd - totalRecoveredSavingsUsd;

  // Live form financial metrics
  const formDiscardLossUsd = calcDiscard * priceVirginKg;
  const formRecoveredSavingsUsd = calcRecoverable * priceRecoveredKg;
  const formNetCostUsd = formDiscardLossUsd - formRecoveredSavingsUsd;

  const handleAddScrap = async (e: React.FormEvent) => {
    e.preventDefault();
    await scrapApi.create({
      productionOrderId: calcOrder,
      consumedRawMaterialKg: Number(calcUsed),
      producedGoodKg: Number(calcGood),
      scrapRecoverableKg: Number(calcRecoverable),
      scrapDiscardKg: Number(calcDiscard),
      cause: calcCause,
      machineLine: calcLine
    });
    showToast(
      'Balance de Merma Registrado',
      `Orden ${calcOrder}: +${calcRecoverable} kg molidos recuperados (+$${(calcRecoverable * priceRecoveredKg).toFixed(2)} USD).`,
      'success'
    );
    loadData();
  };

  const currentScrapPct = calcUsed > 0 
    ? (((calcUsed - calcGood) / calcUsed) * 100).toFixed(2)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Scale className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Eficiencia, Balance & Monetización</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">
            Control de Merma (Scrap) & Costeo Financiero
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Balance de masas y cálculo del impacto económico: Pérdidas por purga sucia vs Ahorro por reincorporación de molido a tolva.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCostConfig(!showCostConfig)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-lg transition-all"
          >
            <Settings2 className="w-4 h-4 text-amber-400" />
            <span>Configurar Precios ($/kg)</span>
          </button>
        </div>
      </div>

      {/* Cost Configuration Panel (Collapsible) */}
      {showCostConfig && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Costo Promedio Resina Virgen ($ USD / kg)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">$</span>
              <input
                type="number"
                step="0.05"
                min="0.1"
                value={priceVirginKg}
                onChange={(e) => setPriceVirginKg(Math.max(0.1, Number(e.target.value)))}
                className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Costo base de compra a petroquímicas</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Valor de Rescate Material Molido ($ USD / kg)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">$</span>
              <input
                type="number"
                step="0.05"
                min="0.1"
                value={priceRecoveredKg}
                onChange={(e) => setPriceRecoveredKg(Math.max(0.1, Number(e.target.value)))}
                className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono font-bold"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Ahorro al reinyectar o extrudir material recuperado</span>
          </div>
        </div>
      )}

      {/* KPI Cards: Masa y Finanzas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Total Alimentado</span>
            <div className="text-xl font-extrabold text-white mt-0.5">{totalUsed.toLocaleString()} kg</div>
            <span className="text-[10px] text-slate-500">Materia prima procesada</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Scale className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Producto Conforme</span>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{totalGood.toLocaleString()} kg</div>
            <span className="text-[10px] text-emerald-400/80 font-medium">
              {totalUsed > 0 ? ((totalGood / totalUsed) * 100).toFixed(1) : 0}% rendimiento físico
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI Financiero 1: Ahorro Rescatado */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Ahorro Molino Rescatado</span>
            <div className="text-xl font-extrabold text-cyan-400 mt-0.5">
              +${totalRecoveredSavingsUsd.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-cyan-400/80 font-medium">
              +{totalRecoverable.toLocaleString()} kg reciclados
            </span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* KPI Financiero 2: Pérdida Neta */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Pérdida por Purgas</span>
            <div className="text-xl font-extrabold text-rose-400 mt-0.5">
              -${totalDiscardLossUsd.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-rose-400/80 font-medium">
              {totalDiscard.toLocaleString()} kg no recuperables
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Calculator & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Formulario Calculador con Costeo en Vivo */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              Registro de Balance de Producción & Costeo
            </h3>
            <p className="text-xs text-slate-400">
              Ingresa los pesajes al cierre del lote o turno para calcular el balance de masa e impacto en dólares.
            </p>
          </div>

          <form onSubmit={handleAddScrap} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Orden de Producción</label>
                <input
                  type="text"
                  required
                  value={calcOrder}
                  onChange={(e) => setCalcOrder(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Línea de Proceso</label>
                <input
                  type="text"
                  required
                  value={calcLine}
                  onChange={(e) => setCalcLine(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-cyan-400 mb-1">
                1. Materia Prima Alimentada a Tolva (kg)
              </label>
              <input
                type="number"
                required
                value={calcUsed}
                onChange={(e) => setCalcUsed(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-cyan-500/50 text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-emerald-400 mb-1">
                  2. Prod. Conforme (kg)
                </label>
                <input
                  type="number"
                  required
                  value={calcGood}
                  onChange={(e) => setCalcGood(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-cyan-400 mb-1">
                  3. Scrap Molible (kg)
                </label>
                <input
                  type="number"
                  required
                  value={calcRecoverable}
                  onChange={(e) => setCalcRecoverable(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-rose-400 mb-1">
                  4. Purga Desecho (kg)
                </label>
                <input
                  type="number"
                  required
                  value={calcDiscard}
                  onChange={(e) => setCalcDiscard(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Causa Principal de la Merma</label>
              <input
                type="text"
                required
                value={calcCause}
                onChange={(e) => setCalcCause(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
              />
            </div>

            {/* Live Financial Balance Simulation Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="text-slate-400">Merma Porcentual:</span>
                <span className="font-extrabold text-amber-400 text-sm">{currentScrapPct}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Pérdida por Purga:</span>
                  <span className="font-mono font-extrabold text-rose-400">
                    -${formDiscardLossUsd.toFixed(2)} USD
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Ahorro Molino:</span>
                  <span className="font-mono font-extrabold text-emerald-400">
                    +${formRecoveredSavingsUsd.toFixed(2)} USD
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 text-xs">
                <span className="text-[11px] font-bold text-slate-300">Balance Económico del Lote:</span>
                <span className={`font-mono font-black text-sm ${formNetCostUsd > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formNetCostUsd > 0 ? `-$${formNetCostUsd.toFixed(2)} USD` : `+$${Math.abs(formNetCostUsd).toFixed(2)} USD`}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
            >
              Registrar Balance & Actualizar Stock Recuperado
            </button>
          </form>
        </div>

        {/* Historial de Mermas con Costeo Individual */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              Historial de Mermas & Costo Asociado
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Valuación @ ${priceVirginKg}/kg</span>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {scrapList.map((s) => {
              const discardCost = s.discardScrapKg * priceVirginKg;
              const recoveredValue = s.recoverableScrapKg * priceRecoveredKg;
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-amber-400">{s.orderNumber}</span>
                      <span className="text-[10px] text-slate-500">{s.createdAt}</span>
                    </div>
                    <div className="text-white font-semibold text-sm mb-1">{s.machineLine}</div>
                    <p className="text-xs text-slate-400 mb-2">Causa: <span className="text-slate-200">{s.cause}</span></p>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-center">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Alimentado</span>
                        <strong className="text-white">{s.rawMaterialUsedKg} kg</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Scrap Molino</span>
                        <strong className="text-cyan-400">+{s.recoverableScrapKg} kg</strong>
                        <span className="text-[9px] text-emerald-400 block font-mono">+${recoveredValue.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Purga Perdida</span>
                        <strong className="text-rose-400">{s.discardScrapKg} kg</strong>
                        <span className="text-[9px] text-rose-400 block font-mono">-${discardCost.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

