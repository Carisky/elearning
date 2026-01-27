-- CreateTable
CREATE TABLE "UserCourseItemReadProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseItemId" INTEGER NOT NULL,
    "readPercent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCourseItemReadProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCourseItemReadProgress_courseItemId_idx" ON "UserCourseItemReadProgress"("courseItemId");

-- CreateIndex
CREATE INDEX "UserCourseItemReadProgress_userId_idx" ON "UserCourseItemReadProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCourseItemReadProgress_userId_courseItemId_key" ON "UserCourseItemReadProgress"("userId", "courseItemId");

-- AddForeignKey
ALTER TABLE "UserCourseItemReadProgress" ADD CONSTRAINT "UserCourseItemReadProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCourseItemReadProgress" ADD CONSTRAINT "UserCourseItemReadProgress_courseItemId_fkey" FOREIGN KEY ("courseItemId") REFERENCES "CourseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
