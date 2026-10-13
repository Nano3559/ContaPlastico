import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  HardHat,
  Glasses,
  CheckCircle2,
  XCircle,
  Scan,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  UserCheck,
  Award,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { SafetyVisionScanner, ReflectiveVestIcon } from './SafetyVisionScanner';
import type { SafetyAuditRecord, SafetyPass, UserProfile, EppDetectionResult } from '../types';

interface SafetyAuditViewProps {
  currentUser: UserProfile;
  activePass: SafetyPass | null;
  auditHistory: SafetyAuditRecord[];
  onPassGranted: (pass: SafetyPass, record: SafetyAuditRecord) => void;
}

export const SafetyAuditView: React.FC<SafetyAuditViewProps> = ({
  currentUser,
  activePass,
  auditHistory,
  onPassGranted
}) => {
  const [activeTab, setActiveTab] = useState<'scanner' | 'history' | 'standards'>('scanner');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLIANT' | 'REJECTED' | 'BYPASS'>('ALL');

  // KPI Calculations
  const totalAudits = auditHistory.length;
  const compliantAudits = auditHistory.filter((a) => a.compliant).length;
  const complianceRate = totalAudits > 0 ? Math.round((compliantAudits / totalAudits) * 100) : 100;
  const rejectedCount = auditHistory.filter((a) => !a.compliant).length;
  const bypassCount = auditHistory.filter((a) => a.bypassUsed).length;

  const filteredHistory = auditHistory.filter((record) => {
    const matchesSearch =
      record.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.station.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.shift.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'COMPLIANT') return matchesSearch && record.compliant && !record.bypassUsed;
    if (filterStatus === 'REJECTED') return matchesSearch && !record.compliant;
    if (filterStatus === 'BYPASS') return matchesSearch && record.bypassUsed;
    return matchesSearch;
  });

  const handleManualScanDone = (result: EppDetectionResult, snapshotUrl?: string) => {
    if (!result.compliant) return;

    const now = new Date();
    const expires = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const pass: SafetyPass = {
      token: `PASS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      approvedAt: now.toLocaleTimeString(),
      expiresAt: expires.toLocaleTimeString(),
      station: 'Kiosco Central de Visión IA',
      details: result
    };

    const auditRecord: SafetyAuditRecord = {
      id: `safe-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      shift: currentUser.shift || 'Turno Activo',
      station: 'Kiosco Central de Visión IA',
      timestamp: now.toLocaleString('es-ES'),
      compliant: true,
      hasHelmet: result.hasHelmet,
      hasVest: result.hasVest,
      hasGlasses: result.hasGlasses,
      score: result.overallScore,
      photoUrl: snapshotUrl,
      bypassUsed: false,
      supervisorNotes: 'Inspección voluntaria aprobada en el módulo central.'
    };

    onPassGranted(pass, auditRecord);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title & Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Inteligencia Artificial Visión</span>
            </span>
            <span className="text-xs text-slate-500">• Punto 18 del Sistema</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-outfit">
            Control de EPP con IA & Gatekeeper de Almacén
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Sistema automatizado de inspección óptica de Equipo de Protección Personal (Casco, Chaleco Reflectivo, Gafas) 
            con bloqueo preventivo de acceso para almacenes, tolvas y báscula bajo estándares ISO 45001 y OSHA 1910.
          </p>
        </div>

        {/* Current Active User Pass Badge */}
        <div className={`p-4 rounded-2xl border flex items-center gap-3 shrink-0 ${
          activePass
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <div className={`p-2.5 rounded-xl ${
            activePass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {activePass ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
              Estado de tu Pase EPP
            </div>
            <div className="text-sm font-black">
              {activePass ? 'VERIFICADO & ACTIVO' : 'PENDIENTE DE ESCANEO'}
            </div>
            <div className="text-[11px] opacity-75">
              {activePass ? `Válido hasta ${activePass.expiresAt}` : 'Acceso a almacén bloqueado'}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Compliance Rate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">Índice de Cumplimiento EPP</span>
            <div className="text-2xl font-black text-emerald-400 font-outfit">{complianceRate}%</div>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Meta de Planta: &gt;95%
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Total Inspections */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">Inspecciones Totales</span>
            <div className="text-2xl font-black text-white font-outfit">{totalAudits}</div>
            <span className="text-[10px] text-slate-500 block mt-1">Turno actual y rotación</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Infracciones Bloqueadas */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">Infracciones Bloqueadas</span>
            <div className="text-2xl font-black text-rose-400 font-outfit">{rejectedCount}</div>
            <span className="text-[10px] text-rose-400/80 block mt-1">Accidentes potenciales evitados</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Desbloqueos de Supervisor */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">Bypass de Supervisor</span>
            <div className="text-2xl font-black text-amber-400 font-outfit">{bypassCount}</div>
            <span className="text-[10px] text-amber-500 block mt-1">Autorizaciones con PIN</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'scanner'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scan className="w-4 h-4" />
          <span>Kiosco de Escaneo en Vivo</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Historial de Auditorías & Accesos ({auditHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('standards')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'standards'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Matriz de Seguridad EPP (Planta)</span>
        </button>
      </div>

      {/* Tab 1: Live Scanner Kiosk */}
      {activeTab === 'scanner' && (
        <div className="space-y-4">
          <SafetyVisionScanner
            currentUser={currentUser}
            stationName="Kiosco de Demostración y Verificación Central"
            onScanComplete={handleManualScanDone}
          />
        </div>
      )}

      {/* Tab 2: Historical Audits Log Table */}
      {activeTab === 'history' && (
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-3xl p-6">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por operario o estación..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === 'ALL'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-850 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Todos ({auditHistory.length})
              </button>
              <button
                onClick={() => setFilterStatus('COMPLIANT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === 'COMPLIANT'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-850 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Aprobados ({compliantAudits})
              </button>
              <button
                onClick={() => setFilterStatus('REJECTED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === 'REJECTED'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-850 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Rechazados ({rejectedCount})
              </button>
              <button
                onClick={() => setFilterStatus('BYPASS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === 'BYPASS'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-850 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Bypass ({bypassCount})
              </button>
            </div>
          </div>

          {/* Audit Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Operario</th>
                  <th className="py-3 px-4">Estación / Turno</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4 text-center">Casco</th>
                  <th className="py-3 px-4 text-center">Chaleco</th>
                  <th className="py-3 px-4 text-center">Gafas</th>
                  <th className="py-3 px-4 text-center">Puntaje</th>
                  <th className="py-3 px-4 text-center">Veredicto</th>
                  <th className="py-3 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                    
                    {/* Operario info */}
                    <td className="py-3 px-4 flex items-center gap-2.5">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.userName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 text-xs shrink-0">
                          {item.userName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white text-xs">{item.userName}</div>
                        <div className="text-[10px] text-slate-400">{item.userRole}</div>
                      </div>
                    </td>

                    {/* Estación */}
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-semibold">{item.station}</div>
                      <div className="text-[10px] text-slate-500">{item.shift}</div>
                    </td>

                    {/* Fecha */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {item.timestamp}
                    </td>

                    {/* Casco */}
                    <td className="py-3 px-4 text-center">
                      {item.hasHelmet ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                      )}
                    </td>

                    {/* Chaleco */}
                    <td className="py-3 px-4 text-center">
                      {item.hasVest ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                      )}
                    </td>

                    {/* Gafas */}
                    <td className="py-3 px-4 text-center">
                      {item.hasGlasses ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                      )}
                    </td>

                    {/* Puntaje */}
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span className={item.score >= 85 ? 'text-emerald-400' : 'text-rose-400'}>
                        {item.score}%
                      </span>
                    </td>

                    {/* Veredicto */}
                    <td className="py-3 px-4 text-center">
                      {item.compliant ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {item.bypassUsed ? 'BYPASS OK' : 'APROBADO'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          DENEGADO
                        </span>
                      )}
                    </td>

                    {/* Observaciones */}
                    <td className="py-3 px-4 text-[11px] text-slate-400 max-w-xs truncate" title={item.supervisorNotes}>
                      {item.supervisorNotes || 'Sin observaciones adicionales.'}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>

            {filteredHistory.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs">
                No se encontraron auditorías con los filtros seleccionados.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab 3: Industrial Safety Standards Reference */}
      {activeTab === 'standards' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2">
              <HardHat className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white font-outfit">Casco de Seguridad Industrial</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>Norma ANSI Z89.1 Clase E/G:</strong> Obligatorio en el patio de descarga, silos de almacenamiento y báscula. 
              Protege contra la caída accidental de bolsones Big-Bag (1,000 kg), desacople de tuberías de transporte neumático y herramientas de mantenimiento.
            </p>
            <div className="text-[11px] text-cyan-400 font-semibold">Zona: Almacén, Silos y Extrusión</div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
              <ReflectiveVestIcon className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white font-outfit">Chaleco Reflectivo Clase 2</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>Norma ANSI/ISEA 107:</strong> Requerido por tránsito continuo de montacargas de 3 toneladas y camiones cisterna a granel. 
              El tejido fluorescente con bandas retrorreflectivas garantiza visibilidad a más de 50 metros tanto en turnos diurnos como nocturnos.
            </p>
            <div className="text-[11px] text-amber-400 font-semibold">Zona: Patio Báscula y Pasillos de Carga</div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
              <Glasses className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white font-outfit">Gafas de Policarbonato</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>Norma ANSI Z87.1:</strong> Indispensables en la apertura de sacos de resina (HDPE/PP), dosificación de masterbatch y toma de muestras en tolvas. 
              Previene lesiones oculares por proyección violenta de gránulos de plástico y polvo químico irritante.
            </p>
            <div className="text-[11px] text-emerald-400 font-semibold">Zona: Dosificación, Tolvas y Molienda</div>
          </div>

        </div>
      )}

    </div>
  );
};
