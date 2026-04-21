-- CreateTable
CREATE TABLE "Memo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT,
    "linkedSymbol" TEXT,
    "tradeId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Memo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Memo_userId_createdAt_idx" ON "Memo"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Memo_linkedSymbol_idx" ON "Memo"("linkedSymbol");

-- CreateIndex
CREATE INDEX "Memo_tradeId_idx" ON "Memo"("tradeId");

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
