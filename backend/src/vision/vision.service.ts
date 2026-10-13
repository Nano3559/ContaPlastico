import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerifyEppDto } from './dto/verify-epp.dto';
import {
  EppDetectionItem,
  EppStatus,
  VerifyEppResult,
} from './interfaces/vision-response.interface';

interface InferencePrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

interface InferenceResponse {
  predictions: InferencePrediction[];
  personDetectionAvailable?: boolean;
  error?: string;
}

@Injectable()
export class VisionService {
  private readonly inferenceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.inferenceUrl =
      this.configService.get<string>('PPE_INFERENCE_URL') ||
      'http://127.0.0.1:5000/infer';
  }

  async verifyEpp(dto: VerifyEppDto): Promise<VerifyEppResult> {
    let base64Image = dto.imageBase64;

    if (!base64Image && dto.imageUrl) {
      base64Image = await this.fetchImageAsBase64(dto.imageUrl);
    }

    if (!base64Image) {
      throw new BadRequestException(
        'Debe proporcionar una imagen en formato base64 o la imagen de prueba permitida.',
      );
    }

    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const inferenceResult = await this.callLocalInference(cleanBase64);
    return this.evaluateEppCompliance(
      inferenceResult.predictions,
      inferenceResult.personDetectionAvailable !== false,
    );
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'images.unsplash.com') {
        throw new Error('Solo se permite la imagen de prueba pública configurada.');
      }

      const response = await fetch(parsedUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        throw new Error(`Error al descargar imagen: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 6_000_000) {
        throw new Error('La imagen de prueba excede el tamaño permitido.');
      }
      return Buffer.from(arrayBuffer).toString('base64');
    } catch {
      throw new BadRequestException(
        'No se pudo cargar la imagen de prueba permitida.',
      );
    }
  }

  private async callLocalInference(base64Data: string): Promise<InferenceResponse> {
    try {
      const response = await fetch(this.inferenceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64Data }),
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) {
        throw new Error(`El worker local respondió HTTP ${response.status}.`);
      }

      const result = (await response.json()) as InferenceResponse;
      if (!Array.isArray(result.predictions)) {
        throw new Error('El worker local devolvió una respuesta inválida.');
      }
      return result;
    } catch {
      throw new ServiceUnavailableException(
        'El motor EPP local no está disponible. Inicia security-module/local_inference.py.',
      );
    }
  }

  private evaluateEppCompliance(
    predictions: InferencePrediction[],
    personDetectionAvailable: boolean,
  ): VerifyEppResult {
    const detections: EppDetectionItem[] = [];
    const bestConfidence: Record<string, number> = {};

    for (const p of predictions) {
      const conf = Math.round(p.confidence * 100);
      detections.push({
        label: p.class,
        confidence: conf,
        box: {
          x: Math.round(p.x),
          y: Math.round(p.y),
          width: Math.round(p.width),
          height: Math.round(p.height),
        },
      });

      if (!bestConfidence[p.class] || conf > bestConfidence[p.class]) {
        bestConfidence[p.class] = conf;
      }
    }

    // The worker has already applied PPE_CONFIDENCE_THRESHOLD before returning detections.
    const personDetected = (bestConfidence['Person'] || 0) > 0;
    if (personDetectionAvailable && !personDetected) {
      return {
        accessGranted: false,
        isConclusive: false,
        status: { helmet: false, goggles: false, vest: false },
        missing: [],
        unverified: [
          'Casco de seguridad',
          'Lentes / Gafas de protección',
          'Chaleco reflectivo',
        ],
        detected: [],
        confidenceSummary: {},
        detections,
        timestamp: new Date().toISOString(),
        message:
          'No se pudo identificar claramente al trabajador. Centra a una persona de cuerpo completo, mejora la iluminación y vuelve a capturar la imagen.',
      };
    }

    const classifyEquipment = (
      positiveClass: string,
      negativeClass: string,
    ): 'present' | 'missing' | 'unknown' => {
      const positiveConfidence = bestConfidence[positiveClass] || 0;
      const negativeConfidence = bestConfidence[negativeClass] || 0;
      const positiveDetected = positiveConfidence > 0;
      const negativeDetected = negativeConfidence > 0;

      if (positiveDetected && negativeDetected) {
        if (positiveConfidence === negativeConfidence) return 'unknown';
        return positiveConfidence > negativeConfidence ? 'present' : 'missing';
      }
      if (positiveDetected) return 'present';
      if (negativeDetected) return 'missing';
      return 'unknown';
    };

    const helmetState = classifyEquipment('helmet', 'no-helmet');
    const gogglesState = classifyEquipment('goggles', 'no-goggles');
    const vestState = classifyEquipment('vest', 'no-vest');

    const status: EppStatus = {
      helmet: helmetState === 'present',
      goggles: gogglesState === 'present',
      vest: vestState === 'present',
    };

    const missing: string[] = [];
    const unverified: string[] = [];
    if (helmetState === 'missing') missing.push('Casco de seguridad');
    if (gogglesState === 'missing') missing.push('Lentes / Gafas de protección');
    if (vestState === 'missing') missing.push('Chaleco reflectivo');
    if (helmetState === 'unknown') unverified.push('Casco de seguridad');
    if (gogglesState === 'unknown') unverified.push('Lentes / Gafas de protección');
    if (vestState === 'unknown') unverified.push('Chaleco reflectivo');

    const detected: string[] = [];
    if (status.helmet) detected.push('Casco');
    if (status.goggles) detected.push('Lentes');
    if (status.vest) detected.push('Chaleco');

    const isConclusive = unverified.length === 0;
    const accessGranted = isConclusive && missing.length === 0;

    const inconclusiveDetails = [
      missing.length ? `Ausencia detectada: ${missing.join(', ')}.` : '',
      unverified.length ? `Sin verificar: ${unverified.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      accessGranted,
      isConclusive,
      status,
      missing,
      unverified,
      detected,
      confidenceSummary: {
        helmet: bestConfidence['helmet'],
        goggles: bestConfidence['goggles'],
        vest: bestConfidence['vest'],
      },
      detections,
      timestamp: new Date().toISOString(),
      message: accessGranted
        ? 'Acceso Autorizado: El operario cumple con todos los implementos de seguridad requeridos (EPP).'
        : isConclusive
          ? `Acceso Denegado: Faltan implementos de protección obligatorios: ${missing.join(', ')}.`
          : `No se pudo verificar todo el EPP. ${inconclusiveDetails} Vuelve a capturar al trabajador de cuerpo completo con buena iluminación.`,
    };
  }
}
