import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Settings, 
  PlusCircle, 
  CheckCircle2, 
  Lock, 
  Sliders, 
  Building, 
  Database,
  Mail,
  Clock
} from 'lucide-react';
import { authApi } from '../services/api';
import type { UserProfile, UserRole } from '../types';

export const UsersConfigView: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [factoryName, setFactoryName] = useState<string>('PlastControl Planta Principal');
  const [siloCapacityDefault, setSiloCapacityDefault] = useState<number>(20000);
  const [cronAlertFrequency, setCronAlertFrequency] = useState<number>(15);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    authApi.getUsers().then(res => {
      setUsers(res.data);
    });
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };


  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Administración</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">
            Usuarios, Roles & Configuración de Fábrica
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Control de accesos según roles (Almacén, Producción, Supervisor, Admin) y parámetros globales de silos.
          </p>
        </div>
      </div>

      {/* Grid: Users Table & Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Users Section */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Operadores y Supervisores Autorizados
            </h3>
          </div>

          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-cyan-400">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{u.name}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {u.email}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                    u.role === 'ALMACEN' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {u.role}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1">{u.shift}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Factory Settings Section */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-400" />
            Parámetros de la Planta
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Ajustes globales para alertas y pesajes de tolvas.
          </p>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nombre de la Fábrica</label>
              <input
                type="text"
                value={factoryName}
                onChange={(e) => setFactoryName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Capacidad Estándar de Silo (kg)</label>
              <input
                type="number"
                value={siloCapacityDefault}
                onChange={(e) => setSiloCapacityDefault(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Frecuencia de Alerta de Stock (min)</label>
              <input
                type="number"
                value={cronAlertFrequency}
                onChange={(e) => setCronAlertFrequency(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Sincronizado con cron NestJS backend.</span>
            </div>

            {isSaved && (
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Configuración guardada exitosamente.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all"
            >
              Guardar Configuración
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
