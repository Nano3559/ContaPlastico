---
name: create-api-module
description: Guía estructurada para crear un nuevo módulo en la API NestJS de PlastControl siguiendo Clean Architecture, DTOs con class-validator, Swagger, Prisma y servicios tipados en Frontend.
---

# Habilidad: Creación de un Módulo en la API REST (create-api-module)

Esta habilidad documenta el procedimiento estándar para añadir un nuevo módulo al backend de **PlastControl**, asegurando coherencia con los estándares de la arquitectura.

## Estructura de Archivos Esperada
Para un nuevo módulo llamado `ejemplo`, la estructura dentro de `backend/src/ejemplo/` debe ser:
```
backend/src/ejemplo/
├── dto/
│   ├── create-ejemplo.dto.ts
│   └── update-ejemplo.dto.ts
├── ejemplo.controller.ts
├── ejemplo.service.ts
└── ejemplo.module.ts
```

## Pasos para la Implementación

### 1. Definir los DTOs con Validación
Todo parámetro entrante debe estar fuertemente tipado y validado:
```typescript
import { IsNotEmpty, IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEjemploDto {
  @ApiProperty({ description: 'Código único' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Cantidad en kilogramos' })
  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @ApiPropertyOptional({ description: 'Notas opcionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}
```

### 2. Implementar el Servicio con Prisma
Inyecta `PrismaService` y usa transacciones si se altera el inventario:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEjemploDto } from './dto/create-ejemplo.dto';

@Injectable()
export class EjemploService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEjemploDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear registro
      // 2. Actualizar stock si corresponde
      // 3. Retornar resultado
    });
  }

  async findAll() {
    return this.prisma.ejemplo.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

### 3. Implementar el Controlador con Seguridad y Swagger
Aplica el decorador de roles y prefijos de ruta:
```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { EjemploService } from './ejemplo.service';
import { CreateEjemploDto } from './dto/create-ejemplo.dto';

@ApiTags('ejemplo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ejemplo')
export class EjemploController {
  constructor(private readonly ejemploService: EjemploService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Crear nuevo registro' })
  create(@Body() dto: CreateEjemploDto) {
    return this.ejemploService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar registros' })
  findAll() {
    return this.ejemploService.findAll();
  }
}
```

### 4. Registrar en `app.module.ts`
Agrega `EjemploModule` en la lista `imports` de `backend/src/app.module.ts`.

### 5. Actualizar la Capa de Servicios del Frontend
En `frontend-web/src/services/` o `mobile-app/src/services/`, agrega el método consumidor y la interfaz de TypeScript correspondiente.
