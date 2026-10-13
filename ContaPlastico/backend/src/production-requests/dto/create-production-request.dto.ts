import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { ProcessType } from '@prisma/client';

export class RequiredMaterialDto {
  @IsUUID()
  materialId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantityKg!: number;
}

export class CreateProductionRequestDto {
  @IsString()
  orderCode!: string;

  @IsString()
  line!: string;

  @IsOptional()
  @IsEnum(ProcessType)
  processType?: ProcessType;

  @IsString()
  targetProduct!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequiredMaterialDto)
  requiredMaterials!: RequiredMaterialDto[];
}
