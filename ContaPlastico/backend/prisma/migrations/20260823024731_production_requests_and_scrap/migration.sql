-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRADA', 'SALIDA', 'CONSUMO', 'MERMA');

-- AlterTable
ALTER TABLE "ScrapRecord" ADD COLUMN     "materialId" TEXT;

-- CreateTable
CREATE TABLE "ProductionRequestMaterial" (
    "id" TEXT NOT NULL,
    "productionRequestId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionRequestMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productionRequestId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRequestMaterial_productionRequestId_materialId_key" ON "ProductionRequestMaterial"("productionRequestId", "materialId");

-- CreateIndex
CREATE INDEX "StockMovement_materialId_createdAt_idx" ON "StockMovement"("materialId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductionRequestMaterial" ADD CONSTRAINT "ProductionRequestMaterial_productionRequestId_fkey" FOREIGN KEY ("productionRequestId") REFERENCES "ProductionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRequestMaterial" ADD CONSTRAINT "ProductionRequestMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapRecord" ADD CONSTRAINT "ScrapRecord_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productionRequestId_fkey" FOREIGN KEY ("productionRequestId") REFERENCES "ProductionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
