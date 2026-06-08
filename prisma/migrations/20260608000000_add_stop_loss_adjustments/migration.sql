-- CreateTable
CREATE TABLE "StopLossAdjustment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbol" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "previousStopLoss" DOUBLE PRECISION,
    "newStopLoss" DOUBLE PRECISION,
    "note" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "StopLossAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StopLossAdjustment_userId_symbol_createdAt_idx" ON "StopLossAdjustment"("userId", "symbol", "createdAt");

-- AddForeignKey
ALTER TABLE "StopLossAdjustment" ADD CONSTRAINT "StopLossAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
