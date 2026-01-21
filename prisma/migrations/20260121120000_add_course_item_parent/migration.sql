-- Add optional parent for nested course items (sections/subsections)
ALTER TABLE "CourseItem" ADD COLUMN "parentId" INTEGER;

ALTER TABLE "CourseItem"
ADD CONSTRAINT "CourseItem_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "CourseItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CourseItem_parentId_idx" ON "CourseItem"("parentId");

