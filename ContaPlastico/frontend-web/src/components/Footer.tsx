import React from 'react';
import { Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1 */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Layers className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-white text-lg font-outfit">
                PLAST<span className="text-cyan-400">CONTROL</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-4">
              Sistema integral de control y balance de materia prima, gestión de silos de resina y reducción de merma para la industria de manufactura plástica.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Stack: NestJS • React • React Native • Prisma</span>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Módulos</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>• Inventario & Silos</li>
              <li>• Entradas & Pesaje Báscula</li>
              <li>• Despacho a Producción</li>
              <li>• Balance & Merma (Scrap)</li>
              <li>• Alertas Cron de Stock</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Equipo de Desarrollo</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>• <span className="text-purple-300">Persona 1:</span> Backend REST & DB</li>
              <li>• <span className="text-cyan-300">Persona 2 (Tú):</span> Web & Landing Page</li>
              <li>• <span className="text-emerald-300">Persona 3:</span> App Móvil (Expo)</li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            © 2026 PlastControl — Proyecto Sistema de Control de Materia Prima.
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Listo para repositorio compartido en GitHub</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </div>
        </div>

      </div>
    </footer>
  );
};
