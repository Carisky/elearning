-- CreateTable
CREATE TABLE "Subcategory" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceForm" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_slug_key" ON "Subcategory"("slug");

-- CreateIndex
CREATE INDEX "Subcategory_categoryId_sortOrder_idx" ON "Subcategory"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceForm_slug_key" ON "ServiceForm"("slug");

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "hoursTotal" INTEGER,
ADD COLUMN     "serviceFormId" INTEGER,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "subcategoryId" INTEGER;

-- CreateIndex
CREATE INDEX "Course_subcategoryId_idx" ON "Course"("subcategoryId");

-- CreateIndex
CREATE INDEX "Course_serviceFormId_idx" ON "Course"("serviceFormId");

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_serviceFormId_fkey" FOREIGN KEY ("serviceFormId") REFERENCES "ServiceForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

