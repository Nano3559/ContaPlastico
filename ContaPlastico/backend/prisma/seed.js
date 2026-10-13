const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);

  const users = [
    ['carlos.mendoza@plastcontrol.com', 'Carlos Mendoza', 'ADMIN', 'General'],
    ['jorge.ramirez@plastcontrol.com', 'Jorge Ramirez', 'ALMACEN', 'Manana'],
    ['mario.paredes@plastcontrol.com', 'Mario Paredes', 'PRODUCCION', 'Tarde'],
    ['elena.torres@plastcontrol.com', 'Elena Torres', 'SUPERVISOR', 'Noche'],
  ];

  const userMap = {};
  for (const [email, name, role, shift] of users) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, role, shift },
      create: { email, password, name, role, shift },
    });
    userMap[email] = user.id;
  }

  const suppliers = [
    ['PROV-BRASKEM', 'Braskem Idesa S.A.P.I.', 'Roberto Viana', 'contacto.ventas@braskem.com', '+52 55 5000 8000'],
    ['PROV-DOW', 'Dow Chemical Company', 'Laura Mendez', 'resinas.latam@dow.com', '+1 800 258 2436'],
    ['PROV-SABIC', 'SABIC Petrochemicals', 'Carlos Andrade', 'orders.sabic@sabic.com', '+1 713 555 0199'],
    ['PROV-PIGMENTOS', 'Colorants & Masterbatch Corp', 'Mariana Duarte', 'ventas@colorants.com', '+58 212 555 4321'],
  ];

  const supplierMap = {};
  for (const [code, name, contactName, email, phone] of suppliers) {
    const supplier = await prisma.supplier.upsert({
      where: { code },
      update: { name, contactName, email, phone },
      create: { code, name, contactName, email, phone },
    });
    supplierMap[code] = supplier.id;
  }

  const rawMaterials = [
    {
      code: 'HDPE-5502',
      name: 'Polietileno de Alta Densidad (HDPE)',
      type: 'RESINA',
      category: 'SOPLADO',
      density: 0.955,
      meltFlowIndex: 0.35,
      unit: 'KG',
      currentStockKg: 14500,
      minStockKg: 3000,
      maxCapacityKg: 25000,
      siloLocation: 'Silo A-01',
      status: 'OPTIMO',
      supplierCode: 'PROV-BRASKEM',
    },
    {
      code: 'PP-CP-0330',
      name: 'Polipropileno Copolímero (PP-CP)',
      type: 'RESINA',
      category: 'INYECCION',
      density: 0.905,
      meltFlowIndex: 30,
      unit: 'KG',
      currentStockKg: 1800,
      minStockKg: 2500,
      maxCapacityKg: 20000,
      siloLocation: 'Silo B-02',
      status: 'BAJO',
      supplierCode: 'PROV-SABIC',
    },
    {
      code: 'LDPE-2004',
      name: 'Polietileno de Baja Densidad (LDPE)',
      type: 'RESINA',
      category: 'EXTRUSION',
      density: 0.922,
      meltFlowIndex: 2,
      unit: 'KG',
      currentStockKg: 8500,
      minStockKg: 2000,
      maxCapacityKg: 18000,
      siloLocation: 'Silo A-02',
      status: 'OPTIMO',
      supplierCode: 'PROV-DOW',
    },
    {
      code: 'MB-BLK-901',
      name: 'Masterbatch Negro Rutilo 40%',
      type: 'MASTERBATCH',
      category: 'EXTRUSION',
      density: 1.15,
      meltFlowIndex: 12,
      unit: 'KG',
      currentStockKg: 450,
      minStockKg: 500,
      maxCapacityKg: 2000,
      siloLocation: 'Almacén 2 - Racks',
      status: 'BAJO',
      supplierCode: 'PROV-PIGMENTOS',
    },
    {
      code: 'REC-HDPE-MOL',
      name: 'HDPE Recuperado (Molienda Interna)',
      type: 'RECUPERADO',
      category: 'EXTRUSION',
      density: 0.95,
      meltFlowIndex: 0.45,
      unit: 'KG',
      currentStockKg: 3200,
      minStockKg: 1000,
      maxCapacityKg: 10000,
      siloLocation: 'Silo R-01',
      status: 'OPTIMO',
      supplierCode: 'PROV-BRASKEM',
    },
  ];

  const materialMap = {};
  for (const material of rawMaterials) {
    const rawMaterial = await prisma.rawMaterial.upsert({
      where: { code: material.code },
      update: {
        name: material.name,
        type: material.type,
        category: material.category,
        density: material.density,
        meltFlowIndex: material.meltFlowIndex,
        unit: material.unit,
        currentStockKg: material.currentStockKg,
        minStockKg: material.minStockKg,
        maxCapacityKg: material.maxCapacityKg,
        siloLocation: material.siloLocation,
        status: material.status,
        supplierId: supplierMap[material.supplierCode],
      },
      create: {
        code: material.code,
        name: material.name,
        type: material.type,
        category: material.category,
        density: material.density,
        meltFlowIndex: material.meltFlowIndex,
        unit: material.unit,
        currentStockKg: material.currentStockKg,
        minStockKg: material.minStockKg,
        maxCapacityKg: material.maxCapacityKg,
        siloLocation: material.siloLocation,
        status: material.status,
        supplierId: supplierMap[material.supplierCode],
      },
    });
    materialMap[material.code] = rawMaterial.id;
  }

  const sampleEntries = [
    {
      entryCode: 'ENT-2026-001',
      materialCode: 'HDPE-5502',
      supplierCode: 'PROV-BRASKEM',
      supplierBatch: 'LOTE-BRK-8849',
      quantityKg: 4200,
      invoiceNumber: 'FAC-2026-9901',
      siloDestination: 'Silo A-01',
      qualityCertificate: true,
      notes: 'Inspección conforme',
      receivedByEmail: 'jorge.ramirez@plastcontrol.com',
    },
    {
      entryCode: 'ENT-2026-002',
      materialCode: 'LDPE-2004',
      supplierCode: 'PROV-DOW',
      supplierBatch: 'LOTE-DOW-2210',
      quantityKg: 3500,
      invoiceNumber: 'FAC-2026-9910',
      siloDestination: 'Silo A-02',
      qualityCertificate: true,
      notes: 'Carga con certificado de calidad',
      receivedByEmail: 'jorge.ramirez@plastcontrol.com',
    },
  ];

  for (const entry of sampleEntries) {
    const existing = await prisma.batchEntry.findUnique({ where: { entryCode: entry.entryCode } });
    if (!existing) {
      await prisma.batchEntry.create({
        data: {
          entryCode: entry.entryCode,
          materialId: materialMap[entry.materialCode],
          supplierId: supplierMap[entry.supplierCode],
          supplierBatch: entry.supplierBatch,
          quantityKg: entry.quantityKg,
          invoiceNumber: entry.invoiceNumber,
          siloDestination: entry.siloDestination,
          qualityCertificate: entry.qualityCertificate,
          notes: entry.notes,
          receivedById: userMap[entry.receivedByEmail],
        },
      });
    }
  }

  const sampleRequests = [
    {
      orderCode: 'OP-2026-101',
      line: 'Línea de Extrusión 01',
      processType: 'EXTRUSION',
      targetProduct: 'Bolsa reforzada 40x50',
      requestedByEmail: 'mario.paredes@plastcontrol.com',
      materials: [
        { materialCode: 'HDPE-5502', quantityKg: 1200 },
        { materialCode: 'MB-BLK-901', quantityKg: 80 },
      ],
    },
    {
      orderCode: 'OP-2026-102',
      line: 'Línea de Inyección 02',
      processType: 'INYECCION',
      targetProduct: 'Tapón industrial 28 mm',
      requestedByEmail: 'mario.paredes@plastcontrol.com',
      materials: [
        { materialCode: 'PP-CP-0330', quantityKg: 900 },
      ],
    },
  ];

  for (const request of sampleRequests) {
    const existing = await prisma.productionRequest.findUnique({ where: { orderCode: request.orderCode } });
    if (!existing) {
      await prisma.productionRequest.create({
        data: {
          orderCode: request.orderCode,
          line: request.line,
          processType: request.processType,
          targetProduct: request.targetProduct,
          requestedById: userMap[request.requestedByEmail],
          status: 'APROBADA',
          materials: {
            create: request.materials.map((item) => ({
              materialId: materialMap[item.materialCode],
              quantityKg: item.quantityKg,
            })),
          },
        },
      });
    }
  }

  const totalMaterials = await prisma.rawMaterial.count();
  const totalSuppliers = await prisma.supplier.count();
  const totalEntries = await prisma.batchEntry.count();
  const totalRequests = await prisma.productionRequest.count();
  console.log(`Usuarios disponibles: ${users.length}; proveedores disponibles: ${totalSuppliers}; materias primas disponibles: ${totalMaterials}; entradas registradas: ${totalEntries}; solicitudes creadas: ${totalRequests}`);
}

main().finally(() => prisma.$disconnect());
