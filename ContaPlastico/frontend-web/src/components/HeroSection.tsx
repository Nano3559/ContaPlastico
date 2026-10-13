import React from 'react';
import { 
  Boxes, 
  TrendingDown, 
  Sparkles, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  Layers,
  Scale,
  Factory
} from 'lucide-react';
import type { RawMaterial } from '../types';

interface HeroSectionProps {
  materials: RawMaterial[];
  onOpenDemo: () => void;
  onOpenApiDocs: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ materials, onOpenDemo, onOpenApiDocs }) => {
  // Calculations
  const totalStockTon = (materials.reduce((acc, m) => acc + m.currentStockKg, 0) / 1000).toFixed(1);
  const criticalCount = materials.filter(m => m.status === 'CRITICO' || m.status === 'BAJO').length;

  return (
    <section className="relative pt-8 pb-16 overflow-hidden radial-grid-bg">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Badge & Pill */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-sm shadow-cyan-500/10">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Arquitectura en Capas: NestJS + React + React Native</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs">
            <Factory className="w-3.5 h-3.5 text-emerald-400" />
            <span>Extrusión • Inyección • Soplado</span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-none font-outfit mb-6">
            Control de Materia Prima y <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              Reducción de Mermas
            </span> en Tiempo Real
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Plataforma centralizada para gestionar resinas vírgenes, polímeros recuperados, masterbatch y aditivos.
            Sincronización instantánea entre el pesaje en almacén, órdenes de planta y reportes gerenciales.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <button
            onClick={onOpenDemo}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
          >
            <span>Explorar Dashboard Interactivo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onOpenApiDocs}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Ver Contrato API (Para Backend & Móvil)</span>
          </button>
        </div>

        {/* High Impact KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          
          {/* Card 1: Total Stock */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Materia Prima en Silos</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-extrabold text-white font-outfit">{totalStockTon}</span>
              <span className="text-xs font-bold text-slate-400">Toneladas</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>6 Silos & Tolvas monitoreados</span>
            </div>
          </div>

          {/* Card 2: Scrap Rate */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasa de Merma (Scrap)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-extrabold text-white font-outfit">3.8%</span>
              <span className="text-xs font-bold text-emerald-400">-1.4% vs meta</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span>75% recuperable en molino</span>
            </div>
          </div>

          {/* Card 3: Active Alerts */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas de Reabastecimiento</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-extrabold text-amber-400 font-outfit">{criticalCount}</span>
              <span className="text-xs font-semibold text-slate-400">polímeros bajo nivel</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400/90">
              <span>LDPE Film y PP Copolímero</span>
            </div>
          </div>

          {/* Card 4: Daily Movements */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flujo de Producción</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-extrabold text-white font-outfit">8.5 T</span>
              <span className="text-xs font-bold text-slate-400">despachadas hoy</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Extrusión (5.2T) • Inyección (3.3T)</span>
            </div>
          </div>

        </div>

        {/* Live Silo Gauges Preview */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                Monitoreo en Tiempo Real de Silos y Tolvas
              </h3>
              <p className="text-xs text-slate-400">Nivel de llenado, densidad y flujo según sensores y pesaje de entrada</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-700">
              Sincronizado vía WebSocket / Cron REST
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {materials.slice(0, 3).map((mat) => {
              const percent = Math.min(100, Math.round((mat.currentStockKg / mat.maxCapacityKg) * 100));
              return (
                <div key={mat.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {mat.code}
                      </span>
                      <h4 className="text-sm font-semibold text-white mt-1.5 line-clamp-1">{mat.name}</h4>
                    </div>
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

                  <div className="text-xs text-slate-400 mb-3 flex items-center justify-between">
                    <span>{mat.siloLocation}</span>
                    <span className="font-mono text-slate-300">{mat.currentStockKg.toLocaleString()} / {mat.maxCapacityKg.toLocaleString()} kg</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        percent > 40 ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' :
                        percent > 20 ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                        'bg-gradient-to-r from-rose-600 to-red-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>MFI: {mat.meltFlowIndex} g/10min</span>
                    <span className="font-bold text-slate-200">{percent}% de capacidad</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};
