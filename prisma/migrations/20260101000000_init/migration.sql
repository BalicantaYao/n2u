-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "symbol" TEXT NOT NULL,
    "symbolName" TEXT,
    "market" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "tradeDate" TIMESTAMP(3) NOT NULL,
    "settlementDate" TIMESTAMP(3),
    "lotType" TEXT NOT NULL,
    "lots" INTEGER,
    "shares" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "transactionTax" DOUBLE PRECISION NOT NULL,
    "totalFees" DOUBLE PRECISION NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "realizedPnL" DOUBLE PRECISION,
    "isETF" BOOLEAN NOT NULL DEFAULT false,
    "stopLoss" DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "notes" TEXT,
    "tags" TEXT,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionLot" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "lotType" TEXT NOT NULL,
    "openTradeId" TEXT NOT NULL,
    "openDate" TIMESTAMP(3) NOT NULL,
    "shares" INTEGER NOT NULL,
    "costPerShare" DOUBLE PRECISION NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PositionLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "symbolName" TEXT,
    "market" TEXT NOT NULL,
    "isETF" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_symbol_idx" ON "Trade"("symbol");

-- CreateIndex
CREATE INDEX "Trade_tradeDate_idx" ON "Trade"("tradeDate");

-- CreateIndex
CREATE INDEX "PositionLot_symbol_isOpen_idx" ON "PositionLot"("symbol", "isOpen");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_symbol_key" ON "Watchlist"("symbol");

-- AddForeignKey
ALTER TABLE "PositionLot" ADD CONSTRAINT "PositionLot_openTradeId_fkey" FOREIGN KEY ("openTradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
