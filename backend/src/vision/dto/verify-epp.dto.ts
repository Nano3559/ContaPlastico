import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyEppDto {
  @ApiPropertyOptional({
    description: 'Imagen codificada en Base64 tomada por la cámara del celular',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8_000_000)
  imageBase64?: string;

  @ApiPropertyOptional({
    description: 'URL remota opcional de la imagen a analizar (para pruebas y depuración)',
    example: 'https://ejemplo.com/operario.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
