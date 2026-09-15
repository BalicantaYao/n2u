-- 掩護性買權標的固定為台股加權股價指數（台指選擇權），契約乘數每點 50 元。
-- 只調整預設值，既有資料不動。
ALTER TABLE "CoveredCallPosition" ALTER COLUMN "contractMultiplier" SET DEFAULT 50;
