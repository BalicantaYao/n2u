-- CreateTable
CREATE TABLE "EtfHoldingSnapshot" (
    "id" TEXT NOT NULL,
    "fundSymbol" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nav" DOUBLE PRECISION,
    "totalAssets" DOUBLE PRECISION,
    "source" TEXT,

    CONSTRAINT "EtfHoldingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtfHolding" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT,
    "shares" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION,
    "marketValue" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,

    CONSTRAINT "EtfHolding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EtfHoldingSnapshot_fundSymbol_asOfDate_key" ON "EtfHoldingSnapshot"("fundSymbol", "asOfDate");

-- CreateIndex
CREATE INDEX "EtfHoldingSnapshot_fundSymbol_asOfDate_idx" ON "EtfHoldingSnapshot"("fundSymbol", "asOfDate");

-- CreateIndex
CREATE INDEX "EtfHolding_snapshotId_idx" ON "EtfHolding"("snapshotId");

-- CreateIndex
CREATE INDEX "EtfHolding_symbol_idx" ON "EtfHolding"("symbol");

-- AddForeignKey
ALTER TABLE "EtfHolding" ADD CONSTRAINT "EtfHolding_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "EtfHoldingSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
