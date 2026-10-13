import React, { useState } from 'react';
import { Shield, CheckCircle2, KeyRound, X } from 'lucide-react';
import type { UserProfile, UserRole } from '../types';
import { mockUsers } from '../data/mockData';

interface RoleSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
}

export const RoleSimulator: React.FC<RoleSimulatorProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  setCurrentUser 
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
    setSelectedRole(user.role);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 900);
  };

  const roleDetails: Record<UserRole, { title: string; desc: string; permissions: string[] }> = {
    ADMIN: {
      title: 'Administrador del Sistema',
      desc: 'Control total de configuración, usuarios, CRUD de materias primas, aprobación de órdenes y exportación de reportes.',
      permissions: ['Gestionar usuarios y roles', 'Ajustes manuales de inventario', 'Reportes contables y de merma', 'Crear y editar materias primas']
    },
    ALMACEN: {
      title: 'Jefe / Operador de Almacén',
      desc: 'Pesaje y recepción de camiones en báscula, asignación de lotes a silos y despacho físico a planta.',
      permissions: ['Registrar entradas de materia prima', 'Inspección de calidad y certificados', 'Despachar solicitudes a producción', 'Visualizar stock de silos']
    },
    PRODUCCION: {
      title: 'Supervisor / Operador de Producción',
      desc: 'Solicitud de mezclas de resina y aditivos para máquinas de extrusión/inyección y registro de mermas.',
      permissions: ['Crear solicitudes de materia prima', 'Registrar scrap recuperable y purgas', 'Monitorear stock disponible', 'Consultar recetas de producción']
    },
    SUPERVISOR: {
      title: 'Supervisión de Operaciones',
      desc: 'Visualización de KPIs de rendimiento, indicadores de mermas, auditorías y seguimiento operativo global.',
      permissions: ['Dashboard ejecutivo de KPIs', 'Descarga de balances mensuales PDF/Excel', 'Visualización de alertas de stock', 'Monitoreo de desempeño por turno']
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white font-outfit">
              Simulador de Acceso & Permisos por Rol
            </h3>
            <p className="text-xs text-slate-400">
              Prueba la experiencia de usuario y endpoints accesibles según el perfil autenticado (JWT).
            </p>
          </div>
        </div>

        {/* User Card Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {mockUsers.map((user) => {
            const isCurrent = currentUser.id === user.id;
            return (
              <button
                key={user.id}
                onClick={() => handleSwitchUser(user)}
                className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden ${
                  isCurrent 
                    ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/15'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' :
                    user.role === 'ALMACEN' ? 'bg-cyan-500/20 text-cyan-300' :
                    'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <div className="font-bold text-white text-xs truncate">{user.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                
                {isCurrent && (
                  <div className="mt-2 text-[10px] font-semibold text-cyan-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sesión Activa</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Current Role Details */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              {roleDetails[selectedRole]?.title}
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
              JWT Payload: role = "{selectedRole}"
            </span>
          </div>
          <p className="text-xs text-slate-300 mb-3">
            {roleDetails[selectedRole]?.desc}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {roleDetails[selectedRole]?.permissions.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-300 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Success toast */}
        {showSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold animate-bounce">
            ✓ Sesión cambiada a {currentUser.name} ({currentUser.role})
          </div>
        )}

      </div>
    </div>
  );
};
