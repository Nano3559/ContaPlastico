import { IsOptional, IsInt, IsNumber, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateSaleRecordDto {
  @ApiPropertyOptional({
    description: 'Cantidad de unidades vendidas o devueltas (admite números negativos para notas de devolución)',
    example: 15000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  quantityUnits?: number;

  @ApiPropertyOptional({
    description: 'Precio unitario en USD',
    example: 0.045,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({
    description: 'Estado de la orden',
    enum: ['COMPLETADA', 'PARCIAL', 'CANCELADA', 'DEVUELTA'],
    example: 'COMPLETADA',
  })
  @IsOptional()
  @IsString()
  @IsIn(['COMPLETADA', 'PARCIAL', 'CANCELADA', 'DEVUELTA'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Estacionalidad de la venta',
    enum: ['ALTA', 'MEDIA', 'BAJA', 'PICO_FIN_ANO'],
    example: 'ALTA',
  })
  @IsOptional()
  @IsString()
  seasonality?: string;

  @ApiPropertyOptional({
    description: 'Cliente asociado a la venta',
    example: 'Bebidas del Valle Ltda.',
  })
  @IsOptional()
  @IsString()
  clientName?: string;
}

