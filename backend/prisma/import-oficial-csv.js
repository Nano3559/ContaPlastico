const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const PRODUCT_RESIN_MAP = {
  'PREF-PET-28': 'PP-CP-0330',
  'TAPA-HDPE-28': 'HDPE-5502',
  'TAPA-FLIP-PP': 'PP-CP-0330',
  'BIDON-5L-HDPE': 'HDPE-5502',
  'BOTELLA-1L-HDPE': 'HDPE-5502',
  'ENVASE-PP-250ML': 'PP-CP-0330',
  'PELICULA-LDPE-TERMO': 'LDPE-2004',
  'BOLSA-HDPE-40X60': 'HDPE-5502',
  'BANDEJA-PP-1L': 'PP-CP-0330',
};

async function importOficialSalesData() {
  console.log('🚀 Iniciando importación del Dataset Oficial de Ventas (demand_sales_history_Oficial.csv)...');

  // 1. Localizar archivo CSV oficial
  const possiblePaths = [
    path.resolve(__dirname, '..', '..', 'Dataset_IA_Predictiva', 'demand_sales_history_Oficial.csv'),
    path.resolve(__dirname, '..', 'data', 'demand_sales_history_Oficial.csv'),
    path.resolve(__dirname, '..', '..', 'demand_sales_history_Oficial.csv'),
  ];

  let csvPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    throw new Error('No se encontró el archivo demand_sales_history_Oficial.csv en ninguna de las rutas esperadas.');
  }

  console.log(`📁 Leyendo archivo fuente: ${csvPath}`);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.trim().split('\n');
  const header = lines[0].split(',').map((h) => h.trim());
  console.log(`📊 Total de líneas en CSV: ${lines.length} (1 encabezado + ${lines.length - 1} registros de ventas)`);

  // 2. Obtener materias primas en PostgreSQL para asociar rawMaterialId
  const rawMaterials = await prisma.rawMaterial.findMany({
    select: { id: true, code: true },
  });
  const materialMap = {};
  rawMaterials.forEach((m) => {
    materialMap[m.code] = m.id;
  });
  const fallbackMaterialId = rawMaterials[0]?.id || null;

  // 3. Parsear registros
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Manejar comas dentro de comillas si hubiera
    const row = line.split(',');
    const saleCode = row[0].trim();
    const saleDateStr = row[1].trim();
    const productCode = row[6].trim();
    const productName = row[7].trim();
    const category = row[8].trim();
    const clientName = row[9].trim();
    const clientSector = row[10] ? row[10].trim() : null;
    const clientRegion = row[11] ? row[11].trim() : null;
    const quantityUnits = parseInt(row[12], 10) || 0;
    const unitWeightKg = parseFloat(row[13]) || 0;
    const totalWeightKg = parseFloat(row[14]) || 0;
    const unitPrice = parseFloat(row[15]) || 0;
    const totalAmount = parseFloat(row[16]) || 0;
    const seasonality = row[17] ? row[17].trim() : 'MEDIA';
    const status = row[18] ? row[18].trim() : 'COMPLETADA';

    const resinCode = PRODUCT_RESIN_MAP[productCode] || 'HDPE-5502';
    const rawMaterialId = materialMap[resinCode] || fallbackMaterialId;

    records.push({
      saleCode,
      saleDate: new Date(`${saleDateStr}T12:00:00Z`),
      productCode,
      productName,
      category,
      clientName,
      clientSector,
      clientRegion,
      quantityUnits,
      unitWeightKg,
      totalWeightKg,
      unitPrice,
      totalAmount,
      rawMaterialId,
      seasonality,
      status,
    });
  }

  console.log(`✨ ${records.length} registros listos para inserción en PostgreSQL.`);

  // 4. Limpiar tabla previa
  const delRes = await prisma.saleRecord.deleteMany();
  console.log(`🧹 Registros eliminados de PostgreSQL: ${delRes.count}`);

  // 5. Inserción masiva en chunks de 250
  const chunkSize = 250;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await prisma.saleRecord.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`  -> Insertados ${Math.min(i + chunkSize, records.length)} de ${records.length}...`);
  }

  const finalCount = await prisma.saleRecord.count();
  console.log(`🎉 ¡ÉXITO! Total de registros confirmados en PostgreSQL (SaleRecord): ${finalCount}`);

  // 6. Copiar el archivo CSV oficial a todas las carpetas correspondientes
  const targets = [
    path.resolve(__dirname, '..', 'data', 'demand_sales_history_Oficial.csv'),
    path.resolve(__dirname, '..', 'data', 'demand_sales_history_2years.csv'),
    path.resolve(__dirname, '..', '..', 'frontend-web', 'public', 'demand_sales_history_Oficial.csv'),
    path.resolve(__dirname, '..', '..', 'frontend-web', 'public', 'demand_sales_history_2years.csv'),
    path.resolve(__dirname, '..', '..', 'demand_sales_history_Oficial.csv'),
    path.resolve(__dirname, '..', '..', 'demand_sales_history_2years.csv'),
  ];

  targets.forEach((dest) => {
    try {
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(csvPath, dest);
      console.log(`📋 Copiado CSV oficial a: ${dest}`);
    } catch (e) {
      console.warn(`No se pudo copiar a ${dest}:`, e.message);
    }
  });

  console.log('✅ Importación y sincronización finalizada con éxito.');
}

importOficialSalesData()
  .catch((err) => {
    console.error('❌ Error durante la importación:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

