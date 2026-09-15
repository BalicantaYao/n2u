-- CreateTable
CREATE TABLE "CoveredCallPosition" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "symbol" TEXT NOT NULL,
    "symbolName" TEXT,
    "market" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "underlyingType" TEXT NOT NULL DEFAULT 'LONG_CALL',
    "contractMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "quantity" DOUBLE PRECISION NOT NULL,
    "openDate" TIMESTAMP(3) NOT NULL,
    "openPrice" DOUBLE PRECISION NOT NULL,
    "openFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strike" DOUBLE PRECISION,
    "expiry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closeDate" TIMESTAMP(3),
    "closePrice" DOUBLE PRECISION,
    "closeFee" DOUBLE PRECISION,
    "notes" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CoveredCallPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoveredCallLeg" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "positionId" TEXT NOT NULL,
    "strike" DOUBLE PRECISION NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "contracts" DOUBLE PRECISION NOT NULL,
    "openDate" TIMESTAMP(3) NOT NULL,
    "openPremium" DOUBLE PRECISION NOT NULL,
    "openFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closeDate" TIMESTAMP(3),
    "closePremium" DOUBLE PRECISION,
    "closeFee" DOUBLE PRECISION,
    "rolledFromId" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CoveredCallLeg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoveredCallPosition_userId_status_idx" ON "CoveredCallPosition"("userId", "status");

-- CreateIndex
CREATE INDEX "CoveredCallPosition_userId_symbol_idx" ON "CoveredCallPosition"("userId", "symbol");

-- CreateIndex
CREATE INDEX "CoveredCallLeg_positionId_status_idx" ON "CoveredCallLeg"("positionId", "status");

-- CreateIndex
CREATE INDEX "CoveredCallLeg_userId_openDate_idx" ON "CoveredCallLeg"("userId", "openDate");

-- AddForeignKey
ALTER TABLE "CoveredCallPosition" ADD CONSTRAINT "CoveredCallPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoveredCallLeg" ADD CONSTRAINT "CoveredCallLeg_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "CoveredCallPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoveredCallLeg" ADD CONSTRAINT "CoveredCallLeg_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
