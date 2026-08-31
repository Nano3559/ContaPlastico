import React from 'react';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ClipboardList,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Tag,
  Factory,
  FileCheck2,
  Scale,
  TrendingDown,
  Building2,
  FileSpreadsheet,
  Users,
  Settings,
  Shield,
  Layers,
  LogOut
} from 'lucide-react';
import type { UserProfile } from '../types';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  currentUser: UserProfile;
  onOpenRoleModal: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  setActiveSection,
  currentUser,
  onOpenRoleModal,
  onLogout
}) => {
  const menuItems = [
    { id: 'dashboard', label: '2. Dashboard Principal', icon: LayoutDashboard, badge: 'Punto 3' },
    { id: 'materias-primas', label: '3. Materias Primas', icon: Package },
    { id: 'registrar-materia', label: '4. Registrar Materia Prima', icon: PlusCircle },
    { id: 'inventario', label: '5. Inventario General', icon: ClipboardList },
    { id: 'entradas', label: '6. Entradas de Materia', icon: ArrowDownRight },
    { id: 'salidas', label: '7. Salidas a Producción', icon: ArrowUpRight },
    { id: 'movimientos', label: '8. Movimientos Historial', icon: History },
    { id: 'lotes', label: '9. Control por Lotes', icon: Tag },
    { id: 'produccion', label: '10. Producción', icon: Factory },
    { id: 'ordenes', label: '11. Órdenes de Producción', icon: FileCheck2 },
    { id: 'consumo', label: '12. Consumo de Material', icon: Scale },
    { id: 'merma', label: '13. Control de Merma', icon: TrendingDown },
    { id: 'proveedores', label: '14. Proveedores', icon: Building2 },
    { id: 'reportes', label: '15. Reportes & Balance', icon: FileSpreadsheet },
    { id: 'usuarios', label: '16. Usuarios y Permisos', icon: Users },
    { id: 'configuracion', label: '17. Configuración Fábrica', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950/90 border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="font-extrabold text-sm text-white tracking-tight font-outfit">
            PLAST<span className="text-cyan-400">CONTROL</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Control de Materia Prima</p>
        </div>
      </div>

      {/* User Role Card */}
      <div className="p-3 m-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Perfil Activo</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
            currentUser.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' :
            currentUser.role === 'ALMACEN' ? 'bg-cyan-500/20 text-cyan-300' :
            'bg-emerald-500/20 text-emerald-300'
          }`}>
            {currentUser.role}
          </span>
        </div>
        <div className="font-bold text-white text-xs truncate">{currentUser.name}</div>
        <div className="text-[11px] text-slate-400 truncate mb-2">{currentUser.shift}</div>
        
        <button
          onClick={onOpenRoleModal}
          className="w-full py-1 text-[11px] font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-colors border border-cyan-500/20 flex items-center justify-center gap-1"
        >
          <Shield className="w-3 h-3" />
          <span>Cambiar Rol de Usuario</span>
        </button>
      </div>

      {/* Navigation Links (17 Sections from Section 20) */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Módulos del Sistema (Punto 20)
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
        {onLogout && (
          <div className="pt-2">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
        <span>Fábrica de Plásticos v1.0</span>
        <span className="text-emerald-400 font-semibold">Persona B Activo</span>
      </div>
    </aside>
  );
};
