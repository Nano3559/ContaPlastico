import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum ScrapCause {
  ARRANQUE_MAQUINA = 'ARRANQUE_MAQUINA',
  CAMBIO_COLOR = 'CAMBIO_COLOR',
  ATASCO = 'ATASCO',
  DESCALIBRACION = 'DESCALIBRACION',
}

const normalizeCause = (value: string): string => {
  if (!value) return value;
  const normalized = value.toString().trim().toUpperCase();
  if (normalized.includes('ARRANQUE')) return ScrapCause.ARRANQUE_MAQUINA;
  if (normalized.includes('CAMBIO') || normalized.includes('COLOR')) return ScrapCause.CAMBIO_COLOR;
  if (normalized.includes('ATASCO')) return ScrapCause.ATASCO;
  if (normalized.includes('DESCALIB') || normalized.includes('CALIB')) return ScrapCause.DESCALIBRACION;
  return normalized.replace(/\s+/g, '_');
};

export class CreateScrapDto {
  @IsString()
  productionOrderId!: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consumedRawMaterialKg!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  producedGoodKg!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  scrapRecoverableKg!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  scrapDiscardKg!: number;

  @Transform(({ value }) => normalizeCause(value))
  @IsString()
  cause!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
