-- CreateTable
CREATE TABLE "ObservationTarget" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "symbol" TEXT NOT NULL,
    "symbolName" TEXT,
    "market" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "note" TEXT,
    "lastCheckedDate" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ObservationTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObservationTarget_userId_archived_idx" ON "ObservationTarget"("userId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "ObservationTarget_userId_symbol_market_key" ON "ObservationTarget"("userId", "symbol", "market");

-- AddForeignKey
ALTER TABLE "ObservationTarget" ADD CONSTRAINT "ObservationTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
