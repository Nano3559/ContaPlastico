import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  X,
  AlertOctagon,
  Sparkles
} from 'lucide-react';
import { SafetyVisionScanner } from './SafetyVisionScanner';
import type { EppDetectionResult, SafetyAuditRecord, SafetyPass, UserProfile } from '../types';

interface SafetyAccessModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  blockedSectionName: string;
  onSuccess: (pass: SafetyPass, auditRecord: SafetyAuditRecord) => void;
  onClose?: () => void;
}

export const SafetyAccessModal: React.FC<SafetyAccessModalProps> = ({
  isOpen,
  currentUser,
  blockedSectionName,
  onSuccess,
  onClose
}) => {
  const [showSupervisorBypass, setShowSupervisorBypass] = useState<boolean>(false);
  const [bypassPin, setBypassPin] = useState<string>('');
  const [bypassNotes, setBypassNotes] = useState<string>('');
  const [bypassError, setBypassError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScanComplete = (result: EppDetectionResult, snapshotUrl?: string) => {
    if (!result.compliant) return;

    const now = new Date();
    const expires = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours validity

    const pass: SafetyPass = {
      token: `PASS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      approvedAt: now.toLocaleTimeString(),
      expiresAt: expires.toLocaleTimeString(),
      station: 'Terminal Kiosco Entrada Almacén',
      details: result
    };

    const auditRecord: SafetyAuditRecord = {
      id: `safe-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      shift: currentUser.shift || 'Turno Activo',
      station: 'Terminal Kiosco Entrada Almacén',
      timestamp: now.toLocaleString('es-ES'),
      compliant: true,
      hasHelmet: result.hasHelmet,
      hasVest: result.hasVest,
      hasGlasses: result.hasGlasses,
      score: result.overallScore,
      photoUrl: snapshotUrl,
      bypassUsed: false,
      supervisorNotes: 'Acceso autorizado automáticamente por IA Visión EPP.'
    };

    onSuccess(pass, auditRecord);
  };

  const handleSupervisorUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setBypassError(null);

    // Standard industrial demo PIN: 1234 or 9900
    if (bypassPin.trim() !== '1234' && bypassPin.trim() !== '9900') {
      setBypassError('PIN de Supervisor incorrecto. Solicita la clave a Jefatura de Planta.');
      return;
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours emergency pass

    const pass: SafetyPass = {
      token: `PASS-BYPASS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      approvedAt: now.toLocaleTimeString(),
      expiresAt: expires.toLocaleTimeString(),
      station: 'Desbloqueo de Emergencia Supervisor',
      details: {
        hasHelmet: true,
        helmetConfidence: 100,
        hasVest: true,
        vestConfidence: 100,
        hasGlasses: true,
        glassesConfidence: 100,
        overallScore: 100,
        compliant: true,
        detectedAt: now.toLocaleString(),
        rejectionReasons: []
      }
    };

    const auditRecord: SafetyAuditRecord = {
      id: `safe-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      shift: currentUser.shift || 'Turno Activo',
      station: 'Kiosco Báscula / Almacén',
      timestamp: now.toLocaleString('es-ES'),
      compliant: true,
      hasHelmet: true,
      hasVest: true,
      hasGlasses: true,
      score: 100,
      bypassUsed: true,
      supervisorNotes: `AUTORIZACIÓN MANUAL POR SUPERVISOR. Motivo: ${bypassNotes || 'Falla momentánea de cámara / Inspección presencial verificada.'}`
    };

    onSuccess(pass, auditRecord);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn font-sans">
      
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Warning Gatekeeper Banner */}
        <div className="bg-gradient-to-r from-rose-950/90 via-slate-900 to-amber-950/80 px-6 py-4 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Lock className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-rose-300 uppercase tracking-wider font-outfit">
                  Área Restringida: Control de Acceso EPP
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Bloqueo Activo
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Para ingresar a <strong className="text-white underline">{blockedSectionName}</strong> se requiere escaneo de vestimenta reglamentaria (Norma ISO 45001).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSupervisorBypass(!showSupervisorBypass)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Autorización de Emergencia por Supervisor"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Bypass Supervisor</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Cerrar y volver al Dashboard"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Supervisor Emergency PIN Bypass Drawer */}
        {showSupervisorBypass && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 p-4 px-6">
            <form onSubmit={handleSupervisorUnlock} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold shrink-0">
                <AlertOctagon className="w-4 h-4 text-amber-400" />
                <span>PIN Supervisor (Demo: 1234):</span>
              </div>
              
              <input
                type="password"
                maxLength={6}
                value={bypassPin}
                onChange={(e) => setBypassPin(e.target.value)}
                placeholder="Ingresa PIN"
                className="w-32 px-3 py-1.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />

              <input
                type="text"
                value={bypassNotes}
                onChange={(e) => setBypassNotes(e.target.value)}
                placeholder="Observación obligatoria (ej: Inspección física OK)"
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />

              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Autorizar Paso Manual</span>
              </button>
            </form>

            {bypassError && (
              <p className="text-[11px] text-rose-400 mt-2 font-medium">{bypassError}</p>
            )}
          </div>
        )}

        {/* Embedded Scanner View */}
        <div className="p-2 sm:p-4">
          <SafetyVisionScanner
            currentUser={currentUser}
            stationName={`Kiosco de Acceso a ${blockedSectionName}`}
            onScanComplete={handleScanComplete}
            onCancel={onClose}
          />
        </div>

      </div>

    </div>
  );
};
