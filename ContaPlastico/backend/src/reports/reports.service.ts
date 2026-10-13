import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

interface DateRange { from: Date; to: Date; }

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async monthlyBalance(month: number, year: number) {
    const range = this.getMonthRange(month, year);
    const movements = await this.prisma.stockMovement.findMany({
      where: { createdAt: { gte: range.from, lt: range.to } },
      include: { material: { select: { code: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const rows = this.aggregateMovements(movements);
    return { month, year, rows, totals: this.sumRows(rows) };
  }

  async scrapAnalysis(month?: number, year?: number) {
    const range = month && year ? this.getMonthRange(month, year) : undefined;
    const scraps = await this.prisma.scrapRecord.findMany({
      where: range ? { createdAt: { gte: range.from, lt: range.to } } : undefined,
      include: {
        productionRequest: { select: { orderCode: true, line: true, targetProduct: true } },
        material: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const totalConsumed = scraps.reduce((sum, row) => sum + row.rawMaterialUsedKg, 0);
    const recoverable = scraps.reduce((sum, row) => sum + row.recoverableScrapKg, 0);
    const discarded = scraps.reduce((sum, row) => sum + row.discardScrapKg, 0);
    return {
      filters: { month, year },
      summary: {
        records: scraps.length,
        totalConsumedKg: totalConsumed,
        totalRecoverableKg: recoverable,
        totalDiscardedKg: discarded,
        averageScrapPercentage: totalConsumed ? ((recoverable + discarded) / totalConsumed) * 100 : 0,
      },
      rows: scraps,
    };
  }

  async dashboardKpis() {
    const [materials, received, consumed, scrap] = await Promise.all([
      this.prisma.rawMaterial.findMany({
        select: { currentStockKg: true, minStockKg: true, status: true },
      }),
      this.prisma.batchEntry.aggregate({
        _sum: { quantityKg: true },
      }),
      this.prisma.stockMovement.aggregate({
        where: { type: 'CONSUMO' },
        _sum: { quantityKg: true },
      }),
      this.prisma.scrapRecord.aggregate({
        _sum: { recoverableScrapKg: true, discardScrapKg: true },
      }),
    ]);

    const totalMateriaPrimaKg = materials.reduce((sum, material) => sum + Number(material.currentStockKg || 0), 0);
    const materialesStockBajoCount = materials.filter(
      (material) => material.status === 'BAJO' || material.status === 'CRITICO' || Number(material.currentStockKg || 0) <= Number(material.minStockKg || 0),
    ).length;
    const stockDisponibleKg = Math.max(totalMateriaPrimaKg * 0.8, 0);
    const materiaPrimaRecibidaKg = Number(received._sum.quantityKg || 0);
    const consumoDelMesKg = Number(consumed._sum.quantityKg || 0);
    const mermaDelMesKg = Number(scrap._sum.recoverableScrapKg || 0) + Number(scrap._sum.discardScrapKg || 0);

    return {
      totalMateriaPrimaKg,
      stockDisponibleKg,
      materialesStockBajoCount,
      materiaPrimaRecibidaKg,
      consumoDelMesKg,
      mermaDelMesKg,
    };
  }

  async monthlyBalanceExcel(month: number, year: number) {
    const report = await this.monthlyBalance(month, year);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Balance mensual');
    sheet.columns = [
      { header: 'Codigo', key: 'code', width: 18 },
      { header: 'Materia prima', key: 'name', width: 35 },
      { header: 'Entrada (kg)', key: 'entrada', width: 16 },
      { header: 'Salida (kg)', key: 'salida', width: 16 },
      { header: 'Consumo (kg)', key: 'consumo', width: 16 },
      { header: 'Merma (kg)', key: 'merma', width: 16 },
    ];
    sheet.addRows(report.rows);
    sheet.addRow({ code: 'TOTAL', ...report.totals });
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
    return workbook.xlsx.writeBuffer();
  }

  async scrapAnalysisPdf(month?: number, year?: number): Promise<Buffer> {
    const report = await this.scrapAnalysis(month, year);
    return new Promise((resolve) => {
      const document = new PDFDocument({ margin: 48 });
      const chunks: Buffer[] = [];
      document.on('data', (chunk) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.fontSize(18).text('PlastControl - Analisis de merma');
      document.moveDown();
      document.fontSize(11).text(`Periodo: ${month && year ? `${month}/${year}` : 'Todos'}`);
      document.moveDown();
      document.text(`Registros: ${report.summary.records}`);
      document.text(`Consumo total: ${report.summary.totalConsumedKg.toFixed(2)} kg`);
      document.text(`Merma recuperable: ${report.summary.totalRecoverableKg.toFixed(2)} kg`);
      document.text(`Merma descartada: ${report.summary.totalDiscardedKg.toFixed(2)} kg`);
      document.text(`Porcentaje promedio: ${report.summary.averageScrapPercentage.toFixed(2)}%`);
      document.moveDown();
      report.rows.slice(0, 30).forEach((row) => {
        document.fontSize(9).text(`${row.productionRequest.orderCode} | ${row.material?.code ?? 'N/A'} | ${row.scrapPercentage.toFixed(2)}% | ${row.cause}`);
      });
      document.end();
    });
  }

  private getMonthRange(month: number, year: number): DateRange {
    return { from: new Date(Date.UTC(year, month - 1, 1)), to: new Date(Date.UTC(year, month, 1)) };
  }

  private aggregateMovements(movements: Array<{ type: string; quantityKg: number; material: { code: string; name: string } }>) {
    const grouped = new Map<string, { code: string; name: string; entrada: number; salida: number; consumo: number; merma: number }>();
    for (const movement of movements) {
      const key = movement.material.code;
      const row = grouped.get(key) ?? { code: key, name: movement.material.name, entrada: 0, salida: 0, consumo: 0, merma: 0 };
      const keyName = movement.type.toLowerCase() as 'entrada' | 'salida' | 'consumo' | 'merma';
      row[keyName] += movement.quantityKg;
      grouped.set(key, row);
    }
    return [...grouped.values()];
  }

  private sumRows(rows: Array<{ entrada: number; salida: number; consumo: number; merma: number }>) {
    return rows.reduce((total, row) => ({
      entrada: total.entrada + row.entrada,
      salida: total.salida + row.salida,
      consumo: total.consumo + row.consumo,
      merma: total.merma + row.merma,
    }), { entrada: 0, salida: 0, consumo: 0, merma: 0 });
  }
}
