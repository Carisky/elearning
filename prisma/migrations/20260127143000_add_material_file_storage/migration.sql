-- Add enum value
ALTER TYPE "MaterialType" ADD VALUE IF NOT EXISTS 'FILE';

-- Add file storage metadata to materials
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "originalFilename" TEXT;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER;

