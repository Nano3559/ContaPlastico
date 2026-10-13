import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateEntryDto } from './dto/create-entry.dto';
import { EntriesService } from './entries.service';

@ApiTags('entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('entries')
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Get()
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  @ApiOperation({ summary: 'Consultar entradas y lotes' })
  findAll() {
    return this.entriesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  findOne(@Param('id') id: string) {
    return this.entriesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'ALMACEN')
  @ApiOperation({ summary: 'Registrar entrada de materia prima y actualizar inventario' })
  create(@Body() body: CreateEntryDto, @Req() request: { user: { id: string } }) {
    return this.entriesService.create(body, request.user.id);
  }
}
