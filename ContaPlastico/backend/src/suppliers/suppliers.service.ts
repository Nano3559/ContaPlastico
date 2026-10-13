import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const count = await this.prisma.supplier.count();
      if (count === 0) {
        await this.prisma.supplier.createMany({
          data: [
            {
              code: 'PROV-BRASKEM',
              name: 'Braskem Idesa S.A.P.I.',
              contactName: 'Roberto Viana',
              email: 'contacto.ventas@braskem.com',
              phone: '+52 55 5000 8000',
            },
            {
              code: 'PROV-DOW',
              name: 'Dow Chemical Company',
              contactName: 'Laura Méndez',
              email: 'resinas.latam@dow.com',
              phone: '+1 800 258 2436',
            },
            {
              code: 'PROV-SABIC',
              name: 'SABIC Petrochemicals',
              contactName: 'Carlos Andrade',
              email: 'orders.sabic@sabic.com',
              phone: '+1 713 555 0199',
            },
            {
              code: 'PROV-PIGMENTOS',
              name: 'Colorants & Masterbatch Corp',
              contactName: 'Mariana Duarte',
              email: 'ventas@colorants.com',
              phone: '+58 212 555 4321',
            },
          ],
        });
        console.log('[SuppliersService] Proveedores iniciales sembrados con éxito.');
      }
    } catch (err) {
      console.warn('[SuppliersService] Error al sembrar proveedores:', err);
    }
  }

  findAll() {
    return this.prisma.supplier.findMany({
      include: { _count: { select: { entries: true, materials: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { entries: { orderBy: { createdAt: 'desc' }, take: 20 }, materials: true },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  create(data: CreateSupplierDto) {
    return this.prisma.supplier.create({ data });
  }

  async update(id: string, data: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.delete({ where: { id } });
  }
}
