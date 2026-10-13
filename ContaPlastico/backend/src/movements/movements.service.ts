import { Injectable } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { materialId?: string; type?: MovementType; from?: string; to?: string }) {
    return this.prisma.stockMovement.findMany({
      where: {
        materialId: filters.materialId,
        type: filters.type,
        createdAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      include: {
        material: { select: { id: true, code: true, name: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
        productionRequest: { select: { id: true, orderCode: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
