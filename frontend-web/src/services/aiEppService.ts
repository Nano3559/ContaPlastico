/**
 * Servicio de Integración para el Módulo IA de Seguridad Industrial (Detección de EPP)
 * Conecta el Dashboard PlastControl con el servidor Python Flask / YOLOv8 (GPU RTX 4060)
 * Ruta local: C:\Users\IFAM_\Desktop\ModuloIA_Seguridad\epp_app.py (:5000)
 */

export interface EppItemStatus {
  status: 'detected' | 'missing' | 'pending';
  conf: number;
}

export interface AiEppStatusResponse {
  source: 'laptop' | 'droidcam' | null;
  running: boolean;
  error_msg: string | null;
  fps_cam: number;
  fps_infer: number;
  det_count: number;
  inf_ms: number;
  model: string;
  epp: {
    helmet: EppItemStatus;
    goggles: EppItemStatus;
    vest: EppItemStatus;
    [key: string]: EppItemStatus;
  };
  result: 'approved' | 'rejected' | 'pending';
  has_worker: boolean;
  missing: string[];
  gate_status: 'open' | 'locked' | 'standby';
  access_msg: string;
}

export interface AiEppPhotoResponse {
  ok: boolean;
  msg?: string;
  image?: string;
  epp: {
    helmet: EppItemStatus;
    goggles: EppItemStatus;
    vest: EppItemStatus;
    [key: string]: EppItemStatus;
  };
  det_count: number;
  inf_ms: number;
  has_worker: boolean;
  result: 'approved' | 'rejected' | 'pending';
  missing: string[];
  gate_status: 'open' | 'locked' | 'standby';
  access_msg: string;
}

export interface AccessAuditLogItem {
  id: string;
  timestamp: string;
  source: 'Webcam Laptop' | 'DroidCam WiFi' | 'Foto Estática';
  result: 'approved' | 'rejected' | 'pending';
  gear: {
    helmet: boolean;
    goggles: boolean;
    vest: boolean;
  };
  details: string;
  inf_ms: number;
}

class AiEppService {
  private primaryBase = '/ai-service';
  private directBase = 'http://127.0.0.1:5000';
  private activeBase = '/ai-service';

  constructor() {
    // Intentar resolver dinámicamente si estamos en Vite o directo
    if (typeof window !== 'undefined') {
      const savedHost = localStorage.getItem('plastcontrol_ai_host');
      if (savedHost) {
        this.activeBase = savedHost;
      }
    }
  }

  public setCustomHost(host: string) {
    this.activeBase = host.trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      localStorage.setItem('plastcontrol_ai_host', this.activeBase);
    }
  }

  public getActiveHost(): string {
    return this.activeBase;
  }

  private async tryFetch(path: string, options?: RequestInit): Promise<Response> {
    const urlsToTry = [
      `${this.activeBase}${path}`,
      `${this.primaryBase}${path}`,
      `${this.directBase}${path}`,
    ];

    let lastError: unknown = null;

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, {
          ...options,
          signal: options?.signal || AbortSignal.timeout(12000),
        });
        if (res.ok || res.status === 400) {
          return res;
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error(`No se pudo conectar con el servidor IA en ${this.activeBase}`);
  }

  /**
   * Diagnóstico de conexión y lectura de telemetría viva
   */
  public async getStatus(): Promise<AiEppStatusResponse> {
    const res = await this.tryFetch('/api/status');
    if (!res.ok) {
      throw new Error(`Error ${res.status} al consultar estado del módulo IA`);
    }
    return (await res.json()) as AiEppStatusResponse;
  }

  /**
   * Inicia el flujo continuo de video (Laptop Webcam o Celular DroidCam)
   */
  public async startStream(
    source: 'laptop' | 'droidcam',
    ip: string = '192.168.0.24',
    port: string = '4747',
  ): Promise<{ ok: boolean; source: string; msg?: string }> {
    let query = '';
    if (source === 'droidcam') {
      query = `?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(port)}`;
    }
    const res = await this.tryFetch(`/api/start/${source}${query}`, { method: 'POST' });
    const data = await res.json();
    return data;
  }

  /**
   * Detiene el flujo continuo de video (usa GET compatible con epp_app.py)
   */
  public async stopStream(): Promise<{ ok: boolean }> {
    try {
      // epp_app.py acepta GET en /api/stop
      const res = await this.tryFetch('/api/stop', { method: 'GET' });
      const data = await res.json();
      return data;
    } catch {
      try {
        const res = await this.tryFetch('/api/stop', { method: 'POST' });
        return await res.json();
      } catch {
        return { ok: true };
      }
    }
  }

  /**
   * Envía una fotografía para análisis inteligente multiescala en GPU
   */
  public async analyzePhoto(file: File | Blob): Promise<AiEppPhotoResponse> {
    const formData = new FormData();
    formData.append('file', file, 'operario_epp.jpg');

    const res = await this.tryFetch('/api/photo', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.msg || 'Error al procesar la fotografía en la IA');
    }
    return data as AiEppPhotoResponse;
  }

  /**
   * Obtiene la URL completa del stream MJPEG
   */
  public getVideoFeedUrl(): string {
    return `${this.activeBase}/video_feed?t=${Date.now()}`;
  }
}

export const aiEppService = new AiEppService();
