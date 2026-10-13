import React from 'react';
import { 
  Server, 
  Monitor, 
  Smartphone, 
  ShieldCheck, 
  GitBranch
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
          División en Capas & Colaboración
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-outfit mt-3 mb-4">
          Arquitectura del Sistema & Roles del Equipo
        </h2>
        <p className="text-slate-400 text-sm sm:text-base">
          Modelo cliente-servidor centrado en una única API REST en NestJS. Tanto la aplicación Web como la App Móvil consumen los mismos endpoints sin lógica duplicada.
        </p>
      </div>

      {/* 3 Person Work Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        {/* Persona A - Backend */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                Persona 1 / A
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Server className="w-5 h-5" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Backend & Base de Datos</h3>
            <p className="text-xs text-slate-400 mb-4">
              API REST completa, migraciones ORM, autenticación JWT, lógica de cálculo de mermas y cron jobs.
            </p>

            <div className="space-y-2 text-xs mb-4">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Framework:</span>
                <span className="font-semibold text-purple-300">NestJS (TypeScript)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">ORM & Base:</span>
                <span className="font-semibold text-purple-300">Prisma (Postgres / MySQL)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Directorio:</span>
                <span className="font-mono text-purple-300">/backend</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
            Hito Sem 1: Endpoints base listos (días 1–3)
          </div>
        </div>

        {/* Persona B - Web (Active User) */}
        <div className="glass-panel p-6 rounded-2xl border border-cyan-500/50 bg-slate-900/60 shadow-xl shadow-cyan-500/10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-500 text-slate-950 font-extrabold text-[10px] rounded-bl-xl uppercase tracking-wider">
            Tu Rol Actual
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Persona 2 / B
              </span>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Monitor className="w-5 h-5" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Frontend Web & Portal</h3>
            <p className="text-xs text-slate-400 mb-4">
              Landing page de presentación, dashboard gerencial, tablas con filtros avanzados, formularios y reportes.
            </p>

            <div className="space-y-2 text-xs mb-4">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Framework:</span>
                <span className="font-semibold text-cyan-300">React + Vite + Tailwind</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Estado UI:</span>
                <span className="font-semibold text-cyan-300">Context / Hooks + Lucide</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Directorio:</span>
                <span className="font-mono text-cyan-300">/frontend-web</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-cyan-400 border-t border-slate-800 pt-3 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Landing Page & Setup inicial completados</span>
          </div>
        </div>

        {/* Persona C - Mobile */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Persona 3 / C
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">App Móvil para Planta</h3>
            <p className="text-xs text-slate-400 mb-4">
              Registro ágil de entradas en báscula, consultas de stock en silos desde planta y solicitud de materia prima.
            </p>

            <div className="space-y-2 text-xs mb-4">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Framework:</span>
                <span className="font-semibold text-emerald-300">React Native (Expo)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Consumo:</span>
                <span className="font-semibold text-emerald-300">Cliente Axios común</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Directorio:</span>
                <span className="font-mono text-emerald-300">/mobile-app</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
            Hito Sem 1: Pantallas base de login, stock y pesaje
          </div>
        </div>

      </div>

      {/* Monorepo Architecture Flow Diagram */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          Estructura del Repositorio Compartido
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-cyan-400 font-bold mb-2">📁 frontend-web/</div>
            <div className="text-slate-400 space-y-1 text-[11px]">
              <div>├── src/components/</div>
              <div>├── src/data/</div>
              <div>├── src/types/</div>
              <div>├── App.tsx</div>
              <div>└── vite.config.ts</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-purple-400 font-bold mb-2">📁 backend/</div>
            <div className="text-slate-400 space-y-1 text-[11px]">
              <div>├── src/auth/</div>
              <div>├── src/raw-materials/</div>
              <div>├── src/inventory/</div>
              <div>├── prisma/schema.prisma</div>
              <div>└── docker-compose.yml</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-emerald-400 font-bold mb-2">📁 mobile-app/</div>
            <div className="text-slate-400 space-y-1 text-[11px]">
              <div>├── src/screens/</div>
              <div>├── src/navigation/</div>
              <div>├── src/services/</div>
              <div>├── App.tsx</div>
              <div>└── app.json</div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};
