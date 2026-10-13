import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateEntryDto {
  @IsUUID()
  materialId!: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsString()
  supplierBatchNumber!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantityKg!: number;

  @IsString()
  invoiceNumber!: string;

  @IsOptional()
  @IsBoolean()
  qualityCertificate?: boolean;

  @IsString()
  siloOrWarehouseLocation!: string;

  @IsOptional()
  @IsString()
  operatorNotes?: string;
}
