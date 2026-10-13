import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Camera,
  Smartphone,
  Upload,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Zap,
  Activity,
  Server,
  Eye,
  HardHat,
  Glasses,
  Shirt,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  Sliders,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  aiEppService,
  type AiEppStatusResponse,
  type AiEppPhotoResponse,
  type AccessAuditLogItem
} from '../services/aiEppService';
import { useToast } from '../context/ToastContext';

export const VisionEppView: React.FC = () => {
  const { showToast } = useToast();

  // Estados de conexión con el Servidor IA
  const [isServerOnline, setIsServerOnline] = useState<boolean>(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(true);
  const [aiHost, setAiHost] = useState<string>(() => aiEppService.getActiveHost());
  const [showConfigHost, setShowConfigHost] = useState<boolean>(false);

  // Modos de Operación: 'live' (Streaming en vivo) | 'photo' (Análisis de foto) | 'audit' (Bitácora)
  const [activeTab, setActiveTab] = useState<'live' | 'photo' | 'audit'>('live');

  // Fuente de Captura para Streaming: 'laptop' | 'droidcam'
  const [streamSource, setStreamSource] = useState<'laptop' | 'droidcam'>('laptop');
  const [droidIp, setDroidIp] = useState<string>('192.168.0.24');
  const [droidPort, setDroidPort] = useState<string>('4747');

  // Estado del Stream
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamFeedUrl, setStreamFeedUrl] = useState<string>('');
  const [isStartingStream, setIsStartingStream] = useState<boolean>(false);

  // Telemetría en Vivo
  const [telemetry, setTelemetry] = useState<AiEppStatusResponse | null>(null);

  // Análisis de Fotografía
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState<boolean>(false);
  const [photoResult, setPhotoResult] = useState<AiEppPhotoResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sistema de Audio Alertas
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const lastSoundVerdictRef = useRef<string>('pending');
  const audioContextRef = useRef<AudioContext | null>(null);

  // Bitácora de Molinete
  const [auditLog, setAuditLog] = useState<AccessAuditLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('plastcontrol_epp_audit');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sintetizador Web Audio API (Chime de Pase y Alarma de Infracción)
  const playSoundAlert = useCallback((type: 'approved' | 'rejected') => {
    if (!isAudioEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      if (type === 'approved') {
        // Doble Chime Armónico Ascendente (C5 -> E5 -> G5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.24); // G5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Tono Seco de Advertencia / Infracción (Sawtooth descendente)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.setValueAtTime(190, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (err) {
      console.warn('Audio API no soportado o bloqueado:', err);
    }
  }, [isAudioEnabled]);

  // Registro de Auditoría
  const addAuditRecord = useCallback((
    source: 'Webcam Laptop' | 'DroidCam WiFi' | 'Foto Estática',
    result: 'approved' | 'rejected' | 'pending',
    gear: { helmet: boolean; goggles: boolean; vest: boolean },
    details: string,
    inf_ms: number
  ) => {
    if (result === 'pending') return;
    const newRecord: AccessAuditLogItem = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      source,
      result,
      gear,
      details,
      inf_ms
    };
    setAuditLog(prev => {
      const updated = [newRecord, ...prev.slice(0, 49)];
      try {
        localStorage.setItem('plastcontrol_epp_audit', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  }, []);

  // Verificar conexión con el backend IA
  const checkHealth = useCallback(async () => {
    setIsCheckingConnection(true);
    try {
      const status = await aiEppService.getStatus();
      setIsServerOnline(true);
      setTelemetry(status);
      if (status.running) {
        setIsStreaming(true);
        setStreamFeedUrl(aiEppService.getVideoFeedUrl());
      }
    } catch {
      setIsServerOnline(false);
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  // Polling de telemetría en vivo
  useEffect(() => {
    checkHealth();
    const interval = setInterval(async () => {
      try {
        const data = await aiEppService.getStatus();
        setIsServerOnline(true);
        setTelemetry(data);
        setIsStreaming(data.running);

        // Sonido y Auditoría cuando cambia veredicto en Streaming
        if (data.running && data.has_worker) {
          if (data.result !== lastSoundVerdictRef.current) {
            if (data.result === 'approved') {
              playSoundAlert('approved');
              addAuditRecord(
                data.source === 'droidcam' ? 'DroidCam WiFi' : 'Webcam Laptop',
                'approved',
                {
                  helmet: data.epp.helmet?.status === 'detected',
                  goggles: data.epp.goggles?.status === 'detected',
                  vest: data.epp.vest?.status === 'detected'
                },
                'Cumple Casco, Lentes y Chaleco reglamentarios',
                data.inf_ms
              );
            } else if (data.result === 'rejected') {
              playSoundAlert('rejected');
              addAuditRecord(
                data.source === 'droidcam' ? 'DroidCam WiFi' : 'Webcam Laptop',
                'rejected',
                {
                  helmet: data.epp.helmet?.status === 'detected',
                  goggles: data.epp.goggles?.status === 'detected',
                  vest: data.epp.vest?.status === 'detected'
                },
                `Falta portar: ${data.missing.join(', ')}`,
                data.inf_ms
              );
            }
            lastSoundVerdictRef.current = data.result;
          }
        } else {
          lastSoundVerdictRef.current = 'pending';
        }
      } catch {
        // Si falla repetidamente
      }
    }, isStreaming ? 800 : 4000);

    return () => clearInterval(interval);
  }, [checkHealth, isStreaming, playSoundAlert, addAuditRecord]);

  // Manejo de inicio de Streaming
  const handleStartStream = async () => {
    setIsStartingStream(true);
    try {
      const res = await aiEppService.startStream(streamSource, droidIp, droidPort);
      if (res.ok) {
        setIsStreaming(true);
        setStreamFeedUrl(aiEppService.getVideoFeedUrl());
        showToast(
          'Cámara Iniciada',
          `Transmisión en vivo activada desde ${streamSource === 'laptop' ? 'Webcam Local' : 'DroidCam (' + droidIp + ')'}.`,
          'success'
        );
      } else {
        showToast('Error de Cámara', res.msg || 'No se pudo iniciar la cámara seleccionada.', 'error');
      }
    } catch (err: unknown) {
      showToast('Error de Conexión', (err as Error)?.message || 'No se pudo conectar con el servidor IA.', 'error');
    } finally {
      setIsStartingStream(false);
    }
  };

  // Manejo de detención de Streaming
  const handleStopStream = async () => {
    setIsStreaming(false);
    setStreamFeedUrl('');
    try {
      await aiEppService.stopStream();
      showToast('Cámara Detenida', 'La transmisión de video se ha cerrado con éxito.', 'info');
    } catch (err: unknown) {
      console.warn('Advertencia al detener stream:', err);
      showToast('Cámara Detenida', 'La transmisión de video se ha cerrado.', 'info');
    }
  };

  // Carga y Análisis de Foto Estática
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedPhoto(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setPhotoResult(null);
  };

  const handleAnalyzePhoto = async () => {
    if (!selectedPhoto) return;
    setIsAnalyzingPhoto(true);
    try {
      const res = await aiEppService.analyzePhoto(selectedPhoto);
      setPhotoResult(res);
      if (res.result === 'approved') {
        playSoundAlert('approved');
        showToast('Acceso Autorizado', 'El operario porta todos los EPP reglamentarios.', 'success');
      } else if (res.result === 'rejected') {
        playSoundAlert('rejected');
        showToast('Acceso Denegado', `Falta portar: ${res.missing.join(', ')}`, 'warning');
      }

      addAuditRecord(
        'Foto Estática',
        res.result,
        {
          helmet: res.epp.helmet?.status === 'detected',
          goggles: res.epp.goggles?.status === 'detected',
          vest: res.epp.vest?.status === 'detected'
        },
        res.access_msg,
        res.inf_ms
      );
    } catch (err: unknown) {
      showToast('Error de Análisis', (err as Error)?.message || 'Error al analizar la imagen.', 'error');
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // Guardar URL de Host personalizada
  const handleSaveHost = () => {
    aiEppService.setCustomHost(aiHost);
    setShowConfigHost(false);
    checkHealth();
    showToast('Configuración Actualizada', `Host de IA establecido en ${aiHost}`, 'info');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Módulo IA de Seguridad Industrial · Detección de EPP
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                YOLOv8 fine-tuned
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspección de Casco ANSI Z89.1, Lentes ANSI Z87.1 y Chaleco EN ISO 20471 con Control de Acceso Automatizado
            </p>
          </div>
        </div>

        {/* Acciones de Cabecera: Estado Servidor + Audio + Config */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {/* Badge Estado Servidor IA */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isServerOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isServerOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
            <span>{isServerOnline ? 'Servidor IA :5000 Online' : 'Servidor IA Desconectado'}</span>
            <button
              onClick={checkHealth}
              disabled={isCheckingConnection}
              title="Reintentar conexión"
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Botón Audio Alertas */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            title={isAudioEnabled ? 'Silenciar alertas de audio' : 'Activar alertas de audio'}
            className={`p-2 rounded-xl border transition-all ${
              isAudioEnabled
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Configuración de Host / Puerto */}
          <button
            onClick={() => setShowConfigHost(!showConfigHost)}
            title="Configurar dirección del Servidor de IA"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PANEL DE CONFIGURACIÓN DEL HOST (Colapsable) */}
      {showConfigHost && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <Server className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="flex-1 w-full text-xs">
            <label className="font-bold text-slate-300 block mb-1">
              Dirección Base del Motor de IA (Flask / Ultralytics):
            </label>
            <input
              type="text"
              value={aiHost}
              onChange={(e) => setAiHost(e.target.value)}
              placeholder="http://127.0.0.1:5000 o /ai-service"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={handleSaveHost}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Guardar & Probar</span>
          </button>
        </div>
      )}

      {/* AVISO DE DIAGNÓSTICO SI EL SERVIDOR ESTÁ OFFLINE */}
      {!isServerOnline && !isCheckingConnection && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-amber-300">
                El Servidor de Inteligencia Artificial (Puerto 5000) no responde
              </h3>
              <p className="text-xs leading-relaxed text-amber-200/90">
                Para utilizar la detección con aceleración GPU y la cámara en vivo, ejecuta el script del módulo:
              </p>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs font-mono text-cyan-300 space-y-1">
                <p>1. Abre una terminal o ejecuta el archivo por lotes:</p>
                <p className="text-white font-bold select-all">
                  C:\Users\IFAM_\Desktop\ModuloIA_Seguridad\run_app.bat
                </p>
                <p className="text-slate-400">o mediante Python directo:</p>
                <p className="text-white font-bold select-all">
                  python C:\Users\IFAM_\Desktop\ModuloIA_Seguridad\epp_app.py
                </p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={checkHealth}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar Conexión</span>
                </button>
                <span className="text-[11px] text-amber-300/70">
                  Modelo entrenado: <strong className="text-white">best_epp.pt</strong> (GPU NVIDIA RTX 4060)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'live'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Transmisión en Vivo (30 FPS)</span>
          {isStreaming && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('photo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'photo'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Análisis de Fotografías</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Bitácora de Molinete ({auditLog.length})</span>
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑA: TRANSMISIÓN EN VIVO */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUMNA IZQUIERDA: VISOR DE VIDEO & CONTROLES (7 COLUMNAS) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Tarjeta de Controles de Cámara */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Fuente de Video:</span>
                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setStreamSource('laptop')}
                      disabled={isStreaming}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        streamSource === 'laptop'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Webcam Laptop</span>
                    </button>
                    <button
                      onClick={() => setStreamSource('droidcam')}
                      disabled={isStreaming}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        streamSource === 'droidcam'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>DroidCam WiFi</span>
                    </button>
                  </div>
                </div>

                {/* Botón de Inicio / Detención de Transmisión */}
                <div className="flex items-center gap-2">
                  {!isStreaming ? (
                    <button
                      onClick={handleStartStream}
                      disabled={!isServerOnline || isStartingStream}
                      className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isStartingStream ? 'Iniciando Cámara...' : 'Iniciar Transmisión'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopStream}
                      className="w-full sm:w-auto px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Detener Cámara</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Parámetros para DroidCam si está seleccionado */}
              {streamSource === 'droidcam' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">IP Celular:</span>
                    <input
                      type="text"
                      value={droidIp}
                      onChange={(e) => setDroidIp(e.target.value)}
                      disabled={isStreaming}
                      placeholder="192.168.0.24"
                      className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Puerto:</span>
                    <input
                      type="text"
                      value={droidPort}
                      onChange={(e) => setDroidPort(e.target.value)}
                      disabled={isStreaming}
                      placeholder="4747"
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    (Laptop y Teléfono deben compartir la misma red WiFi)
                  </span>
                </div>
              )}
            </div>

            {/* CONTENEDOR DE VIDEO STREAM */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center">
              {isStreaming && streamFeedUrl ? (
                <>
                  <img
                    src={streamFeedUrl}
                    alt="Stream IA en Vivo"
                    className="w-full h-full object-contain"
                    onError={() => {
                      // Manejar corte de stream
                    }}
                  />
                  {/* HUD Overlay en Vivo */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-white tracking-wider">EN VIVO · 30 FPS</span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-cyan-300 font-mono">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <span>RTX 4060 · {telemetry?.inf_ms || 14} ms</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-300">Cámara en Reposo</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Selecciona la cámara de tu laptop o tu celular con DroidCam y haz clic en &ldquo;Iniciar Transmisión&rdquo; para activar la inspección en tiempo real.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* MÉTRICAS DE TELEMETRÍA INFERIOR */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">FPS Cámara</span>
                <span className="text-lg font-black text-white font-mono">{telemetry?.fps_cam ?? 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">FPS IA Inferencia</span>
                <span className="text-lg font-black text-cyan-400 font-mono">{telemetry?.fps_infer ?? 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latencia GPU</span>
                <span className="text-lg font-black text-emerald-400 font-mono">{telemetry?.inf_ms ? `${telemetry.inf_ms} ms` : '--'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detecciones</span>
                <span className="text-lg font-black text-purple-400 font-mono">{telemetry?.det_count ?? 0}</span>
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA: VEREDICTO DE CONTROL DE ACCESO & EPP CARDS (5 COLUMNAS) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* TARJETA DE VEREDICTO DEL MOLINETE (GRAN IMPACTO VISUAL) */}
            <div
              className={`p-6 rounded-2xl border transition-all duration-300 shadow-2xl ${
                telemetry?.result === 'approved'
                  ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 border-emerald-500/50 shadow-emerald-500/10'
                  : telemetry?.result === 'rejected'
                  ? 'bg-gradient-to-br from-rose-950/70 via-slate-900 to-slate-950 border-rose-500/50 shadow-rose-500/10'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Control de Molinete / Acceso
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    telemetry?.gate_status === 'open'
                      ? 'bg-emerald-500 text-slate-950'
                      : telemetry?.gate_status === 'locked'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {telemetry?.gate_status === 'open'
                    ? 'Molinete Habilitado'
                    : telemetry?.gate_status === 'locked'
                    ? 'Molinete Bloqueado'
                    : 'En Espera'}
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    telemetry?.result === 'approved'
                      ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                      : telemetry?.result === 'rejected'
                      ? 'bg-rose-500 text-white shadow-rose-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {telemetry?.result === 'approved' ? (
                    <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                  ) : telemetry?.result === 'rejected' ? (
                    <XCircle className="w-8 h-8 stroke-[2.5]" />
                  ) : (
                    <ShieldCheck className="w-8 h-8 opacity-60" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3
                    className={`text-lg font-black tracking-tight ${
                      telemetry?.result === 'approved'
                        ? 'text-emerald-400'
                        : telemetry?.result === 'rejected'
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {telemetry?.result === 'approved'
                      ? 'ACCESO AUTORIZADO'
                      : telemetry?.result === 'rejected'
                      ? 'ACCESO DENEGADO'
                      : 'ESPERANDO TRABAJADOR'}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {telemetry?.access_msg || 'Posicione al operario frente a la cámara para verificar su equipo de protección.'}
                  </p>
                </div>
              </div>
            </div>

            {/* MONITOREO DETALLADO DE LOS 3 ELEMENTOS DE EPP */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Inspección Reglamentaria de EPP
                </h4>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {telemetry?.model || 'best_epp.pt'}
                </span>
              </div>

              {/* 1. Casco de Seguridad */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white">Casco de Seguridad</div>
                      <div className="text-[10px] text-slate-500">Norma ANSI Z89.1 · Cabeza</div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                      telemetry?.epp?.helmet?.status === 'detected'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : telemetry?.epp?.helmet?.status === 'missing'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {telemetry?.epp?.helmet?.status === 'detected'
                      ? 'DETECTADO'
                      : telemetry?.epp?.helmet?.status === 'missing'
                      ? 'INFRACCIÓN'
                      : 'PENDIENTE'}
                  </span>
                </div>
                {/* Barra de Confianza */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      telemetry?.epp?.helmet?.status === 'detected' ? 'bg-emerald-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.round((telemetry?.epp?.helmet?.conf || 0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* 2. Lentes de Protección */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Glasses className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white">Lentes de Protección</div>
                      <div className="text-[10px] text-slate-500">Norma ANSI Z87.1 · Ojos</div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                      telemetry?.epp?.goggles?.status === 'detected'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : telemetry?.epp?.goggles?.status === 'missing'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {telemetry?.epp?.goggles?.status === 'detected'
                      ? 'DETECTADO'
                      : telemetry?.epp?.goggles?.status === 'missing'
                      ? 'INFRACCIÓN'
                      : 'PENDIENTE'}
                  </span>
                </div>
                {/* Barra de Confianza */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      telemetry?.epp?.goggles?.status === 'detected' ? 'bg-emerald-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.round((telemetry?.epp?.goggles?.conf || 0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* 3. Chaleco Reflectivo */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white">Chaleco Reflectivo</div>
                      <div className="text-[10px] text-slate-500">Norma EN ISO 20471 · Torso</div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                      telemetry?.epp?.vest?.status === 'detected'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : telemetry?.epp?.vest?.status === 'missing'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {telemetry?.epp?.vest?.status === 'detected'
                      ? 'DETECTADO'
                      : telemetry?.epp?.vest?.status === 'missing'
                      ? 'INFRACCIÓN'
                      : 'PENDIENTE'}
                  </span>
                </div>
                {/* Barra de Confianza */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      telemetry?.epp?.vest?.status === 'detected' ? 'bg-emerald-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.round((telemetry?.epp?.vest?.conf || 0) * 100)}%` }}
                  />
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: ANÁLISIS DE FOTOGRAFÍAS */}
      {activeTab === 'photo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CARGADOR DE FOTO (6 COLUMNAS) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold text-white">Subir Fotografía del Trabajador</h3>
              <p className="text-xs text-slate-400">
                Selecciona una foto tomada en el acceso de planta para verificar el cumplimiento antes de ingresar.
              </p>

              {/* Zona de Drop / Carga */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-950/60 hover:bg-slate-950 flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200">
                    Haz clic para seleccionar o arrastra una imagen aquí
                  </p>
                  <p className="text-[11px] text-slate-500">Formatos soportados: JPG, PNG, WEBP (hasta 20 MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Previsualización seleccionada */}
              {photoPreview && !photoResult?.image && (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                    <img src={photoPreview} alt="Foto seleccionada" className="w-full h-full object-contain" />
                  </div>
                  <button
                    onClick={handleAnalyzePhoto}
                    disabled={isAnalyzingPhoto || !isServerOnline}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{isAnalyzingPhoto ? 'Analizando en GPU...' : 'Procesar e Inspeccionar con IA'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RESULTADO ANOTADO POR LA IA (6 COLUMNAS) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white">Resultado de Inferencia</h3>
                {photoResult && (
                  <span className="text-[11px] font-mono text-cyan-400">
                    Latencia: {photoResult.inf_ms.toFixed(1)} ms
                  </span>
                )}
              </div>

              {photoResult?.image ? (
                <div className="space-y-4">
                  {/* Imagen anotada generada por epp_app.py */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
                    <img
                      src={photoResult.image}
                      alt="Resultado Anotado IA"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Veredicto de la foto */}
                  <div
                    className={`p-4 rounded-xl border ${
                      photoResult.result === 'approved'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : photoResult.result === 'rejected'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-sm mb-1">
                      {photoResult.result === 'approved' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                      <span>
                        {photoResult.result === 'approved'
                          ? 'ACCESO AUTORIZADO A PLANTA'
                          : 'ACCESO DENEGADO POR INFRACCIÓN'}
                      </span>
                    </div>
                    <p className="text-xs">{photoResult.access_msg}</p>
                  </div>

                  {/* Desglose de EPP detectado en la foto */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Casco</span>
                      <strong className={photoResult.epp.helmet?.status === 'detected' ? 'text-emerald-400' : 'text-rose-400'}>
                        {photoResult.epp.helmet?.status === 'detected' ? 'Presente' : 'Ausente'}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Lentes</span>
                      <strong className={photoResult.epp.goggles?.status === 'detected' ? 'text-emerald-400' : 'text-rose-400'}>
                        {photoResult.epp.goggles?.status === 'detected' ? 'Presente' : 'Ausente'}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Chaleco</span>
                      <strong className={photoResult.epp.vest?.status === 'detected' ? 'text-emerald-400' : 'text-rose-400'}>
                        {photoResult.epp.vest?.status === 'detected' ? 'Presente' : 'Ausente'}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Eye className="w-8 h-8 opacity-40 mb-2" />
                  <p className="text-xs">Carga una fotografía a la izquierda y presiona &ldquo;Procesar&rdquo; para ver el encuadre anatómico de la IA.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: BITÁCORA DE CONTROL DE ACCESO */}
      {activeTab === 'audit' && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-white">Registro de Auditoría de Acceso en Vivo</h3>
              <p className="text-xs text-slate-400">
                Historial de trabajadores inspeccionados en torniquete y accesos a la planta de plásticos.
              </p>
            </div>
            {auditLog.length > 0 && (
              <button
                onClick={() => {
                  setAuditLog([]);
                  localStorage.removeItem('plastcontrol_epp_audit');
                  showToast('Bitácora Limpiada', 'Se borraron los registros locales de auditoría.', 'info');
                }}
                className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar Historial</span>
              </button>
            )}
          </div>

          {auditLog.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4">Fuente</th>
                    <th className="py-3 px-4">Veredicto</th>
                    <th className="py-3 px-4">Casco</th>
                    <th className="py-3 px-4">Lentes</th>
                    <th className="py-3 px-4">Chaleco</th>
                    <th className="py-3 px-4">Detalle / Infracción</th>
                    <th className="py-3 px-4">Latencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                  {auditLog.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">{log.timestamp}</td>
                      <td className="py-3 px-4 text-slate-400">{log.source}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            log.result === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {log.result === 'approved' ? 'AUTORIZADO' : 'DENEGADO'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {log.gear.helmet ? (
                          <span className="text-emerald-400 font-bold">✓ Sí</span>
                        ) : (
                          <span className="text-rose-400 font-bold">✗ Falta</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {log.gear.goggles ? (
                          <span className="text-emerald-400 font-bold">✓ Sí</span>
                        ) : (
                          <span className="text-rose-400 font-bold">✗ Falta</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {log.gear.vest ? (
                          <span className="text-emerald-400 font-bold">✓ Sí</span>
                        ) : (
                          <span className="text-rose-400 font-bold">✗ Falta</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{log.details}</td>
                      <td className="py-3 px-4 font-mono text-cyan-400 text-[11px]">{log.inf_ms.toFixed(1)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              No hay registros de accesos aún. Inicia la cámara o sube fotos para comenzar a auditar ingresos.
            </div>
          )}
        </div>
      )}

    </div>
  );
};
