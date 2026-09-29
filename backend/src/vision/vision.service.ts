import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerifyEppDto } from './dto/verify-epp.dto';
import {
  EppDetectionItem,
  EppStatus,
  VerifyEppResult,
} from './interfaces/vision-response.interface';

interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

interface RoboflowResponse {
  predictions?: RoboflowPrediction[];
  error?: string | Record<string, unknown>;
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly defaultConfidence: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('ROBOFLOW_API_KEY') || 'zbhBSqakJ7PbTmO9NLr6';
    this.modelId =
      this.configService.get<string>('ROBOFLOW_MODEL_ID') || 'ppe-detection-qlq3d/1';
    this.defaultConfidence = parseFloat(
      this.configService.get<string>('ROBOFLOW_CONFIDENCE_THRESHOLD') || '0.35',
    );
  }

  async verifyEpp(dto: VerifyEppDto): Promise<VerifyEppResult> {
    let base64Image = dto.imageBase64;

    if (!base64Image && dto.imageUrl) {
      base64Image = await this.fetchImageAsBase64(dto.imageUrl);
    }

    if (!base64Image) {
      throw new BadRequestException(
        'Debe proporcionar una imagen en formato base64 o una URL válida.',
      );
    }

    // Limpiar prefijo data:image/...;base64, si viene incluido
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    const roboflowResult = await this.callRoboflowInference(cleanBase64);

    return this.evaluateEppCompliance(roboflowResult.predictions || []);
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error al descargar imagen: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    } catch (err) {
      this.logger.error(`Fallo al descargar imagen desde URL: ${url}`, err);
      throw new BadRequestException(
        'No se pudo descargar la imagen desde la URL proporcionada.',
      );
    }
  }

  private async callRoboflowInference(base64Data: string): Promise<RoboflowResponse> {
    const url = `https://serverless.roboflow.com/${this.modelId}?api_key=${this.apiKey}&confidence=${this.defaultConfidence}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: base64Data,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Error de Roboflow (${response.status}): ${errorText}`,
        );
        throw new InternalServerErrorException(
          `Error del motor de visión IA: ${response.statusText}`,
        );
      }

      return (await response.json()) as RoboflowResponse;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error('Error al comunicarse con la API de Roboflow', error);
      throw new InternalServerErrorException(
        'No se pudo conectar con el servicio de visión artificial.',
      );
    }
  }

  private evaluateEppCompliance(predictions: RoboflowPrediction[]): VerifyEppResult {
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

    const hasHelmetPositive = (bestConfidence['helmet'] || 0) >= 35;
    const hasHelmetNegative = (bestConfidence['no-helmet'] || 0) > (bestConfidence['helmet'] || 0);
    const helmetOk = hasHelmetPositive && !hasHelmetNegative;

    const hasGogglesPositive = (bestConfidence['goggles'] || 0) >= 30;
    const hasGogglesNegative = (bestConfidence['no-goggles'] || 0) > (bestConfidence['goggles'] || 0);
    const gogglesOk = hasGogglesPositive && !hasGogglesNegative;

    const hasVestPositive = (bestConfidence['vest'] || 0) >= 35;
    const hasVestNegative = (bestConfidence['no-vest'] || 0) > (bestConfidence['vest'] || 0);
    const vestOk = hasVestPositive && !hasVestNegative;

    const status: EppStatus = {
      helmet: helmetOk,
      goggles: gogglesOk,
      vest: vestOk,
    };

    const missing: string[] = [];
    if (!status.helmet) missing.push('Casco de seguridad');
    if (!status.goggles) missing.push('Lentes / Gafas de protección');
    if (!status.vest) missing.push('Chaleco reflectivo');

    const detected: string[] = [];
    if (status.helmet) detected.push('Casco');
    if (status.goggles) detected.push('Lentes');
    if (status.vest) detected.push('Chaleco');

    const accessGranted = missing.length === 0;

    return {
      accessGranted,
      status,
      missing,
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
        : `Acceso Denegado: Faltan implementos de protección obligatorios: ${missing.join(', ')}.`,
    };
  }
}
