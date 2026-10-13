import React from 'react';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Trash2, 
  CheckCheck
} from 'lucide-react';
import { useToast, type ToastItem } from '../context/ToastContext';

interface NotificationsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  isOpen,
  onClose
}) => {
  const { notificationsHistory, clearHistory } = useToast();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Centro de Notificaciones & Eventos</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {notificationsHistory.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Registro en tiempo real de operaciones de planta, báscula y alertas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Notifications */}
        <div className="p-6 space-y-3 max-h-[480px] overflow-y-auto text-xs">
          {notificationsHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Bell className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
              <p className="font-semibold text-slate-400">No hay notificaciones recientes</p>
              <p className="text-[11px] text-slate-600">Las acciones y alertas de stock aparecerán aquí en vivo.</p>
            </div>
          ) : (
            notificationsHistory.map((item) => {
              const iconColors = {
                success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                error: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                info: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
              }[item.type];

              const IconComponent = {
                success: CheckCircle2,
                warning: AlertTriangle,
                error: AlertCircle,
                info: Info
              }[item.type];

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className={`p-1.5 rounded-xl border flex-shrink-0 ${iconColors}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-white leading-tight">{item.title}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                    </div>
                    {item.message && (
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">{item.message}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={clearHistory}
            disabled={notificationsHistory.length === 0}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar Historial</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
