// Client service to communicate with Ultralytics YOLOv8 Python microservice
import type { YoloDetectionBox } from '../components/SafetyVisionScanner';
import type { EppDetectionResult } from '../types';

export interface YoloMicroserviceResponse {
  status: string;
  compliant: boolean;
  hasHelmet: boolean;
  helmetConfidence: number;
  hasVest: boolean;
  vestConfidence: number;
  hasGlasses: boolean;
  glassesConfidence: number;
  overallScore: number;
  boxes: YoloDetectionBox[];
  rejectionReasons: string[];
  inferenceTimeMs: number;
}

const AI_SERVICE_BASE_URL = 'http://localhost:8000';

/**
 * Checks if the Ultralytics YOLO microservice is active on port 8000
 */
export async function checkYoloServiceStatus(): Promise<{ online: boolean; engine?: string; modelLoaded?: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900);

    const response = await fetch(`${AI_SERVICE_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        online: true,
        engine: data.engine || 'Ultralytics YOLOv8',
        modelLoaded: Boolean(data.modelLoaded)
      };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

/**
 * Sends a base64 frame to the YOLOv8 microservice for neural inference
 */
export async function detectWithYoloMicroservice(base64Image: string): Promise<YoloMicroserviceResponse | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${AI_SERVICE_BASE_URL}/detect/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image: base64Image }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data: YoloMicroserviceResponse = await response.json();
      return data;
    }
    return null;
  } catch (err) {
    console.warn('[YOLO Service] Fallo al conectar con microservicio:', err);
    return null;
  }
}

/**
 * Maps microservice response to PlastControl EppDetectionResult
 */
export function mapYoloResponseToResult(response: YoloMicroserviceResponse): EppDetectionResult {
  const timestamp = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return {
    hasHelmet: response.hasHelmet,
    helmetConfidence: response.helmetConfidence,
    hasVest: response.hasVest,
    vestConfidence: response.vestConfidence,
    hasGlasses: response.hasGlasses,
    glassesConfidence: response.glassesConfidence,
    overallScore: response.overallScore,
    compliant: response.compliant,
    detectedAt: timestamp,
    rejectionReasons: response.rejectionReasons
  };
}
