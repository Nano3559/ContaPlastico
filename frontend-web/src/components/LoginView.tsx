import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  ShieldCheck, 
  Layers, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2,
  Building2,
  Scale,
  Factory,
  ClipboardCheck,
  Activity
} from 'lucide-react';
import { authApi } from '../services/api';
import { mockUsers } from '../data/mockData';
import type { UserProfile } from '../types';
import { useToast } from '../context/ToastContext';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  isApiOnline?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, isApiOnline = false }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState<string>('carlos.mendoza@plastcontrol.com');
  const [password, setPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.login(email, password);
      if (res.user) {
        showToast(
          'Sesión Iniciada',
          `Bienvenido ${res.user.name} (${res.user.role}) — ${res.isLive ? 'Conectado a Neon PostgreSQL' : 'Modo Seguro'}`,
          'success'
        );
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMessage('Credenciales inválidas. Verifica tu correo y contraseña.');
      showToast('Error de Acceso', 'Verifica tus credenciales de acceso.', 'critical');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickProfileSelect = (user: UserProfile) => {
    setEmail(user.email);
    setPassword('admin123');
    setIsLoading(true);
    setTimeout(async () => {
      try {
        const res = await authApi.login(user.email, 'admin123');
        if (res.user) {
          showToast(
            'Sesión Rápida Iniciada',
            `Acceso concedido como ${res.user.name} (${res.user.role}).`,
            'success'
          );
          onLoginSuccess(res.user);
        }
      } finally {
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 items-center">
        
        {/* Left Side: Brand Presentation */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-cyan-400 font-semibold shadow-inner">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Sistema Integral de Control de Polímeros v1.0</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-xl shadow-cyan-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Layers className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-outfit tracking-tight">
                PLAST<span className="text-cyan-400">CONTROL</span>
              </h1>
            </div>
            <p className="text-slate-400 text-sm max-w-md mx-auto lg:mx-0">
              Gestión de inventario de resinas vírgenes, pesaje en báscula, recetas BOM de extrusión y balance financiero de mermas.
            </p>
          </div>

          {/* Quick Features Checklist */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-left">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5">
              <Scale className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs text-white block">Báscula & Silos</strong>
                <span className="text-[11px] text-slate-400">Recepción y etiquetas QR</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5">
              <Factory className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs text-white block">Extrusión & BOM</strong>
                <span className="text-[11px] text-slate-400">Recetas y dosificación</span>
              </div>
            </div>
          </div>

          {/* Connection Pill */}
          <div className="pt-2 flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-400">
            <Activity className={`w-3.5 h-3.5 ${isApiOnline ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span>Servidor API: <strong className={isApiOnline ? 'text-emerald-400' : 'text-amber-400'}>{isApiOnline ? 'Neon PostgreSQL Conectado' : 'Modo Autónomo Activo'}</strong></span>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative">
          
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-xl font-bold text-white font-outfit">Iniciar Sesión</h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingresa con tu usuario asignado o selecciona un perfil rápido de demostración.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="usuario@plastcontrol.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña de Acceso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <span>Ingresar a la Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Fast Profile Access */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Perfiles de Prueba Rápidos (1-Clic)
              </span>
              <span className="text-[10px] text-cyan-400 font-semibold">Neon DB Seed</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {mockUsers.map((u) => {
                const roleBadgeColor = 
                  u.role === 'ADMIN' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                  u.role === 'ALMACEN' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' :
                  u.role === 'PRODUCCION' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  'text-amber-400 bg-amber-500/10 border-amber-500/20';

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickProfileSelect(u)}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 transition-all text-left group flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {u.name}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleBadgeColor} inline-block mt-0.5`}>
                        {u.role}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Footer copyright */}
      <footer className="mt-8 text-center text-xs text-slate-500 z-10">
        PlastControl ERP • Control de Materia Prima en Fábricas de Plásticos • Neon PostgreSQL Cloud
      </footer>
    </div>
  );
};
