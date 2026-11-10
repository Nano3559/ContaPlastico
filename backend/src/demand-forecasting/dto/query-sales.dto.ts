import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProcessType } from '@prisma/client';

export class QuerySalesDto {
  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Límite de registros por página', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Filtro por código de producto' })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional({ description: 'Filtro por categoría de proceso', enum: ProcessType })
  @IsOptional()
  @IsEnum(ProcessType)
  category?: ProcessType;

  @ApiPropertyOptional({ description: 'Búsqueda de texto (código, cliente, producto)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Fecha inicio (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
