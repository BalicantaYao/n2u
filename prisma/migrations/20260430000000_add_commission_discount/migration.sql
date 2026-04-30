-- Add per-user Taiwan brokerage commission discount factor
-- 1.0 = no discount, 0.6 = 6 折 (60% of base), 0.28 = 2.8 折, etc.
ALTER TABLE "User" ADD COLUMN "commissionDiscount" DOUBLE PRECISION NOT NULL DEFAULT 1;
