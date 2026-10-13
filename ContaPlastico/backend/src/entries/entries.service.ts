import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntryDto } from './dto/create-entry.dto';

@Injectable()
export class EntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEntryDto, receivedById: string) {
    return this.prisma.$transaction(async (transaction) => {
      const material = await transaction.rawMaterial.findUnique({
        where: { id: data.materialId },
      });

      if (!material) throw new NotFoundException('Materia prima no encontrada');

      if (data.supplierId) {
        const supplier = await transaction.supplier.findUnique({
          where: { id: data.supplierId },
        });
        if (!supplier) throw new NotFoundException('Proveedor no encontrado');
      }

      const nextStock = material.currentStockKg + data.quantityKg;
      if (nextStock > material.maxCapacityKg) {
        throw new BadRequestException(
          `La entrada supera la capacidad maxima de ${material.maxCapacityKg} kg`,
        );
      }

      const entryCount = await transaction.batchEntry.count();
      const entryCode = `ENT-${new Date().getFullYear()}-${String(entryCount + 1).padStart(4, '0')}`;
      const nextStatus = this.calculateStatus(nextStock, material.minStockKg);

      const entry = await transaction.batchEntry.create({
        data: {
          entryCode,
          materialId: data.materialId,
          supplierId: data.supplierId,
          supplierBatch: data.supplierBatchNumber,
          quantityKg: data.quantityKg,
          invoiceNumber: data.invoiceNumber,
          siloDestination: data.siloOrWarehouseLocation,
          qualityCertificate: data.qualityCertificate ?? true,
          notes: data.operatorNotes,
          receivedById,
        },
        include: { material: true, supplier: true, receivedBy: { select: { id: true, name: true, email: true } } },
      });

      await transaction.rawMaterial.update({
        where: { id: material.id },
        data: {
          currentStockKg: nextStock,
          status: nextStatus,
        },
      });

      await transaction.stockMovement.create({
        data: {
          type: 'ENTRADA',
          quantityKg: data.quantityKg,
          materialId: material.id,
          userId: receivedById,
          notes: `Entrada ${entryCode}`,
        },
      });

      return entry;
    });
  }

  async findAll() {
    return this.prisma.batchEntry.findMany({
      include: { material: true, supplier: true, receivedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.batchEntry.findUnique({
      where: { id },
      include: { material: true, supplier: true, receivedBy: { select: { id: true, name: true } } },
    });

    if (!entry) throw new NotFoundException('Entrada no encontrada');
    return entry;
  }

  private calculateStatus(currentStockKg: number, minStockKg: number) {
    if (currentStockKg <= minStockKg * 0.5) return 'CRITICO' as const;
    if (currentStockKg <= minStockKg) return 'BAJO' as const;
    return 'OPTIMO' as const;
  }
}
