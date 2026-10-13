import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionRequestDto } from './dto/create-production-request.dto';

@Injectable()
export class ProductionRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductionRequestDto, requestedById: string) {
    if (data.requiredMaterials.length === 0) {
      throw new BadRequestException('La solicitud debe incluir al menos un material');
    }

    const materialIds = data.requiredMaterials.map((item) => item.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      throw new BadRequestException('No se puede repetir un material en la solicitud');
    }

    const materials = await this.prisma.rawMaterial.findMany({ where: { id: { in: materialIds } } });
    if (materials.length !== materialIds.length) {
      throw new NotFoundException('Uno o mas materiales no existen');
    }

    return this.prisma.productionRequest.create({
      data: {
        orderCode: data.orderCode,
        line: data.line,
        processType: data.processType,
        targetProduct: data.targetProduct,
        requestedById,
        materials: { create: data.requiredMaterials },
      },
      include: { materials: { include: { material: true } }, requestedBy: { select: { id: true, name: true } } },
    });
  }

  findAll() {
    return this.prisma.productionRequest.findMany({
      include: { materials: { include: { material: true } }, requestedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.productionRequest.findUnique({
      where: { id },
      include: { materials: { include: { material: true } }, requestedBy: { select: { id: true, name: true } }, scraps: true },
    });
    if (!request) throw new NotFoundException('Solicitud de produccion no encontrada');
    return request;
  }

  async approve(id: string, approvedById: string) {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.productionRequest.findUnique({
        where: { id },
        include: { materials: true },
      });
      if (!request) throw new NotFoundException('Solicitud de produccion no encontrada');
      if (request.status !== 'PENDIENTE') throw new BadRequestException('La solicitud ya fue procesada');

      for (const requestedMaterial of request.materials) {
        const material = await transaction.rawMaterial.findUnique({ where: { id: requestedMaterial.materialId } });
        if (!material || material.currentStockKg < requestedMaterial.quantityKg) {
          throw new BadRequestException(`Stock insuficiente para el material ${requestedMaterial.materialId}`);
        }
      }

      for (const requestedMaterial of request.materials) {
        const material = await transaction.rawMaterial.findUniqueOrThrow({ where: { id: requestedMaterial.materialId } });
        const currentStockKg = material.currentStockKg - requestedMaterial.quantityKg;
        await transaction.rawMaterial.update({
          where: { id: material.id },
          data: { currentStockKg, status: this.calculateStatus(currentStockKg, material.minStockKg) },
        });
        await transaction.stockMovement.create({
          data: {
            type: 'SALIDA',
            quantityKg: requestedMaterial.quantityKg,
            materialId: material.id,
            userId: approvedById,
            productionRequestId: request.id,
            notes: `Despacho de ${request.orderCode}`,
          },
        });
      }

      return transaction.productionRequest.update({
        where: { id },
        data: { status: 'APROBADA' },
        include: { materials: { include: { material: true } } },
      });
    });
  }

  private calculateStatus(currentStockKg: number, minStockKg: number) {
    if (currentStockKg <= minStockKg * 0.5) return 'CRITICO' as const;
    if (currentStockKg <= minStockKg) return 'BAJO' as const;
    return 'OPTIMO' as const;
  }
}
