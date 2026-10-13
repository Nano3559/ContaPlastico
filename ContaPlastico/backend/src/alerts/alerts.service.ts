import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    return this.prisma.stockAlert.findMany({
      where: { resolved: false },
      include: { material: { select: { id: true, code: true, name: true, siloLocation: true } } },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async refreshAlerts() {
    const materials = await this.prisma.rawMaterial.findMany();
    let created = 0;
    let resolved = 0;

    for (const material of materials) {
      const isLow = material.currentStockKg <= material.minStockKg;
      const severity = material.currentStockKg <= material.minStockKg * 0.5 ? 'CRITICAL' : 'WARNING';
      const activeAlert = await this.prisma.stockAlert.findFirst({
        where: { materialId: material.id, resolved: false },
      });

      if (isLow && !activeAlert) {
        await this.prisma.stockAlert.create({
          data: {
            materialId: material.id,
            currentStockKg: material.currentStockKg,
            minStockKg: material.minStockKg,
            severity,
          },
        });
        created += 1;
      } else if (isLow && activeAlert) {
        await this.prisma.stockAlert.update({
          where: { id: activeAlert.id },
          data: { currentStockKg: material.currentStockKg, minStockKg: material.minStockKg, severity },
        });
      } else if (activeAlert) {
        await this.prisma.stockAlert.update({ where: { id: activeAlert.id }, data: { resolved: true } });
        resolved += 1;
      }
    }

    this.logger.log(`Alertas actualizadas: ${created} creadas, ${resolved} resueltas`);
    return { created, resolved, active: (await this.findActive()).length };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runScheduledCheck() {
    await this.refreshAlerts();
  }
}
