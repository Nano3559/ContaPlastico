import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  timestamp: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  notificationsHistory: ToastItem[];
  showToast: (title: string, message?: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  clearHistory: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notificationsHistory, setNotificationsHistory] = useState<ToastItem[]>([
    {
      id: 'init-1',
      title: 'Sistema PlastControl Listo',
      message: 'Módulos de materia prima, báscula y silos sincronizados.',
      type: 'info',
      timestamp: 'Hoy, 08:00 AM'
    },
    {
      id: 'init-2',
      title: 'Alerta de Stock Crítico',
      message: 'Silo C-03 (PP Copolímero) por debajo del 30% de reserva.',
      type: 'warning',
      timestamp: 'Hoy, 09:15 AM'
    }
  ]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'info') => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newToast: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      message,
      type,
      timestamp: timeString
    };

    setToasts(prev => [newToast, ...prev.slice(0, 4)]); // Máximo 5 toasts visibles
    setNotificationsHistory(prev => [newToast, ...prev.slice(0, 20)]); // Guardar últimos 20

    // Auto dismiss tras 4 segundos
    setTimeout(() => {
      removeToast(newToast.id);
    }, 4500);
  }, [removeToast]);

  const clearHistory = useCallback(() => {
    setNotificationsHistory([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, notificationsHistory, showToast, removeToast, clearHistory }}>
      {children}
      
      {/* Floating Toasts View */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const borderColors = {
            success: 'border-emerald-500/40 bg-slate-900/95 text-emerald-300',
            warning: 'border-amber-500/40 bg-slate-900/95 text-amber-300',
            error: 'border-rose-500/40 bg-slate-900/95 text-rose-300',
            info: 'border-cyan-500/40 bg-slate-900/95 text-cyan-300'
          }[toast.type];

          const IconComponent = {
            success: CheckCircle2,
            warning: AlertTriangle,
            error: AlertCircle,
            info: Info
          }[toast.type];

          const iconColors = {
            success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
            error: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
            info: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 animate-in slide-in-from-top-3 fade-in duration-200 ${borderColors}`}
            >
              <div className={`p-1.5 rounded-xl border flex-shrink-0 ${iconColors}`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-white leading-tight">{toast.title}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">{toast.timestamp}</span>
                </div>
                {toast.message && (
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
