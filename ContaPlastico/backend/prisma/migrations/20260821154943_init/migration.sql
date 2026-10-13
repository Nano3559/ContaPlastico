-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('RESINA', 'MASTERBATCH', 'ADITIVO', 'RECUPERADO');

-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('EXTRUSION', 'INYECCION', 'SOPLADO', 'TERMOFORMADO');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('OPTIMO', 'BAJO', 'CRITICO');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'COMPLETADA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PRODUCCION',
    "shift" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMaterial" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL DEFAULT 'RESINA',
    "category" "ProcessType" NOT NULL DEFAULT 'EXTRUSION',
    "density" DOUBLE PRECISION NOT NULL,
    "meltFlowIndex" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "currentStockKg" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "minStockKg" DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
    "maxCapacityKg" DOUBLE PRECISION NOT NULL DEFAULT 20000.0,
    "siloLocation" TEXT NOT NULL,
    "status" "StockStatus" NOT NULL DEFAULT 'OPTIMO',
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchEntry" (
    "id" TEXT NOT NULL,
    "entryCode" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierBatch" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "siloDestination" TEXT NOT NULL,
    "qualityCertificate" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "receivedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRequest" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "processType" "ProcessType" NOT NULL DEFAULT 'EXTRUSION',
    "targetProduct" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapRecord" (
    "id" TEXT NOT NULL,
    "productionRequestId" TEXT NOT NULL,
    "rawMaterialUsedKg" DOUBLE PRECISION NOT NULL,
    "finishedProductKg" DOUBLE PRECISION NOT NULL,
    "recoverableScrapKg" DOUBLE PRECISION NOT NULL,
    "discardScrapKg" DOUBLE PRECISION NOT NULL,
    "scrapPercentage" DOUBLE PRECISION NOT NULL,
    "cause" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "currentStockKg" DOUBLE PRECISION NOT NULL,
    "minStockKg" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RawMaterial_code_key" ON "RawMaterial"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BatchEntry_entryCode_key" ON "BatchEntry"("entryCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRequest_orderCode_key" ON "ProductionRequest"("orderCode");

-- AddForeignKey
ALTER TABLE "RawMaterial" ADD CONSTRAINT "RawMaterial_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchEntry" ADD CONSTRAINT "BatchEntry_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchEntry" ADD CONSTRAINT "BatchEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchEntry" ADD CONSTRAINT "BatchEntry_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRequest" ADD CONSTRAINT "ProductionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapRecord" ADD CONSTRAINT "ScrapRecord_productionRequestId_fkey" FOREIGN KEY ("productionRequestId") REFERENCES "ProductionRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapRecord" ADD CONSTRAINT "ScrapRecord_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
