-- Add per-user trade checklist stored as a JSON array of strings
-- Users can customize this in settings; it is displayed when creating a new trade
ALTER TABLE "User" ADD COLUMN "tradeChecklist" TEXT;
