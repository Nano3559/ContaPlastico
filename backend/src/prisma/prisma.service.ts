import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexión con PostgreSQL establecida.');
    } catch (error) {
      this.logger.warn(
        '⚠️ Base de datos PostgreSQL no detectada en localhost:5432. El servidor iniciará normalmente para endpoints que no requieran base de datos (como el módulo de Visión IA).',
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // Ignorar errores al desconectar si nunca estuvo conectado
    }
  }
}
