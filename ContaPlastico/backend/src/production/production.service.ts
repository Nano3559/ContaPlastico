import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScrapDto } from './dto/create-scrap.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  async registerScrap(data: CreateScrapDto, operatorId: string) {
    const totalOutput = data.producedGoodKg + data.scrapRecoverableKg + data.scrapDiscardKg;
    if (data.consumedRawMaterialKg < totalOutput) {
      throw new BadRequestException('El consumo no puede ser menor que la produccion y la merma registrada');
    }

    const request = await this.prisma.productionRequest.findFirst({
      where: { OR: [{ id: data.productionOrderId }, { orderCode: data.productionOrderId }] },
      include: { materials: true },
    });
    if (!request) throw new NotFoundException('Orden de produccion no encontrada');
    if (request.status !== 'APROBADA' && request.status !== 'COMPLETADA') {
      throw new BadRequestException('La orden debe estar aprobada antes de registrar consumo');
    }

    const scrapPercentage = data.consumedRawMaterialKg === 0
      ? 0
      : ((data.scrapRecoverableKg + data.scrapDiscardKg) / data.consumedRawMaterialKg) * 100;

    return this.prisma.$transaction(async (transaction) => {
      const material = data.materialId
        ? await transaction.rawMaterial.findUnique({ where: { id: data.materialId } })
        : null;

      if (data.materialId && !material) {
        throw new NotFoundException('Materia prima del consumo no encontrada');
      }

      if (material && material.currentStockKg < data.consumedRawMaterialKg) {
        throw new BadRequestException('Stock insuficiente para registrar el consumo');
      }

      const record = await transaction.scrapRecord.create({
        data: {
          productionRequestId: request.id,
          materialId: data.materialId,
          rawMaterialUsedKg: data.consumedRawMaterialKg,
          finishedProductKg: data.producedGoodKg,
          recoverableScrapKg: data.scrapRecoverableKg,
          discardScrapKg: data.scrapDiscardKg,
          scrapPercentage,
          cause: data.cause,
          operatorId,
        },
        include: { productionRequest: true, material: true, operator: { select: { id: true, name: true } } },
      });

      await transaction.productionRequest.update({
        where: { id: request.id },
        data: { status: 'COMPLETADA' },
      });

      if (material) {
        const nextStockKg = material.currentStockKg - data.consumedRawMaterialKg + data.scrapRecoverableKg;
        await transaction.rawMaterial.update({
          where: { id: material.id },
          data: {
            currentStockKg: nextStockKg,
            status: this.calculateStatus(nextStockKg, material.minStockKg),
          },
        });

        await transaction.stockMovement.create({
          data: {
            type: 'CONSUMO',
            quantityKg: data.consumedRawMaterialKg,
            materialId: material.id,
            userId: operatorId,
            productionRequestId: request.id,
            notes: `Consumo de ${request.orderCode}`,
          },
        });
      }

      if (data.scrapRecoverableKg > 0 && data.materialId) {
        await transaction.stockMovement.create({
          data: {
            type: 'MERMA',
            quantityKg: data.scrapRecoverableKg,
            materialId: data.materialId,
            userId: operatorId,
            productionRequestId: request.id,
            notes: `Merma recuperable de ${request.orderCode}`,
          },
        });
      }

      return record;
    });
  }

  findAllScrap() {
    return this.prisma.scrapRecord.findMany({
      include: { productionRequest: true, material: true, operator: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private calculateStatus(currentStockKg: number, minStockKg: number) {
    if (currentStockKg <= minStockKg * 0.5) return 'CRITICO' as const;
    if (currentStockKg <= minStockKg) return 'BAJO' as const;
    return 'OPTIMO' as const;
  }
}
