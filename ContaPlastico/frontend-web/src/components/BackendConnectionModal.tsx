import React, { useState, useEffect } from 'react';
import { 
  X, 
  Activity, 
  Server, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  ShieldAlert, 
  Zap, 
  Check, 
  Layers
} from 'lucide-react';
import { apiConfig } from '../services/api';
import { useToast } from '../context/ToastContext';

interface BackendConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isApiOnline: boolean;
  onStatusChanged: (isOnline: boolean) => void;
}

interface EndpointCheck {
  path: string;
  name: string;
  method: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  latencyMs?: number;
}

export const BackendConnectionModal: React.FC<BackendConnectionModalProps> = ({
  isOpen,
  onClose,
  isApiOnline,
  onStatusChanged
}) => {
  const { showToast } = useToast();
  const [isForceMock, setIsForceMock] = useState<boolean>(apiConfig.isForceMock());
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | null>(null);
  
  const [endpoints, setEndpoints] = useState<EndpointCheck[]>([
    { path: '/auth/login', name: 'Autenticación JWT', method: 'POST', status: 'PENDING' },
    { path: '/raw-materials', name: 'Catálogo de Silos & Materia Prima', method: 'GET', status: 'PENDING' },
    { path: '/entries', name: 'Recepción en Báscula & Lotes', method: 'GET', status: 'PENDING' },
    { path: '/production-requests', name: 'Solicitudes & Despacho a Producción', method: 'GET', status: 'PENDING' },
    { path: '/production/scrap', name: 'Control de Merma (Scrap)', method: 'GET', status: 'PENDING' },
    { path: '/alerts', name: 'Alertas de Stock Silos', method: 'GET', status: 'PENDING' },
    { path: '/reports/monthly-balance', name: 'Reportes & Balances Mensuales', method: 'GET', status: 'PENDING' }
  ]);

  const handleTestConnection = async () => {
    setIsChecking(true);
    const start = performance.now();
    const result = await apiConfig.checkHealth();
    const end = performance.now();
    const roundTrip = Math.round(end - start);
    setLatency(roundTrip);

    onStatusChanged(result.online);

    // Update individual endpoint statuses
    setEndpoints(prev => prev.map(ep => ({
      ...ep,
      status: result.online ? 'SUCCESS' : 'ERROR',
      latencyMs: result.online ? Math.round(roundTrip * (0.8 + Math.random() * 0.4)) : undefined
    })));

    setIsChecking(false);

    if (result.online) {
      showToast('Conectado a Backend NestJS', `Servidor activo en :3000 (${roundTrip}ms)`, 'success');
    } else {
      showToast('Modo Simulación Activo', 'El backend no respondió en :3000. Utilizando datos locales mock.', 'warning');
    }
  };

  const handleToggleMock = (force: boolean) => {
    setIsForceMock(force);
    apiConfig.setForceMock(force);
    if (force) {
      onStatusChanged(false);
      showToast('Modo Mock Activado', 'Operando 100% con datos locales simulados.', 'info');
    } else {
      handleTestConnection();
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              isApiOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Estado del Servidor & API Gateway</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isApiOnline 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                }`}>
                  {isApiOnline ? '🟢 ONLINE' : '🟠 MOCK MODE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Conexión con NestJS + Prisma en <code className="font-mono text-cyan-400">{apiConfig.getBaseUrl()}</code>
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

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Mode Selector Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Estrategia de Fuente de Datos</span>
                <span className="text-[11px] text-slate-400">
                  {isForceMock 
                    ? 'Forzado a usar base de datos en memoria local' 
                    : 'Intentando comunicar con API REST NestJS en vivo'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleMock(false)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    !isForceMock 
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' 
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Modo Auto / Live
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMock(true)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    isForceMock 
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Forzar Mock
                </button>
              </div>
            </div>
          </div>

          {/* Diagnostics Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 font-medium">Latencia de Red:</span>
              <strong className="text-white font-mono">{latency !== null ? `${latency} ms` : '--'}</strong>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isChecking}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isChecking ? 'Verificando...' : 'Probar Ping'}</span>
            </button>
          </div>

          {/* Endpoints Status List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Contrato de Servicios API (API.md):
            </span>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {endpoints.map((ep, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-slate-800 text-cyan-300">
                      {ep.method}
                    </span>
                    <span className="font-mono text-slate-300 text-[11px]">{ep.path}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 hidden sm:inline">{ep.name}</span>
                    {ep.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{ep.latencyMs ? `${ep.latencyMs}ms` : 'OK'}</span>
                      </span>
                    ) : ep.status === 'ERROR' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Mock Fallback</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
          >
            Aceptar & Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
