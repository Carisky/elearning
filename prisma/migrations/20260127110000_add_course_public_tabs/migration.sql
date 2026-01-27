-- Add public course tabs content
ALTER TABLE "Course" ADD COLUMN "programJson" JSONB;
ALTER TABLE "Course" ADD COLUMN "instructorJson" JSONB;

