-- Run this SQL directly in Supabase SQL Editor
-- This adds the checkDepth column to PageKeyword table

-- Add checkDepth column with default 20
ALTER TABLE "PageKeyword" 
ADD COLUMN IF NOT EXISTS "checkDepth" INTEGER NOT NULL DEFAULT 20;

-- Update existing rows to have default value
UPDATE "PageKeyword" 
SET "checkDepth" = 20 
WHERE "checkDepth" IS NULL;
