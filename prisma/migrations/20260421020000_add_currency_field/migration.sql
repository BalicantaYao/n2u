-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'TWD';

-- AlterTable
ALTER TABLE "PositionLot" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'TWD';
