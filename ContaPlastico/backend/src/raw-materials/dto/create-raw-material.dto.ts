import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MaterialType, ProcessType } from '@prisma/client';

export class CreateRawMaterialDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(MaterialType)
  type?: MaterialType;

  @IsOptional()
  @IsEnum(ProcessType)
  category?: ProcessType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  density!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  meltFlowIndex!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentStockKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStockKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCapacityKg?: number;

  @IsString()
  siloLocation!: string;

  @IsOptional()
  @IsString()
  supplierId?: string;
}
