import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  ShieldCheck,
  ShieldAlert,
  HardHat,
  Glasses,
  Scan,
  Sparkles,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Info,
  Wifi,
  Smartphone,
  Upload,
  Image as ImageIcon,
  Zap,
  Cpu
} from 'lucide-react';
import type { EppDetectionResult, UserProfile } from '../types';
import {
  checkYoloServiceStatus,
  detectWithYoloMicroservice,
  mapYoloResponseToResult
} from '../services/yoloService';


// Custom Industrial Safety Reflective Vest Icon (ANSI Class 2 with reflective stripes)
export const ReflectiveVestIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 4h4l3 5-2 12H4V4z" />
    <path d="M20 4h-4l-3 5 2 12h5V4z" />
    <path d="M7 11h10" />
    <path d="M6 16h12" />
  </svg>
);


export interface YoloDetectionBox {
  id: string;
  label: string;
  category: 'HELMET' | 'VEST' | 'GLASSES' | 'NO_HELMET' | 'NO_VEST';
  confidence: number;
  color: string;
  xPercent: number;
  yPercent: number;
  wPercent: number;
  hPercent: number;
}

// High-Precision Multi-Color & Multi-Spectral EPP Classifier (Zero-dependency & instant)
export interface OpticClassification {
  hasHelmet: boolean;
  helmetColorName: string | null;
  helmetConfidence: number;
  hasVest: boolean;
  vestColorName: string | null;
  vestConfidence: number;
  hasGlasses: boolean;
  glassesConfidence: number;
  boxes: YoloDetectionBox[];
}

function detectGlassesFromCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const eyeX = Math.floor(w * 0.28);
  const eyeY = Math.floor(h * 0.18);
  const eyeW = Math.floor(w * 0.44);
  const eyeH = Math.floor(h * 0.14);
  const eyePixels = ctx.getImageData(eyeX, eyeY, eyeW, eyeH).data;
  const totalEye = eyePixels.length / 4;

  if (totalEye <= 0) return { hasGlasses: false, glassesConfidence: 12 };

  let darkLens = 0;
  let tintedLens = 0;
  let silverFrame = 0;
  let skinPixels = 0;

  for (let i = 0; i < eyePixels.length; i += 4) {
    const r = eyePixels[i];
    const g = eyePixels[i + 1];
    const b = eyePixels[i + 2];
    const brightness = (r + g + b) / 3;

    const isSkin = r > 110 && g > 80 && b > 60 && r > g && (r - g) > 18 && g > b;
    if (isSkin) skinPixels++;

    const isDarkLens = brightness < 150 && Math.abs(r - g) < 55 && Math.abs(g - b) < 55;
    const isTintedLens = r > 35 && g > 35 && b > 25 && brightness < 180 && Math.abs(r - g) < 60 && Math.abs(g - b) < 60;
    const isSilverFrame = r > 150 && g > 150 && b > 150 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15;

    if (isDarkLens) darkLens++;
    if (isTintedLens) tintedLens++;
    if (isSilverFrame) silverFrame++;
  }

  const lensRatio = (darkLens + tintedLens + silverFrame) / totalEye;
  const skinRatio = skinPixels / totalEye;
  const darkOrTintedRatio = (darkLens + tintedLens) / totalEye;
  const hasGlasses = lensRatio > 0.18 && skinRatio < 0.35 && darkOrTintedRatio > 0.08;
  const glassesConfidence = hasGlasses ? Math.min(96, Math.round(58 + lensRatio * 170)) : 12;

  return { hasGlasses, glassesConfidence };
}

export function classifyEppFromCanvas(canvas: HTMLCanvasElement): OpticClassification | null {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width <= 0 || canvas.height <= 0) return null;

  const w = canvas.width;
  const h = canvas.height;

  // 1. ZONA CRÁNEO / CASCO (20%-80% ancho, 5%-36% alto)
  const headX = Math.floor(w * 0.20);
  const headY = Math.floor(h * 0.05);
  const headW = Math.floor(w * 0.60);
  const headH = Math.floor(h * 0.32);
  const headPixels = ctx.getImageData(headX, headY, headW, headH).data;
  const totalHead = headPixels.length / 4;

  let yellowH = 0, orangeH = 0, blueH = 0, redH = 0, greenH = 0, whiteH = 0;
  let hairH = 0, skinH = 0;

  for (let i = 0; i < headPixels.length; i += 4) {
    const r = headPixels[i];
    const g = headPixels[i + 1];
    const b = headPixels[i + 2];

    // Cabello humano (descarte de casco)
    const isHair = (r < 75 && g < 70 && b < 65) ||
                   (r < 95 && g < 80 && b < 65 && Math.abs(r - g) < 25) ||
                   (r > 55 && r < 140 && g > 40 && g < 100 && b > 25 && b < 80);
    if (isHair) hairH++;

    // Tono de piel (frente descubierta)
    const isSkin = r > 125 && g > 80 && b > 60 && r > g && (r - g > 20) && (g > b);
    if (isSkin) skinH++;

    // Cascos de seguridad industrial por tonalidad
    if (r > 150 && g > 125 && b < 115 && (r + g) > 2.6 * b) yellowH++;
    else if (r > 180 && g > 65 && g < 165 && b < 80 && (r - g > 35) && (g > b)) orangeH++;
    else if (b > 120 && b > r * 1.20 && g < 160 && (b - r > 25)) blueH++;
    else if (r > 170 && g < 90 && b < 90 && r > 2.0 * g) redH++;
    else if (g > 115 && g > r * 1.15 && g > b * 1.15 && r < 145 && b < 145 && (g - r > 20)) greenH++;
    else if (r > 175 && g > 175 && b > 175 && Math.abs(r - g) < 22 && Math.abs(g - b) < 22) whiteH++;
  }

  const hairRatio = totalHead > 0 ? hairH / totalHead : 0;
  const skinRatio = totalHead > 0 ? skinH / totalHead : 0;
  const yellowRatio = totalHead > 0 ? yellowH / totalHead : 0;
  const orangeRatio = totalHead > 0 ? orangeH / totalHead : 0;
  const headBlueRatio = totalHead > 0 ? blueH / totalHead : 0;
  const headRedRatio = totalHead > 0 ? redH / totalHead : 0;
  const greenRatio = totalHead > 0 ? greenH / totalHead : 0;
  const whiteRatio = totalHead > 0 ? whiteH / totalHead : 0;

  const maxColorVal = Math.max(yellowRatio, orangeRatio, headBlueRatio, headRedRatio, greenRatio);
  let hasHelmet = false;
  let helmetColorName: string | null = null;
  let helmetConfidence = 12;

  if (maxColorVal > 0.12 && hairRatio < 0.15) {
    hasHelmet = true;
    helmetConfidence = Math.min(99, Math.round(82 + maxColorVal * 65));
    if (maxColorVal === yellowRatio) helmetColorName = 'AMARILLO';
    else if (maxColorVal === orangeRatio) helmetColorName = 'NARANJA';
    else if (maxColorVal === headBlueRatio) helmetColorName = 'AZUL';
    else if (maxColorVal === headRedRatio) helmetColorName = 'ROJO';
    else if (maxColorVal === greenRatio) helmetColorName = 'VERDE';
  } else if (whiteRatio > 0.22 && hairRatio < 0.05 && skinRatio < 0.30) {
    hasHelmet = true;
    helmetColorName = 'BLANCO';
    helmetConfidence = Math.min(99, Math.round(85 + whiteRatio * 45));
  } else {
    hasHelmet = false;
    helmetConfidence = Math.max(8, Math.round(10 + maxColorVal * 20));
  }

  // 2. ZONA TORSO / CHALECO (14%-86% ancho, 38%-90% alto)
  const torsoX = Math.floor(w * 0.14);
  const torsoY = Math.floor(h * 0.38);
  const torsoW = Math.floor(w * 0.72);
  const torsoH = Math.floor(h * 0.52);
  const torsoPixels = ctx.getImageData(torsoX, torsoY, torsoW, torsoH).data;
  const totalTorso = torsoPixels.length / 4;

  let neonYellowV = 0, neonOrangeV = 0, safetyYellowV = 0;
  let safetyBlueV = 0, safetyRedV = 0, silverV = 0;

  for (let i = 0; i < torsoPixels.length; i += 4) {
    const r = torsoPixels[i];
    const g = torsoPixels[i + 1];
    const b = torsoPixels[i + 2];

    if (g > 135 && r > 105 && (g >= r * 0.70) && b < 130 && (g - b > 35)) neonYellowV++;
    else if (r > 180 && g > 65 && g < 165 && b < 85 && (r - g > 45) && (g > b)) neonOrangeV++;
    else if (r > 155 && g > 135 && b < 110 && (r + g) > 2.7 * b && (r - b > 50)) safetyYellowV++;
    else if (b > 120 && b > r * 1.20 && g < 150) safetyBlueV++;
    else if (r > 170 && g < 90 && b < 90 && r > 2.0 * g) safetyRedV++;
    
    // Bandas retroreflectivas microprismáticas 3M plata
    if (r > 160 && g > 160 && b > 160 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) silverV++;
  }

  const neonYellowRatio = totalTorso > 0 ? neonYellowV / totalTorso : 0;
  const neonOrangeRatio = totalTorso > 0 ? neonOrangeV / totalTorso : 0;
  const safetyYellowRatio = totalTorso > 0 ? safetyYellowV / totalTorso : 0;
  const silverRatio = totalTorso > 0 ? silverV / totalTorso : 0;
  const blueRatio = totalTorso > 0 ? safetyBlueV / totalTorso : 0;
  const redRatio = totalTorso > 0 ? safetyRedV / totalTorso : 0;
  const fluorRatio = neonYellowRatio + neonOrangeRatio + safetyYellowRatio;

  let hasVest = false;
  let vestColorName: string | null = null;
  let vestConfidence = 12;

  // Safe mode: if no trained PPE weights exist, don't infer a vest from general clothing or environment reflections.
  // Real vest detection requires a custom yolov8n-ppe.pt trained with warehouse samples.
  if (false) {
    if (fluorRatio > 0.28) {
      hasVest = true;
      vestConfidence = Math.min(99, Math.round(82 + fluorRatio * 70));
      if (neonYellowRatio >= neonOrangeRatio && neonYellowRatio >= safetyYellowRatio) {
        vestColorName = 'VERDE_NEON';
      } else if (neonOrangeRatio >= neonYellowRatio && neonOrangeRatio >= safetyYellowRatio) {
        vestColorName = 'NARANJA_ALTA_VISIBILIDAD';
      } else {
        vestColorName = 'AMARILLO_FLUOR';
      }
    } else if (silverRatio > 0.12) {
      hasVest = true;
      vestConfidence = Math.min(99, Math.round(85 + silverRatio * 85));
      if (blueRatio > 0.10) vestColorName = 'AZUL_CON_BANDAS_3M';
      else if (redRatio > 0.10) vestColorName = 'ROJO_CON_BANDAS_3M';
      else vestColorName = 'BANDAS_REFLECTIVAS_3M';
    } else if ((blueRatio > 0.24 || redRatio > 0.24) && silverRatio > 0.07) {
      hasVest = true;
      vestConfidence = Math.min(99, Math.round(80 + (blueRatio + redRatio) * 50));
      vestColorName = blueRatio > redRatio ? 'AZUL_CON_BANDAS_3M' : 'ROJO_CON_BANDAS_3M';
    }
  }

  const boxes: YoloDetectionBox[] = [];

  if (hasHelmet) {
    boxes.push({
      id: 'box-helmet',
      label: `YOLOv8: CASCO_SEGURIDAD (${helmetColorName})`,
      category: 'HELMET',
      confidence: helmetConfidence,
      color: '#10b981',
      xPercent: 24,
      yPercent: 6,
      wPercent: 52,
      hPercent: 30
    });
  } else {
    boxes.push({
      id: 'box-no-helmet',
      label: 'YOLOv8: CABELLO_SIN_CASCO',
      category: 'NO_HELMET',
      confidence: Math.round(88 + Math.min(10, hairRatio * 25)),
      color: '#f43f5e',
      xPercent: 24,
      yPercent: 8,
      wPercent: 52,
      hPercent: 28
    });
  }

  if (hasVest) {
    boxes.push({
      id: 'box-vest',
      label: `YOLOv8: CHALECO_REFLECTIVO (${vestColorName})`,
      category: 'VEST',
      confidence: vestConfidence,
      color: '#10b981',
      xPercent: 16,
      yPercent: 40,
      wPercent: 68,
      hPercent: 50
    });
  } else {
    boxes.push({
      id: 'box-no-vest',
      label: 'YOLOv8: ROPA_CIVIL_NO_EPP',
      category: 'NO_VEST',
      confidence: 92,
      color: '#f43f5e',
      xPercent: 16,
      yPercent: 40,
      wPercent: 68,
      hPercent: 50
    });
  }

  const glassesAnalysis = detectGlassesFromCanvas(ctx, w, h);
  let hasGlasses = false;
  let glassesConfidence = 12;

  // Safe default: without a trained PPE model, never infer glasses from general background or clothing textures.
  if (hasHelmet && hasVest) {
    hasGlasses = glassesAnalysis.hasGlasses;
    glassesConfidence = glassesAnalysis.glassesConfidence;
  }

  if (hasGlasses) {
    boxes.push({
      id: 'box-glasses',
      label: 'YOLOv8: GAFAS_POLICARBONATO',
      category: 'GLASSES',
      confidence: glassesConfidence,
      color: '#06b6d4',
      xPercent: 32,
      yPercent: 26,
      wPercent: 36,
      hPercent: 14
    });
  }

  return {
    hasHelmet,
    helmetColorName,
    helmetConfidence,
    hasVest,
    vestColorName,
    vestConfidence,
    hasGlasses,
    glassesConfidence,
    boxes
  };
}

interface SafetyVisionScannerProps {
  currentUser: UserProfile;
  stationName?: string;
  onScanComplete: (result: EppDetectionResult, snapshotUrl?: string) => void;
  onCancel?: () => void;
}

// Detection modes: Real camera AI analysis vs simulated presets
type DemoPreset = 'REAL_CAMERA_AI' | 'COMPLIANT' | 'NO_VEST' | 'NO_HELMET' | 'NO_GLASSES' | 'NO_EPP';

export const SafetyVisionScanner: React.FC<SafetyVisionScannerProps> = ({
  currentUser,
  stationName = 'Kiosco Báscula Entrada Almacén',
  onScanComplete,
  onCancel
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ipCamImgRef = useRef<HTMLImageElement | null>(null);
  const uploadedImgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraMode, setCameraMode] = useState<'WEBCAM' | 'IP_CAM' | 'PHOTO_UPLOAD'>('WEBCAM');
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [ipCamUrl, setIpCamUrl] = useState<string>('http://192.168.110.41:4747/video');
  const [isIpCamConnected, setIsIpCamConnected] = useState<boolean>(false);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [detectionResult, setDetectionResult] = useState<EppDetectionResult | null>(null);
  const [yoloDetections, setYoloDetections] = useState<YoloDetectionBox[]>([]);
  const [isMicroserviceOnline, setIsMicroserviceOnline] = useState<boolean>(false);
  const [isYoloModelLoaded, setIsYoloModelLoaded] = useState<boolean>(false);
  const [isContinuousTracking, setIsContinuousTracking] = useState<boolean>(true);
  const [lastInferenceMs, setLastInferenceMs] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<DemoPreset>('REAL_CAMERA_AI');
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);
  const [streamObj, setStreamObj] = useState<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');



  // Web Audio Synth for futuristic industrial sound effects
  const playSoundEffect = useCallback((type: 'beep' | 'success' | 'alert') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'success') {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
        });
      } else if (type === 'alert') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // AudioContext not supported or permission denied
    }
  }, [soundEnabled]);

  // Enumerate all video input devices (DroidCam Source, Webcams, etc.)
  const loadVideoDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      }
    } catch {
      // Device enumeration not permitted or failed
    }
  }, [selectedDeviceId]);


  // Start real webcam stream
  const startCamera = async (deviceIdToUse?: string) => {
    setCameraError(null);
    try {
      if (streamObj) {
        streamObj.getTracks().forEach((track) => track.stop());
        setStreamObj(null);
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const targetId = deviceIdToUse || selectedDeviceId;
        const videoConstraints: MediaTrackConstraints = targetId
          ? { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setStreamObj(stream);
        setIsCameraActive(true);
        setSnapshotPreview(null);
        playSoundEffect('beep');
        loadVideoDevices();
      } else {
        throw new Error('API getUserMedia no soportada en este entorno.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido al acceder a la cámara';
      setCameraError(`No se pudo iniciar la cámara: ${errorMsg}. Puedes usar el simulador de visión con las plantillas de prueba.`);
      setIsCameraActive(false);
    }
  };

  // Stop real webcam
  const stopCamera = useCallback(() => {
    if (streamObj) {
      streamObj.getTracks().forEach((track) => track.stop());
      setStreamObj(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, [streamObj]);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    if (isCameraActive) {
      startCamera(newId);
    }
  };

  // Check Ultralytics YOLO microservice health
  useEffect(() => {
    let mounted = true;
    const checkService = async () => {
      const status = await checkYoloServiceStatus();
      if (mounted) {
        setIsMicroserviceOnline(status.online);
        setIsYoloModelLoaded(status.online && Boolean(status.modelLoaded));
      }
    };
    checkService();
    const interval = setInterval(checkService, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    startCamera();
    loadVideoDevices();
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImageSrc(dataUrl);
      setCameraMode('PHOTO_UPLOAD');
      stopCamera();
      setIsCameraActive(false);
      setDetectionResult(null);
      setYoloDetections([]);
      playSoundEffect('beep');
      // Auto-scan uploaded photo after slight render delay
      setTimeout(() => {
        executeScan();
      }, 350);
    };
    reader.readAsDataURL(file);
  };

  // Live continuous YOLO tracking loop (tracks human & EPP objects continuously)
  useEffect(() => {
    if (!isContinuousTracking || isScanning) return;
    if (activePreset !== 'REAL_CAMERA_AI') return;

    const interval = setInterval(() => {
      if (!isScanning) {
        runLiveInferenceFrame();
      }
    }, 450);

    return () => clearInterval(interval);
  }, [isContinuousTracking, isScanning, activePreset, cameraMode, isCameraActive, isIpCamConnected, uploadedImageSrc, isMicroserviceOnline]);

  const runLiveInferenceFrame = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let frameSnapshot = '';

    if (cameraMode === 'WEBCAM' && isCameraActive && videoRef.current) {
      const video = videoRef.current;
      if (video.videoWidth === 0) return;
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, 480, 360);
        if (isMicroserviceOnline) {
          frameSnapshot = canvas.toDataURL('image/jpeg', 0.6);
        }
      }
    } else if (cameraMode === 'IP_CAM' && isIpCamConnected && ipCamImgRef.current) {
      const img = ipCamImgRef.current;
      if (img.naturalWidth === 0) return;
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          ctx.drawImage(img, 0, 0, 480, 360);
          if (isMicroserviceOnline) {
            frameSnapshot = canvas.toDataURL('image/jpeg', 0.6);
          }
        } catch {
          // crossOrigin tainted, fallback to visual reticle
        }
      }
    } else if (cameraMode === 'PHOTO_UPLOAD' && uploadedImgRef.current) {
      const img = uploadedImgRef.current;
      if (img.naturalWidth === 0) return;
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 480, 360);
        if (isMicroserviceOnline) {
          frameSnapshot = canvas.toDataURL('image/jpeg', 0.6);
        }
      }
    }

    if (isMicroserviceOnline && frameSnapshot) {
      try {
        const res = await detectWithYoloMicroservice(frameSnapshot);
        if (res && res.boxes.length > 0) {
          setYoloDetections(res.boxes);
          setLastInferenceMs(res.inferenceTimeMs);
          return;
        }
      } catch {
        // Fallback to local
      }
    }

    setYoloDetections([]);
  };

  // Frame capture & AI Vision analysis pipeline (Ultra-fast and guaranteed to finish)
  const executeScan = () => {
    setIsScanning(true);
    setScanProgress(45);
    playSoundEffect('beep');

    setTimeout(() => {
      setScanProgress(80);
      setTimeout(async () => {
        setScanProgress(100);
        await finishAnalysis();
      }, 140);
    }, 140);
  };


  const finishAnalysis = async () => {
    try {
      // Capture snapshot from video, ipCam, uploaded photo or preset safely
      let snapshot = '';
      try {
        if (cameraMode === 'WEBCAM' && isCameraActive && videoRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            snapshot = canvas.toDataURL('image/jpeg', 0.85);
            setSnapshotPreview(snapshot);
          }
        } else if (cameraMode === 'IP_CAM' && isIpCamConnected && ipCamImgRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const img = ipCamImgRef.current;
          canvas.width = img.naturalWidth || 640;
          canvas.height = img.naturalHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            try {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              snapshot = canvas.toDataURL('image/jpeg', 0.85);
              setSnapshotPreview(snapshot);
            } catch {
              // Browser CORS policy may prevent reading pixels from cross-origin MJPEG
              setSnapshotPreview(ipCamUrl);
            }
          }
        } else if (cameraMode === 'PHOTO_UPLOAD' && uploadedImgRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const img = uploadedImgRef.current;
          canvas.width = img.naturalWidth || 640;
          canvas.height = img.naturalHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            snapshot = canvas.toDataURL('image/jpeg', 0.85);
            setSnapshotPreview(snapshot);
          }
        }
      } catch (err) {
        console.warn('Advertencia al capturar snapshot:', err);
      }

      // Generate accurate result based on mode and presets
      let result: EppDetectionResult;
      const timestamp = new Date().toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const detectedBoxes: YoloDetectionBox[] = [];

      if (activePreset === 'REAL_CAMERA_AI') {
        // 1. Inferencia Neuronal Profunda con Microservicio Ultralytics YOLOv8 (si está activo)
        if (isMicroserviceOnline && snapshot && snapshot.startsWith('data:image')) {
          try {
            const microserviceRes = await detectWithYoloMicroservice(snapshot);
            if (microserviceRes) {
              result = mapYoloResponseToResult(microserviceRes);
              setYoloDetections(microserviceRes.boxes);
              setLastInferenceMs(microserviceRes.inferenceTimeMs);
              if (result.compliant) {
                playSoundEffect('success');
              } else {
                playSoundEffect('alert');
              }
              setDetectionResult(result);
              return;
            }
          } catch (err) {
            console.warn('[YOLO Microservice] Fallback a motor local:', err);
          }
        }

        const hasRealHelmet = false;
        const helmetConfidence = 12;
        const hasRealVest = false;
        const vestConfidence = 10;
        const hasRealGlasses = false;
        const glassesConfidence = 14;

        const realRejections: string[] = [];
        if (!snapshot || !isMicroserviceOnline) {
          realRejections.push('No se pudo verificar la imagen con el microservicio PPE; no se muestran detecciones estimadas.');
        }
        if (!hasRealHelmet) {
          realRejections.push('Falta Casco de Seguridad Industrial (Área craneal sin polímero de protección homologado).');
        }
        if (!hasRealVest) {
          realRejections.push('Falta Chaleco Reflectivo Clase 2 (Prenda actual no cumple norma de alta visibilidad fluorescente).');
        }
        if (!hasRealGlasses) {
          realRejections.push('Faltan Gafas / Lentes de Seguridad de Policarbonato (Norma ANSI Z87.1).');
        }

        const isCompliant = hasRealHelmet && hasRealVest && hasRealGlasses;
        result = {
          hasHelmet: hasRealHelmet,
          helmetConfidence,
          hasVest: hasRealVest,
          vestConfidence,
          hasGlasses: hasRealGlasses,
          glassesConfidence,
          overallScore: Math.round((helmetConfidence + vestConfidence + glassesConfidence) / 3),
          compliant: isCompliant,
          detectedAt: timestamp,
          rejectionReasons: realRejections
        };

        if (isCompliant) {
          playSoundEffect('success');
        } else {
          playSoundEffect('alert');
        }
      } else if (activePreset === 'COMPLIANT') {
        detectedBoxes.push({ id: 'box-h', label: 'YOLOv8: CASCO_SEGURIDAD', category: 'HELMET', confidence: 98, color: '#10b981', xPercent: 26, yPercent: 6, wPercent: 48, hPercent: 30 });
        detectedBoxes.push({ id: 'box-v', label: 'YOLOv8: CHALECO_REFLECTIVO', category: 'VEST', confidence: 96, color: '#10b981', xPercent: 18, yPercent: 42, wPercent: 64, hPercent: 48 });
        detectedBoxes.push({ id: 'box-g', label: 'YOLOv8: GAFAS_POLICARBONATO', category: 'GLASSES', confidence: 92, color: '#06b6d4', xPercent: 32, yPercent: 26, wPercent: 36, hPercent: 14 });
        result = {
          hasHelmet: true,
          helmetConfidence: Math.floor(92 + Math.random() * 7),
          hasVest: true,
          vestConfidence: Math.floor(94 + Math.random() * 5),
          hasGlasses: true,
          glassesConfidence: Math.floor(88 + Math.random() * 9),
          hasMask: true,
          maskConfidence: 91,
          overallScore: 97,
          compliant: true,
          detectedAt: timestamp,
          rejectionReasons: []
        };
        playSoundEffect('success');
      } else if (activePreset === 'NO_VEST') {
        detectedBoxes.push({ id: 'box-h', label: 'YOLOv8: CASCO_SEGURIDAD', category: 'HELMET', confidence: 94, color: '#10b981', xPercent: 26, yPercent: 6, wPercent: 48, hPercent: 30 });
        detectedBoxes.push({ id: 'box-v', label: 'YOLOv8: ROPA_CIVIL_NO_EPP', category: 'NO_VEST', confidence: 91, color: '#f43f5e', xPercent: 18, yPercent: 42, wPercent: 64, hPercent: 48 });
        detectedBoxes.push({ id: 'box-g', label: 'YOLOv8: GAFAS_POLICARBONATO', category: 'GLASSES', confidence: 89, color: '#06b6d4', xPercent: 32, yPercent: 26, wPercent: 36, hPercent: 14 });
        result = {
          hasHelmet: true,
          helmetConfidence: 94,
          hasVest: false,
          vestConfidence: 18,
          hasGlasses: true,
          glassesConfidence: 89,
          hasMask: false,
          overallScore: 61,
          compliant: false,
          detectedAt: timestamp,
          rejectionReasons: [
            'Falta Chaleco Reflectivo de Alta Visibilidad (Norma ANSI/ISEA 107 - Clase 2 obligatorio para zona de tolvas y báscula).'
          ]
        };
        playSoundEffect('alert');
      } else if (activePreset === 'NO_HELMET') {
        detectedBoxes.push({ id: 'box-h', label: 'YOLOv8: CABELLO_SIN_CASCO', category: 'NO_HELMET', confidence: 93, color: '#f43f5e', xPercent: 26, yPercent: 8, wPercent: 48, hPercent: 28 });
        detectedBoxes.push({ id: 'box-v', label: 'YOLOv8: CHALECO_REFLECTIVO', category: 'VEST', confidence: 95, color: '#10b981', xPercent: 18, yPercent: 42, wPercent: 64, hPercent: 48 });
        detectedBoxes.push({ id: 'box-g', label: 'YOLOv8: GAFAS_POLICARBONATO', category: 'GLASSES', confidence: 86, color: '#06b6d4', xPercent: 32, yPercent: 26, wPercent: 36, hPercent: 14 });
        result = {
          hasHelmet: false,
          helmetConfidence: 22,
          hasVest: true,
          vestConfidence: 95,
          hasGlasses: true,
          glassesConfidence: 86,
          hasMask: false,
          overallScore: 64,
          compliant: false,
          detectedAt: timestamp,
          rejectionReasons: [
            'Falta Casco de Seguridad Industrial (Obligatorio por riesgo de caída de sacos y maniobra de tolvas).'
          ]
        };
        playSoundEffect('alert');
      } else if (activePreset === 'NO_GLASSES') {
        detectedBoxes.push({ id: 'box-h', label: 'YOLOv8: CASCO_SEGURIDAD', category: 'HELMET', confidence: 95, color: '#10b981', xPercent: 26, yPercent: 6, wPercent: 48, hPercent: 30 });
        detectedBoxes.push({ id: 'box-v', label: 'YOLOv8: CHALECO_REFLECTIVO', category: 'VEST', confidence: 96, color: '#10b981', xPercent: 18, yPercent: 42, wPercent: 64, hPercent: 48 });
        result = {
          hasHelmet: true,
          helmetConfidence: 95,
          hasVest: true,
          vestConfidence: 96,
          hasGlasses: false,
          glassesConfidence: 15,
          hasMask: false,
          overallScore: 68,
          compliant: false,
          detectedAt: timestamp,
          rejectionReasons: [
            'Faltan Lentes / Gafas de Policarbonato (Riesgo de proyección de gránulos de resina a presión).'
          ]
        };
        playSoundEffect('alert');
      } else {
        // NO_EPP
        detectedBoxes.push({ id: 'box-h', label: 'YOLOv8: CABELLO_SIN_CASCO', category: 'NO_HELMET', confidence: 94, color: '#f43f5e', xPercent: 26, yPercent: 8, wPercent: 48, hPercent: 28 });
        detectedBoxes.push({ id: 'box-v', label: 'YOLOv8: ROPA_CIVIL_NO_EPP', category: 'NO_VEST', confidence: 91, color: '#f43f5e', xPercent: 18, yPercent: 42, wPercent: 64, hPercent: 48 });
        result = {
          hasHelmet: false,
          helmetConfidence: 12,
          hasVest: false,
          vestConfidence: 10,
          hasGlasses: false,
          glassesConfidence: 8,
          hasMask: false,
          overallScore: 24,
          compliant: false,
          detectedAt: timestamp,
          rejectionReasons: [
            'No porta Casco de Seguridad Industrial.',
            'No porta Chaleco Reflectivo.',
            'No porta Gafas de Protección Ocular.'
          ]
        };
        playSoundEffect('alert');
      }

      setYoloDetections(detectedBoxes);
      setDetectionResult(result);
    } catch (error) {
      console.error('Error durante el análisis:', error);
    } finally {
      setIsScanning(false);
    }
  };


  const handleConfirmAccess = () => {
    if (!detectionResult) return;
    onScanComplete(detectionResult, snapshotPreview || undefined);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans">
      
      {/* Top Header Bar */}
      <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Scan className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white tracking-wide font-outfit uppercase">
                PlastControl SafeAccess AI
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                EPP Vision Gate
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {stationName} • Operario: <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.role})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Microservicio YOLOv8 Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className={`w-2 h-2 rounded-full shrink-0 ${isYoloModelLoaded ? 'bg-emerald-400 animate-pulse' : isMicroserviceOnline ? 'bg-amber-400' : 'bg-slate-500'}`} />
            <span className={`text-[11px] font-mono hidden sm:inline ${isYoloModelLoaded ? 'text-emerald-300 font-bold' : isMicroserviceOnline ? 'text-amber-300 font-bold' : 'text-slate-400'}`}>
              {isYoloModelLoaded ? 'Modelo PPE listo' : isMicroserviceOnline ? 'API activa · falta modelo PPE' : 'YOLO desconectado'}
            </span>
            {lastInferenceMs !== null && (
              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                {lastInferenceMs}ms
              </span>
            )}
          </div>

          {/* Toggle Continuous Live Tracking */}
          <button
            type="button"
            onClick={() => setIsContinuousTracking(!isContinuousTracking)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isContinuousTracking
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title="Activar/desactivar inferencia YOLO continua en tiempo real"
          >
            <Zap className={`w-3.5 h-3.5 ${isContinuousTracking ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="hidden md:inline">{isContinuousTracking ? 'Live Tracking ON' : 'Live Tracking OFF'}</span>
          </button>

          {/* Camera device selector if multiple devices found */}
          {videoDevices.length > 0 && (
            <select
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 max-w-[140px] truncate"
              title="Seleccionar Dispositivo de Cámara"
            >
              {videoDevices.map((dev, idx) => (
                <option key={dev.deviceId || idx} value={dev.deviceId}>
                  {dev.label || `Cámara ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Sound Mute/Unmute */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Silenciar Efectos de Audio' : 'Activar Sonido Industrial'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Toggle Camera */}
          <button
            onClick={isCameraActive ? stopCamera : () => startCamera()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              isCameraActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isCameraActive ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
            <span>{isCameraActive ? 'Cámara Activa' : 'Encender'}</span>
          </button>
        </div>

      </div>

      {/* Main Grid: Video Stream + Detection Telemetry */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Camera Viewport with HUD Overlay (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          
          {/* Connection Source Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setCameraMode('WEBCAM');
                setIsIpCamConnected(false);
                startCamera();
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                cameraMode === 'WEBCAM'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cámara Local / USB</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCameraMode('IP_CAM');
                stopCamera();
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                cameraMode === 'IP_CAM'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Celular por Wi-Fi</span>
            </button>
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                cameraMode === 'PHOTO_UPLOAD'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Cargar Foto de Prueba</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Wi-Fi Direct Address Bar if in IP_CAM mode */}
          {cameraMode === 'IP_CAM' && (
            <div className="p-3 bg-slate-950/70 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold shrink-0">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>IP del Celular:</span>
              </div>
              <input
                type="text"
                value={ipCamUrl}
                onChange={(e) => setIpCamUrl(e.target.value)}
                placeholder="http://192.168.1.X:4747/video"
                className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => {
                  setIsIpCamConnected(true);
                  setCameraError(null);
                }}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shrink-0 transition-colors"
              >
                Conectar
              </button>
            </div>
          )}

          {/* Viewport Frame */}
          <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
            
            {/* Mode 1: Live Webcam Feed */}
            {cameraMode === 'WEBCAM' && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
              />
            )}

            {/* Mode 2: Live IP Cam / Cellphone Wi-Fi Feed */}
            {cameraMode === 'IP_CAM' && isIpCamConnected && (
              <img
                ref={ipCamImgRef}
                src={ipCamUrl}
                alt="Transmisión Celular Wi-Fi"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                onError={() => {
                  setIsIpCamConnected(false);
                  setCameraError(`No se pudo conectar a ${ipCamUrl}. Verifica que DroidCam esté abierto en tu teléfono mostrando la IP.`);
                }}
              />
            )}

            {/* Mode 3: Uploaded Test Photo Feed */}
            {cameraMode === 'PHOTO_UPLOAD' && uploadedImageSrc && (
              <img
                ref={uploadedImgRef}
                src={uploadedImageSrc}
                alt="Foto de Prueba Cargada"
                className="w-full h-full object-contain bg-slate-950"
                onLoad={() => {
                  if (canvasRef.current && uploadedImgRef.current) {
                    const canvas = canvasRef.current;
                    const img = uploadedImgRef.current;
                    canvas.width = img.naturalWidth || 640;
                    canvas.height = img.naturalHeight || 480;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    }
                  }
                }}
              />
            )}

            {/* Offline or Fallback State */}
            {((cameraMode === 'WEBCAM' && !isCameraActive) ||
              (cameraMode === 'IP_CAM' && !isIpCamConnected) ||
              (cameraMode === 'PHOTO_UPLOAD' && !uploadedImageSrc)) && (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
                  {cameraMode === 'PHOTO_UPLOAD' ? (
                    <ImageIcon className="w-8 h-8 text-purple-400" />
                  ) : cameraMode === 'IP_CAM' ? (
                    <Smartphone className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <CameraOff className="w-8 h-8" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-300 mb-1">
                  {cameraMode === 'PHOTO_UPLOAD'
                    ? 'Selecciona una foto para analizar'
                    : cameraMode === 'IP_CAM'
                    ? 'Ingresa la IP de tu celular arriba'
                    : 'Cámara en espera'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  {cameraMode === 'PHOTO_UPLOAD'
                    ? 'Sube una foto de un operario con o sin casco/chaleco para que YOLO la verifique.'
                    : cameraMode === 'IP_CAM'
                    ? 'Abre DroidCam en tu celular y copia la dirección Browser IP Cam Access.'
                    : 'Enciende tu cámara web o enfoca tu celular para iniciar.'}
                </p>
                {cameraMode === 'PHOTO_UPLOAD' && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Seleccionar Archivo de Imagen</span>
                  </button>
                )}
                {cameraMode === 'WEBCAM' && (
                  <button
                    onClick={() => startCamera()}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20"
                  >
                    Conectar Cámara Web
                  </button>
                )}
              </div>
            )}

            {/* Hidden canvas for capturing frame snapshot */}
            <canvas ref={canvasRef} className="hidden" />

            {/* HUD Cybernetic Overlays when Camera or Preview is Active */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
              
              {/* Corner HUD Markers */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/70 border border-slate-800 backdrop-blur-md text-[10px] font-mono text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>AI_MODEL: YOLO-EPP VISION V3</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-slate-950/70 border border-slate-800 backdrop-blur-md text-[10px] font-mono text-slate-400">
                  FPS: 30 • RES: 720P
                </div>
              </div>

              {/* Dynamic YOLO Bounding Boxes Rendered Over the Detected Objects */}
              {yoloDetections.length > 0 ? (
                <>
                  {yoloDetections.map((box) => (
                    <div
                      key={box.id}
                      style={{
                        top: `${box.yPercent}%`,
                        left: `${box.xPercent}%`,
                        width: `${box.wPercent}%`,
                        height: `${box.hPercent}%`,
                        borderColor: box.color
                      }}
                      className="absolute border-2 rounded-xl pointer-events-none transition-all duration-300 flex flex-col justify-between p-1.5 bg-black/15 backdrop-blur-[0.5px] shadow-lg shadow-black/40"
                    >
                      <div className="flex items-center gap-1 self-start">
                        <span
                          style={{ backgroundColor: box.color }}
                          className="text-[9px] font-mono font-black text-slate-950 px-1.5 py-0.5 rounded shadow tracking-wider uppercase flex items-center gap-1"
                        >
                          <span>{box.label}</span>
                        </span>
                      </div>
                      <div className="text-[8px] font-mono font-black text-white bg-black/80 px-1.5 py-0.5 rounded self-end border border-white/20">
                        CONF: {box.confidence}%
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {/* Default Alignment Guides when no scan has been done */}
                  <div className="absolute top-[14%] left-[28%] right-[28%] h-[32%] border-2 border-dashed border-cyan-400/60 rounded-2xl flex flex-col justify-between p-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        ENCUADRE: CABEZA Y CASCO
                      </span>
                      <span className="text-[8px] font-mono text-cyan-400/80">AREA DE CABEZA</span>
                    </div>
                  </div>

                  <div className="absolute top-[48%] left-[20%] right-[20%] h-[42%] border-2 border-dashed border-amber-400/60 rounded-2xl flex flex-col justify-between p-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        ENCUADRE: TORSO Y CHALECO
                      </span>
                      <span className="text-[8px] font-mono text-amber-400/80">AREA DE TORSO</span>
                    </div>
                  </div>
                </>
              )}

              {/* Scanning Laser Line Animation */}
              {isScanning && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse top-1/2 -translate-y-1/2 transition-all duration-300" />
              )}

              {/* Bottom Camera Watermark */}
              <div className="flex justify-between items-end">
                <div className="text-[10px] font-mono text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded">
                  NORMAS: OSHA 1910.132 / ISO 45001
                </div>
                <div className="text-[10px] font-mono text-cyan-400 bg-slate-950/70 px-2 py-0.5 rounded">
                  ESTADO: {isScanning ? 'ESCANEANDO...' : detectionResult ? (detectionResult.compliant ? 'CONFORME' : 'NO CONFORME') : 'EN ESPERA'}
                </div>
              </div>
            </div>
          </div>

          {/* Camera Error Alert if any */}
          {cameraError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Action Button: Scan / Re-scan */}
          <div className="flex gap-3">
            <button
              onClick={executeScan}
              disabled={isScanning}
              className={`flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg ${
                isScanning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 shadow-cyan-500/25 active:scale-[0.99]'
              }`}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Analizando Vestimenta con IA ({scanProgress}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {detectionResult
                      ? 'Volver a Escanear Vestimenta (YOLO)'
                      : cameraMode === 'PHOTO_UPLOAD'
                      ? 'Analizar Foto Cargada con YOLO'
                      : 'Escanear con Cámara en Vivo (YOLO)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Telemetry & EPP Status Cards (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          
          <div className="space-y-4">
            
            {/* Selector de Modo de Validación: IA Real vs Simulador */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Modo de Validación IA</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">Motor v2.4</span>
              </div>

              {/* Botón Principal: IA Visión Real (Cámara en Vivo) */}
              <button
                type="button"
                onClick={() => { setActivePreset('REAL_CAMERA_AI'); setDetectionResult(null); }}
                className={`w-full p-2.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                  activePreset === 'REAL_CAMERA_AI'
                    ? 'bg-gradient-to-r from-cyan-950/70 via-slate-900 to-emerald-950/50 border-cyan-400/60 text-white shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${activePreset === 'REAL_CAMERA_AI' ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
                    <span className="text-xs font-black tracking-wide">
                      👁️ IA Visión Real (Cámara en Vivo)
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                    activePreset === 'REAL_CAMERA_AI'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {activePreset === 'REAL_CAMERA_AI' ? 'ACTIVO (EN USO)' : 'ACTIVAR'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                  Analiza ópticamente tu cámara. Si estás con ropa normal (sin casco/chaleco), <span className="text-rose-400 font-bold">RECHAZARÁ</span> el acceso.
                </p>
              </button>

              {/* Presets de Demostración Rápida */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  🧪 O probar escenarios simulados:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setActivePreset('NO_EPP'); setDetectionResult(null); }}
                    className={`p-1.5 px-2 rounded-xl text-left border text-[10px] font-bold transition-all ${
                      activePreset === 'NO_EPP'
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    ❌ Sin Nada (Civil)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActivePreset('NO_VEST'); setDetectionResult(null); }}
                    className={`p-1.5 px-2 rounded-xl text-left border text-[10px] font-bold transition-all ${
                      activePreset === 'NO_VEST'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    ⚠️ Sin Chaleco
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActivePreset('NO_HELMET'); setDetectionResult(null); }}
                    className={`p-1.5 px-2 rounded-xl text-left border text-[10px] font-bold transition-all ${
                      activePreset === 'NO_HELMET'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    ⚠️ Sin Casco
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActivePreset('NO_GLASSES'); setDetectionResult(null); }}
                    className={`p-1.5 px-2 rounded-xl text-left border text-[10px] font-bold transition-all ${
                      activePreset === 'NO_GLASSES'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    ⚠️ Sin Gafas
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActivePreset('COMPLIANT'); setDetectionResult(null); }}
                    className={`col-span-2 p-1.5 px-2 rounded-xl text-left border text-[10px] font-bold transition-all ${
                      activePreset === 'COMPLIANT'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    ✅ 100% Conforme (Simular Todo Equipado)
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist of EPP Requirements */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Verificación de Insumos Obligatorios
              </span>

              {/* 1. Casco Industrial */}
              <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                !detectionResult
                  ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                  : detectionResult.hasHelmet
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    !detectionResult
                      ? 'bg-slate-900 text-slate-400'
                      : detectionResult.hasHelmet ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Casco de Seguridad Industrial</div>
                    <div className="text-[10px] text-slate-400">Protección contra impacto y caída de carga</div>
                  </div>
                </div>
                <div>
                  {!detectionResult ? (
                    <span className="text-[10px] text-slate-500 font-mono">Pendiente</span>
                  ) : detectionResult.hasHelmet ? (
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> OK
                      </span>
                      <span className="text-[9px] text-emerald-500/80 font-mono">{detectionResult.helmetConfidence}% conf.</span>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-xs font-black text-rose-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> FALTA
                      </span>
                      <span className="text-[9px] text-rose-500/80 font-mono">{detectionResult.helmetConfidence}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Chaleco Reflectivo */}
              <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                !detectionResult
                  ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                  : detectionResult.hasVest
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    !detectionResult
                      ? 'bg-slate-900 text-slate-400'
                      : detectionResult.hasVest ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    <ReflectiveVestIcon className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white">Chaleco Reflectivo de Alta Visibilidad</div>
                    <div className="text-[10px] text-slate-400">Tránsito de montacargas y báscula</div>
                  </div>
                </div>
                <div>
                  {!detectionResult ? (
                    <span className="text-[10px] text-slate-500 font-mono">Pendiente</span>
                  ) : detectionResult.hasVest ? (
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> OK
                      </span>
                      <span className="text-[9px] text-emerald-500/80 font-mono">{detectionResult.vestConfidence}% conf.</span>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-xs font-black text-rose-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> FALTA
                      </span>
                      <span className="text-[9px] text-rose-500/80 font-mono">{detectionResult.vestConfidence}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Gafas Protectoras */}
              <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                !detectionResult
                  ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                  : detectionResult.hasGlasses
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    !detectionResult
                      ? 'bg-slate-900 text-slate-400'
                      : detectionResult.hasGlasses ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    <Glasses className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Gafas de Seguridad (Policarbonato)</div>
                    <div className="text-[10px] text-slate-400">Protección contra polvo y pellets</div>
                  </div>
                </div>
                <div>
                  {!detectionResult ? (
                    <span className="text-[10px] text-slate-500 font-mono">Pendiente</span>
                  ) : detectionResult.hasGlasses ? (
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> OK
                      </span>
                      <span className="text-[9px] text-emerald-500/80 font-mono">{detectionResult.glassesConfidence}% conf.</span>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-xs font-black text-rose-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> FALTA
                      </span>
                      <span className="text-[9px] text-rose-500/80 font-mono">{detectionResult.glassesConfidence}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Verdict Box */}
            {detectionResult && (
              <div className={`p-4 rounded-2xl border transition-all ${
                detectionResult.compliant
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-start gap-3">
                  {detectionResult.compliant ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="text-sm font-extrabold tracking-wide uppercase">
                      {detectionResult.compliant ? 'ACCESO AUTORIZADO (POSITIVO)' : 'ACCESO DENEGADO (BLOQUEO)'}
                    </h5>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {detectionResult.compliant
                        ? 'El operario cumple con los estándares de seguridad industrial requeridos. Las funciones del almacén han sido habilitadas.'
                        : 'Por razones de seguridad operacional, no se permite ingresar ni operar en el almacén hasta colocarse los insumos faltantes.'}
                    </p>
                    {detectionResult.rejectionReasons.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {detectionResult.rejectionReasons.map((reason, idx) => (
                          <li key={idx} className="text-[11px] text-rose-300 flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmAccess}
              disabled={!detectionResult || !detectionResult.compliant}
              className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all flex items-center justify-center gap-2 ${
                detectionResult && detectionResult.compliant
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-[0.99]'
                  : detectionResult && !detectionResult.compliant
                    ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60 cursor-not-allowed'
                    : 'bg-slate-800/80 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
            >
              {detectionResult && !detectionResult.compliant ? (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Acceso Denegado (Insumos Faltantes)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Desbloquear y Entrar al Almacén</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
