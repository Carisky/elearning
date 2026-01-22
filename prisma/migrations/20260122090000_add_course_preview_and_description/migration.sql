-- Add course preview image + rich text description
ALTER TABLE "Course" ADD COLUMN "previewImageUrl" TEXT;
ALTER TABLE "Course" ADD COLUMN "descriptionJson" JSONB;

