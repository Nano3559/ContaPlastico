import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateScrapDto } from './dto/create-scrap.dto';
import { ProductionService } from './production.service';

@ApiTags('production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get('scrap')
  @Roles('ADMIN', 'PRODUCCION', 'SUPERVISOR')
  @ApiOperation({ summary: 'Consultar registros de consumo y merma' })
  findAllScrap() { return this.productionService.findAllScrap(); }

  @Post('scrap')
  @Roles('PRODUCCION', 'SUPERVISOR')
  @ApiOperation({ summary: 'Registrar consumo, producto terminado y merma' })
  registerScrap(@Body() body: CreateScrapDto, @Req() request: { user: { id: string } }) {
    return this.productionService.registerScrap(body, request.user.id);
  }
}
