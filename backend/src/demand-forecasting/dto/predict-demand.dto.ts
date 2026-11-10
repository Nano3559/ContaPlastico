import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProcessType } from '@prisma/client';

export enum ForecastGranularity {
  MONTH = 'month',
  WEEK = 'week',
  YEAR = 'year',
}

export enum ForecastAlgorithm {
  AUTO_ENSEMBLE = 'AUTO_ENSEMBLE',
  HOLT_WINTERS = 'HOLT_WINTERS',
  REGRESSION = 'REGRESSION',
  EXPONENTIAL_SMOOTHING = 'EXPONENTIAL_SMOOTHING',
}

export class PredictDemandDto {
  @ApiPropertyOptional({
    description: 'Granularidad de agrupación temporal: month | week | year',
    enum: ForecastGranularity,
    default: ForecastGranularity.MONTH,
  })
  @IsOptional()
  @IsEnum(ForecastGranularity)
  granularity?: ForecastGranularity = ForecastGranularity.MONTH;

  @ApiPropertyOptional({
    description: 'Número de periodos futuros a proyectar',
    default: 6,
    minimum: 1,
    maximum: 24,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  periods?: number = 6;

  @ApiPropertyOptional({
    description: 'Código de producto específico (ej. PREF-PET-28, TAPA-HDPE-28, etc.)',
  })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional({
    description: 'Línea de transformación / Categoría de proceso',
    enum: ProcessType,
  })
  @IsOptional()
  @IsEnum(ProcessType)
  category?: ProcessType;

  @ApiPropertyOptional({
    description: 'Algoritmo de Inteligencia Artificial para el pronóstico',
    enum: ForecastAlgorithm,
    default: ForecastAlgorithm.AUTO_ENSEMBLE,
  })
  @IsOptional()
  @IsEnum(ForecastAlgorithm)
  algorithm?: ForecastAlgorithm = ForecastAlgorithm.AUTO_ENSEMBLE;

  @ApiPropertyOptional({
    description: 'Porcentaje de variación de demanda para simulación What-If (ej: +20, -15)',
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-90)
  @Max(300)
  simulationDemandDeltaPct?: number;

  @ApiPropertyOptional({
    description: 'Ajuste de merma de planta en porcentaje para simulación (ej: +2 para pasar de 3.5% a 5.5%)',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(-5)
  @Max(20)
  simulationScrapDeltaPct?: number;

  @ApiPropertyOptional({
    description: 'Tipo de cambio Dólar a Bolivianos (USD/BOB) para simulación financiera (ej: 6.96 oficial, 10.50, 12.00)',
    example: 6.96,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(5.0)
  @Max(30.0)
  exchangeRateBOB?: number;

  @ApiPropertyOptional({
    description: 'Variación de precio de venta unitario en porcentaje (ej: +10% o -5%)',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(-50)
  @Max(150)
  priceDeltaPct?: number;

  @ApiPropertyOptional({
    description: 'Variación de costo internacional de resina virgen en porcentaje (ej: +25% por shock petroquímico)',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(-50)
  @Max(200)
  resinCostDeltaPct?: number;

  @ApiPropertyOptional({
    description: 'Porcentaje de material recuperado / reciclado incorporado en mezcla (ej: 15% base, hasta 45%)',
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(60)
  recycledMaterialPct?: number;

  @ApiPropertyOptional({
    description: 'Eficiencia global de planta (OEE) o disponibilidad de líneas en porcentaje (ej: 85% base)',
    example: 85,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(40)
  @Max(100)
  plantEfficiencyPct?: number;

  @ApiPropertyOptional({
    description: 'Valores editados manualmente periodo por periodo (ej: {"2026-11": 150000, "2026-12": 220000})',
  })
  @IsOptional()
  manualOverrides?: Record<string, number>;
}
