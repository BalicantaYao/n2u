-- CreateTable
CREATE TABLE "OptionTrade" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "symbol" TEXT NOT NULL,
    "market" TEXT NOT NULL DEFAULT 'NASDAQ',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "strikePrice" DOUBLE PRECISION NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "tradeDate" TIMESTAMP(3) NOT NULL,
    "delta" DOUBLE PRECISION,
    "premium" DOUBLE PRECISION NOT NULL,
    "netPremium" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "userId" TEXT,

    CONSTRAINT "OptionTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OptionTrade_symbol_idx" ON "OptionTrade"("symbol");

-- CreateIndex
CREATE INDEX "OptionTrade_expirationDate_idx" ON "OptionTrade"("expirationDate");

-- CreateIndex
CREATE INDEX "OptionTrade_userId_idx" ON "OptionTrade"("userId");

-- CreateIndex
CREATE INDEX "OptionTrade_symbol_strikePrice_expirationDate_idx" ON "OptionTrade"("symbol", "strikePrice", "expirationDate");

-- AddForeignKey
ALTER TABLE "OptionTrade" ADD CONSTRAINT "OptionTrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
