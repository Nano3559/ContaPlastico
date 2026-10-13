import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { MaterialType, Prisma, ProcessType, StockStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';

export interface RawMaterialFilters {
  search?: string;
  type?: MaterialType;
  minStockAlert?: boolean;
}

@Injectable()
export class RawMaterialsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const count = await this.prisma.rawMaterial.count();
      if (count === 0) {
        await this.prisma.rawMaterial.createMany({
          data: [
            {
              code: 'HDPE-5502',
              name: 'Polietileno de Alta Densidad (HDPE)',
              type: MaterialType.RESINA,
              category: ProcessType.SOPLADO,
              density: 0.955,
              meltFlowIndex: 0.35,
              unit: 'KG',
              currentStockKg: 14500,
              minStockKg: 3000,
              maxCapacityKg: 25000,
              siloLocation: 'Silo A-01',
              status: StockStatus.OPTIMO,
            },
            {
              code: 'PP-CP-0330',
              name: 'Polipropileno Copolímero (PP-CP)',
              type: MaterialType.RESINA,
              category: ProcessType.INYECCION,
              density: 0.905,
              meltFlowIndex: 30.0,
              unit: 'KG',
              currentStockKg: 1800,
              minStockKg: 2500,
              maxCapacityKg: 20000,
              siloLocation: 'Silo B-02',
              status: StockStatus.BAJO,
            },
            {
              code: 'LDPE-2004',
              name: 'Polietileno de Baja Densidad (LDPE)',
              type: MaterialType.RESINA,
              category: ProcessType.EXTRUSION,
              density: 0.922,
              meltFlowIndex: 2.0,
              unit: 'KG',
              currentStockKg: 8500,
              minStockKg: 2000,
              maxCapacityKg: 18000,
              siloLocation: 'Silo A-02',
              status: StockStatus.OPTIMO,
            },
            {
              code: 'MB-BLK-901',
              name: 'Masterbatch Negro Rutilo 40%',
              type: MaterialType.MASTERBATCH,
              category: ProcessType.EXTRUSION,
              density: 1.15,
              meltFlowIndex: 12.0,
              unit: 'KG',
              currentStockKg: 450,
              minStockKg: 500,
              maxCapacityKg: 2000,
              siloLocation: 'Almacén 2 - Racks',
              status: StockStatus.BAJO,
            },
            {
              code: 'REC-HDPE-MOL',
              name: 'HDPE Recuperado (Molienda Interna)',
              type: MaterialType.RECUPERADO,
              category: ProcessType.EXTRUSION,
              density: 0.95,
              meltFlowIndex: 0.45,
              unit: 'KG',
              currentStockKg: 3200,
              minStockKg: 1000,
              maxCapacityKg: 10000,
              siloLocation: 'Silo R-01',
              status: StockStatus.OPTIMO,
            },
          ],
        });
        console.log('[RawMaterialsService] Materias primas iniciales sembradas con éxito.');
      }
    } catch (err) {
      console.warn('[RawMaterialsService] Error al sembrar materias primas:', err);
    }
  }

  async findAll(filters: RawMaterialFilters = {}) {
    const where: Prisma.RawMaterialWhereInput = {};

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.type) where.type = filters.type;

    const materials = await this.prisma.rawMaterial.findMany({
      where,
      include: { supplier: true },
      orderBy: { name: 'asc' },
    });

    return filters.minStockAlert
      ? materials.filter((material) => material.currentStockKg <= material.minStockKg)
      : materials;
  }

  async findOne(id: string) {
    const material = await this.prisma.rawMaterial.findUnique({
      where: { id },
      include: { supplier: true, entries: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    if (!material) throw new NotFoundException('Materia prima no encontrada');
    return material;
  }

  async create(data: CreateRawMaterialDto) {
    return this.prisma.rawMaterial.create({
      data: {
        ...data,
        type: data.type ?? MaterialType.RESINA,
        category: data.category ?? ProcessType.EXTRUSION,
        unit: data.unit ?? 'KG',
        currentStockKg: data.currentStockKg ?? 0,
        minStockKg: data.minStockKg ?? 1000,
        maxCapacityKg: data.maxCapacityKg ?? 20000,
        status: this.calculateStatus(data.currentStockKg ?? 0, data.minStockKg ?? 1000),
      },
    });
  }

  async update(id: string, data: UpdateRawMaterialDto) {
    await this.findOne(id);
    const current = await this.prisma.rawMaterial.findUniqueOrThrow({ where: { id } });
    const minStockKg = data.minStockKg ?? current.minStockKg;
    const currentStockKg = data.currentStockKg ?? current.currentStockKg;

    return this.prisma.rawMaterial.update({
      where: { id },
      data: {
        ...data,
        status: this.calculateStatus(currentStockKg, minStockKg),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.rawMaterial.delete({ where: { id } });
  }

  calculateStatus(currentStockKg: number, minStockKg: number): StockStatus {
    if (currentStockKg <= minStockKg * 0.5) return StockStatus.CRITICO;
    if (currentStockKg <= minStockKg) return StockStatus.BAJO;
    return StockStatus.OPTIMO;
  }
}
