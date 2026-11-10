const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Definición de Catálogo de Productos y Resinas Asociadas
const PRODUCTS = [
  {
    productCode: 'PREF-PET-28',
    productName: 'Preforma PET 28mm PCO 1881 (24g Cristal)',
    category: 'INYECCION',
    unitWeightKg: 0.024,
    baseUnitPrice: 0.046,
    defaultBatchUnits: { min: 20000, max: 120000 },
    materialCode: 'PP-CP-0330', // Resina termoplástica de referencia
    clientSector: 'Bebidas',
    clients: [
      { name: 'Embotelladora Andina S.A.', region: 'Centro' },
      { name: 'Refrescos del Sur C.A.', region: 'Sur' },
      { name: 'Bebidas del Valle Ltda.', region: 'Occidente' },
      { name: 'Embotelladora Continental', region: 'Norte' },
    ],
    seasonalityProfile: [1.25, 1.20, 1.05, 0.95, 0.90, 0.85, 0.95, 1.00, 1.05, 1.15, 1.30, 1.35], // Ene - Dic
  },
  {
    productCode: 'TAPA-HDPE-28',
    productName: 'Tapa Rosca HDPE 28mm Gasificada Azul (3.5g)',
    category: 'INYECCION',
    unitWeightKg: 0.0035,
    baseUnitPrice: 0.018,
    defaultBatchUnits: { min: 50000, max: 250000 },
    materialCode: 'HDPE-5502',
    clientSector: 'Bebidas',
    clients: [
      { name: 'Embotelladora Andina S.A.', region: 'Centro' },
      { name: 'Cervecería Austral Corp.', region: 'Sur' },
      { name: 'Aguas Minerales Los Andes', region: 'Occidente' },
      { name: 'Refrescos del Sur C.A.', region: 'Sur' },
    ],
    seasonalityProfile: [1.22, 1.18, 1.02, 0.92, 0.88, 0.84, 0.92, 0.98, 1.06, 1.18, 1.28, 1.34],
  },
  {
    productCode: 'TAPA-FLIP-PP',
    productName: 'Tapa Flip-Top PP 38mm Blanca (8.5g)',
    category: 'INYECCION',
    unitWeightKg: 0.0085,
    baseUnitPrice: 0.038,
    defaultBatchUnits: { min: 15000, max: 70000 },
    materialCode: 'PP-CP-0330',
    clientSector: 'Cosméticos',
    clients: [
      { name: 'Cosméticos NaturaLab S.A.', region: 'Centro' },
      { name: 'Laboratorios Farmasur', region: 'Sur' },
      { name: 'Detergentes y Químicos del Norte', region: 'Norte' },
    ],
    seasonalityProfile: [0.95, 0.98, 1.02, 1.05, 1.10, 1.00, 0.95, 0.98, 1.05, 1.10, 1.15, 1.20],
  },
  {
    productCode: 'BIDON-5L-HDPE',
    productName: 'Bidón Industrial 5L HDPE Apilable (240g)',
    category: 'SOPLADO',
    unitWeightKg: 0.240,
    baseUnitPrice: 1.15,
    defaultBatchUnits: { min: 2500, max: 15000 },
    materialCode: 'HDPE-5502',
    clientSector: 'Agroquímicos',
    clients: [
      { name: 'AgroQuímica del Centro S.A.', region: 'Centro' },
      { name: 'Fertilizantes del Valle', region: 'Occidente' },
      { name: 'Lubricantes Industriales S.A.', region: 'Norte' },
      { name: 'Químicos Especiales del Sur', region: 'Sur' },
    ],
    seasonalityProfile: [0.85, 0.90, 1.25, 1.35, 1.30, 1.10, 0.90, 0.85, 1.20, 1.30, 1.15, 0.90],
  },
  {
    productCode: 'BOTELLA-1L-HDPE',
    productName: 'Botella HDPE 1 Litro Boca Ancha Lácteos (42g)',
    category: 'SOPLADO',
    unitWeightKg: 0.042,
    baseUnitPrice: 0.195,
    defaultBatchUnits: { min: 10000, max: 60000 },
    materialCode: 'HDPE-5502',
    clientSector: 'Lácteos',
    clients: [
      { name: 'Lácteos La Pradera S.A.', region: 'Centro' },
      { name: 'Alimentos del Valle C.A.', region: 'Occidente' },
      { name: 'Industrias Lácteas del Sur', region: 'Sur' },
    ],
    seasonalityProfile: [1.02, 1.04, 1.06, 1.00, 0.98, 0.96, 0.99, 1.02, 1.05, 1.08, 1.12, 1.15],
  },
  {
    productCode: 'ENVASE-PP-250ML',
    productName: 'Envase Cosmético PP 250ml Cilíndrico (32g)',
    category: 'SOPLADO',
    unitWeightKg: 0.032,
    baseUnitPrice: 0.165,
    defaultBatchUnits: { min: 8000, max: 45000 },
    materialCode: 'PP-CP-0330',
    clientSector: 'Cosméticos',
    clients: [
      { name: 'Cosméticos NaturaLab S.A.', region: 'Centro' },
      { name: 'Belleza Natural Global', region: 'Norte' },
      { name: 'DermoPharma Internacional', region: 'Exportación' },
    ],
    seasonalityProfile: [0.90, 0.95, 1.00, 1.05, 1.15, 1.05, 0.95, 0.98, 1.05, 1.12, 1.22, 1.25],
  },
  {
    productCode: 'PELICULA-LDPE-TERMO',
    productName: 'Bobina Película Termoencogible LDPE (25kg)',
    category: 'EXTRUSION',
    unitWeightKg: 25.0,
    baseUnitPrice: 58.00,
    defaultBatchUnits: { min: 200, max: 1200 },
    materialCode: 'LDPE-2004',
    clientSector: 'Embalaje',
    clients: [
      { name: 'Embotelladora Andina S.A.', region: 'Centro' },
      { name: 'Cervecería Austral Corp.', region: 'Sur' },
      { name: 'Envasadora Nacional de Granos', region: 'Occidente' },
      { name: 'Logística & Empaques del Norte', region: 'Norte' },
    ],
    seasonalityProfile: [1.10, 1.05, 1.00, 0.95, 0.92, 0.94, 0.98, 1.02, 1.08, 1.15, 1.25, 1.30],
  },
  {
    productCode: 'BOLSA-HDPE-40X60',
    productName: 'Fardo Bolsas Alta Densidad HDPE 40x60 (10kg)',
    category: 'EXTRUSION',
    unitWeightKg: 10.0,
    baseUnitPrice: 26.50,
    defaultBatchUnits: { min: 300, max: 1800 },
    materialCode: 'HDPE-5502',
    clientSector: 'Alimentos',
    clients: [
      { name: 'Supermercados del Norte', region: 'Norte' },
      { name: 'Distribuidora PlasticSur', region: 'Sur' },
      { name: 'Cadenas Retail Central', region: 'Centro' },
    ],
    seasonalityProfile: [1.05, 1.02, 0.98, 0.95, 0.96, 0.98, 1.00, 1.02, 1.06, 1.10, 1.20, 1.28],
  },
  {
    productCode: 'BANDEJA-PP-1L',
    productName: 'Bandeja Termoformada PP 1L Hermética (18g)',
    category: 'TERMOFORMADO',
    unitWeightKg: 0.018,
    baseUnitPrice: 0.088,
    defaultBatchUnits: { min: 25000, max: 130000 },
    materialCode: 'PP-CP-0330',
    clientSector: 'Alimentos',
    clients: [
      { name: 'AgroExport Frutas Frescas', region: 'Exportación' },
      { name: 'Delicias Empacadas S.A.', region: 'Centro' },
      { name: 'Cárnicos del Centro', region: 'Centro' },
    ],
    seasonalityProfile: [0.98, 1.00, 1.05, 1.10, 1.12, 1.08, 1.02, 1.04, 1.08, 1.15, 1.20, 1.22],
  },
];

// Helper pseudo-random con semilla para consistencia pero realismo
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

async function seedSalesData() {
  console.log('🚀 Iniciando Generación de Histórico de Ventas de 2 Años...');

  // 1. Obtener mapas de IDs de RawMaterials existentes
  const materials = await prisma.rawMaterial.findMany();
  const materialMap = {};
  materials.forEach((m) => {
    materialMap[m.code] = m.id;
  });

  // Si no existen algunos materiales, mapear a cualquier resina disponible
  const fallbackMaterialId = materials[0]?.id || null;

  // 2. Definir rango de 2 años (Nov 1, 2024 hasta Oct 26, 2026)
  const startDate = new Date('2024-11-01T08:00:00Z');
  const endDate = new Date('2026-10-26T18:00:00Z');
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  console.log(`📅 Rango de Fechas: ${startDate.toISOString().slice(0, 10)} a ${endDate.toISOString().slice(0, 10)} (${totalDays} días)`);

  const salesRecords = [];
  let saleCounter = 1;
  let seed = 42;

  // Iterar por cada día
  for (let d = 0; d <= totalDays; d++) {
    const currentDate = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
    const dayOfWeek = currentDate.getUTCDay(); // 0 = Domingo, 6 = Sábado
    const month = currentDate.getUTCMonth(); // 0 = Enero, 11 = Diciembre

    // Domingos no hay despachos de ventas (fábrica cerrada/mantenimiento), Sábados volumen reducido
    if (dayOfWeek === 0) continue;

    // Número de transacciones comerciales ese día (2 a 5 de lunes a viernes, 1 a 2 los sábados)
    const dailyTransCount = dayOfWeek === 6 ? (seededRandom(seed++) > 0.5 ? 1 : 2) : Math.floor(seededRandom(seed++) * 3) + 2;

    // Crecimiento anual compuesto interanual (~9% anual)
    const yearProgress = d / 365;
    const trendMultiplier = 1.0 + yearProgress * 0.09;

    for (let t = 0; t < dailyTransCount; t++) {
      // Elegir un producto con ponderación
      const prodIndex = Math.floor(seededRandom(seed++) * PRODUCTS.length);
      const product = PRODUCTS[prodIndex];

      // Factor de estacionalidad mensual
      const seasonalFactor = product.seasonalityProfile[month] || 1.0;

      // Ruido estocástico aleatorio (-12% a +14%)
      const noiseFactor = 0.88 + seededRandom(seed++) * 0.26;

      // Calcular unidades vendidas
      const minU = product.defaultBatchUnits.min;
      const maxU = product.defaultBatchUnits.max;
      const baseUnits = minU + seededRandom(seed++) * (maxU - minU);
      
      const adjustedUnits = Math.round(baseUnits * seasonalFactor * trendMultiplier * noiseFactor);
      const quantityUnits = Math.max(10, adjustedUnits);

      // Peso total en kg
      const totalWeightKg = Number((quantityUnits * product.unitWeightKg).toFixed(2));

      // Fluctuación ligera de precio unitario (+/- 3%)
      const priceJitter = 0.97 + seededRandom(seed++) * 0.06;
      const unitPrice = Number((product.baseUnitPrice * priceJitter).toFixed(4));
      const totalAmount = Number((quantityUnits * unitPrice).toFixed(2));

      // Cliente y Región
      const clientIdx = Math.floor(seededRandom(seed++) * product.clients.length);
      const client = product.clients[clientIdx];

      // Código de Venta
      const yearStr = currentDate.getUTCFullYear();
      const codeStr = `VTA-${yearStr}-${String(saleCounter).padStart(5, '0')}`;
      saleCounter++;

      // Clasificación de estacionalidad
      let seasonality = 'MEDIA';
      if (seasonalFactor >= 1.15) seasonality = 'ALTA';
      else if (seasonalFactor <= 0.92) seasonality = 'BAJA';
      if (month === 11 || (month === 0 && seasonalFactor > 1.2)) seasonality = 'PICO_FIN_ANO';

      // Hora simulada de transacción entre 08:30 y 17:45
      const hour = 8 + Math.floor(seededRandom(seed++) * 9);
      const minute = Math.floor(seededRandom(seed++) * 60);
      const transactionDate = new Date(currentDate);
      transactionDate.setUTCHours(hour, minute, 0, 0);

      salesRecords.push({
        saleCode: codeStr,
        saleDate: transactionDate,
        productCode: product.productCode,
        productName: product.productName,
        category: product.category,
        clientName: client.name,
        clientSector: product.clientSector,
        clientRegion: client.region,
        quantityUnits,
        unitWeightKg: product.unitWeightKg,
        totalWeightKg,
        unitPrice,
        totalAmount,
        rawMaterialId: materialMap[product.materialCode] || fallbackMaterialId,
        seasonality,
        status: 'COMPLETADA',
      });
    }
  }

  console.log(`✅ Total de Registros de Venta Generados: ${salesRecords.length}`);

  // 3. Limpiar ventas previas si existen para un reseed limpio y sin duplicados
  const deleted = await prisma.saleRecord.deleteMany();
  console.log(`🧹 Registros de ventas antiguos eliminados: ${deleted.count}`);

  // 4. Inserción masiva en chunks de 250 para máxima velocidad y estabilidad
  const chunkSize = 250;
  for (let i = 0; i < salesRecords.length; i += chunkSize) {
    const chunk = salesRecords.slice(i, i + chunkSize);
    await prisma.saleRecord.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    process.stdout.write(`  -> Guardando en BD: ${Math.min(i + chunkSize, salesRecords.length)} / ${salesRecords.length}...\r`);
  }
  console.log('\n🎉 Todos los registros de ventas fueron insertados con éxito en PostgreSQL.');

  // 5. Generar Archivo CSV
  console.log('📄 Generando Archivo .CSV con UTF-8 BOM para Excel y pipelines de ML...');
  
  // Encabezados en español con estándares de la industria del plástico
  const csvHeaders = [
    'Codigo_Venta',
    'Fecha',
    'Ano',
    'Mes',
    'Semana_Ano',
    'Dia_Semana',
    'Codigo_Producto',
    'Nombre_Producto',
    'Proceso_Transformacion',
    'Cliente',
    'Sector_Cliente',
    'Region_Cliente',
    'Cantidad_Unidades',
    'Peso_Unitario_Kg',
    'Total_Peso_Plastico_Kg',
    'Precio_Unitario_USD',
    'Monto_Total_Facturado_USD',
    'Estacionalidad',
    'Estado_Orden'
  ];

  let csvContent = '\uFEFF' + csvHeaders.join(',') + '\n';

  salesRecords.forEach((r) => {
    const d = new Date(r.saleDate);
    const ano = d.getUTCFullYear();
    const mes = d.getUTCMonth() + 1;
    
    // Calcular número de semana ISO
    const firstDayOfYear = new Date(Date.UTC(ano, 0, 1));
    const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
    const semana = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
    const diaSemana = d.getUTCDay();

    const row = [
      `"${r.saleCode}"`,
      `"${d.toISOString().slice(0, 10)}"`,
      ano,
      mes,
      semana,
      diaSemana,
      `"${r.productCode}"`,
      `"${r.productName.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${r.clientName.replace(/"/g, '""')}"`,
      `"${r.clientSector || ''}"`,
      `"${r.clientRegion || ''}"`,
      r.quantityUnits,
      r.unitWeightKg,
      r.totalWeightKg,
      r.unitPrice,
      r.totalAmount,
      `"${r.seasonality}"`,
      `"${r.status}"`
    ];

    csvContent += row.join(',') + '\n';
  });

  // Guardar en 3 ubicaciones estratégicas:
  // 1. backend/data/demand_sales_history_2years.csv
  // 2. frontend-web/public/demand_sales_history_2years.csv (para descarga directa)
  // 3. Raíz del monorepo ./demand_sales_history_2years.csv
  const backendDataDir = path.resolve(__dirname, '..', 'data');
  if (!fs.existsSync(backendDataDir)) {
    fs.mkdirSync(backendDataDir, { recursive: true });
  }

  const backendCsvPath = path.join(backendDataDir, 'demand_sales_history_2years.csv');
  fs.writeFileSync(backendCsvPath, csvContent, 'utf-8');
  console.log(`💾 CSV guardado en backend: ${backendCsvPath} (${(fs.statSync(backendCsvPath).size / 1024).toFixed(1)} KB)`);

  const frontendPublicDir = path.resolve(__dirname, '..', '..', 'frontend-web', 'public');
  if (fs.existsSync(frontendPublicDir)) {
    const frontendCsvPath = path.join(frontendPublicDir, 'demand_sales_history_2years.csv');
    fs.writeFileSync(frontendCsvPath, csvContent, 'utf-8');
    console.log(`💾 CSV guardado en frontend público: ${frontendCsvPath}`);
  }

  const rootCsvPath = path.resolve(__dirname, '..', '..', 'demand_sales_history_2years.csv');
  fs.writeFileSync(rootCsvPath, csvContent, 'utf-8');
  console.log(`💾 CSV guardado en raíz del proyecto: ${rootCsvPath}`);

  console.log('✅ Proceso completado exitosamente.');
}

seedSalesData()
  .catch((err) => {
    console.error('❌ Error en seed de ventas:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
