-- CreateEnum
CREATE TYPE "OrderItemType" AS ENUM ('COURSE', 'COURSE_RENEWAL');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "accessDurationDays" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "courseRenewalOptionId" INTEGER,
ADD COLUMN     "type" "OrderItemType" NOT NULL DEFAULT 'COURSE';

-- CreateTable
CREATE TABLE "CourseRenewalOption" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "title" TEXT,
    "durationDays" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseRenewalOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentRenewal" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "addedDays" INTEGER NOT NULL,
    "previousExpiresAt" TIMESTAMP(3),
    "newExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentRenewal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseRenewalOption_courseId_isActive_sortOrder_idx" ON "CourseRenewalOption"("courseId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "EnrollmentRenewal_enrollmentId_createdAt_idx" ON "EnrollmentRenewal"("enrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "EnrollmentRenewal_optionId_idx" ON "EnrollmentRenewal"("optionId");

-- CreateIndex
CREATE INDEX "EnrollmentRenewal_orderId_idx" ON "EnrollmentRenewal"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_courseRenewalOptionId_idx" ON "OrderItem"("courseRenewalOptionId");

-- AddForeignKey
ALTER TABLE "CourseRenewalOption" ADD CONSTRAINT "CourseRenewalOption_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_courseRenewalOptionId_fkey" FOREIGN KEY ("courseRenewalOptionId") REFERENCES "CourseRenewalOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRenewal" ADD CONSTRAINT "EnrollmentRenewal_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRenewal" ADD CONSTRAINT "EnrollmentRenewal_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "CourseRenewalOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRenewal" ADD CONSTRAINT "EnrollmentRenewal_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
