import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

class CreateUserDto {
  email!: string;
  password!: string;
  name!: string;
  role?: 'ADMIN' | 'ALMACEN' | 'PRODUCCION' | 'SUPERVISOR';
  shift?: string | null;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  @ApiOperation({ summary: 'Listar usuarios' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear usuario' })
  @ApiBody({ type: CreateUserDto })
  async create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Get(':id')
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  @ApiOperation({ summary: 'Obtener usuario por id' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
