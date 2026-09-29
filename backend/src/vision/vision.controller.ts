import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { VerifyEppDto } from './dto/verify-epp.dto';
import { VisionService } from './vision.service';

@ApiTags('vision')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vision')
export class VisionController {
  constructor(private readonly visionService: VisionService) {}

  @Post('verify-epp')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Verificar cumplimiento de EPP (Casco, Lentes, Chaleco) con IA de visión',
    description:
      'Analiza la fotografía tomada por la cámara del celular para confirmar que el operario porta casco, lentes de seguridad y chaleco reflectivo antes de permitir acceso al sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluación de seguridad completada con veredicto de acceso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Imagen no proporcionada o formato no válido.',
  })
  async verifyEpp(@Body() dto: VerifyEppDto) {
    return this.visionService.verifyEpp(dto);
  }
}
