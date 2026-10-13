import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      rawMaterial: {
        findMany: jest.fn(),
      },
      batchEntry: {
        aggregate: jest.fn(),
      },
      stockMovement: {
        aggregate: jest.fn(),
      },
      scrapRecord: {
        aggregate: jest.fn(),
      },
    };

    service = new ReportsService(prisma);
  });

  it('should build dashboard KPIs from real backend data', async () => {
    prisma.rawMaterial.findMany.mockResolvedValue([
      { currentStockKg: 1500, minStockKg: 2000 },
      { currentStockKg: 900, minStockKg: 1000 },
      { currentStockKg: 5500, minStockKg: 3000 },
    ]);

    prisma.batchEntry.aggregate.mockResolvedValue({ _sum: { quantityKg: 1234 } });
    prisma.stockMovement.aggregate.mockResolvedValue({ _sum: { quantityKg: 890 } });
    prisma.scrapRecord.aggregate.mockResolvedValue({
      _sum: { recoverableScrapKg: 50, discardScrapKg: 30 },
    });

    const result = await service.dashboardKpis();

    expect(result.totalMateriaPrimaKg).toBe(7900);
    expect(result.materialesStockBajoCount).toBe(2);
    expect(result.materiaPrimaRecibidaKg).toBe(1234);
    expect(result.consumoDelMesKg).toBe(890);
    expect(result.mermaDelMesKg).toBe(80);
    expect(result.stockDisponibleKg).toBeGreaterThan(0);
  });
});
