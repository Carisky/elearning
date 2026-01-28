-- Add enum value
ALTER TYPE "EnrollmentSource" ADD VALUE IF NOT EXISTS 'INVITE';

-- CreateTable
CREATE TABLE "UserInvite" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "accessGrantedAt" TIMESTAMP(3),
    "registeredUserId" INTEGER,
    "mailMessageId" TEXT,
    "mailLastError" TEXT,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInviteCourse" (
    "userInviteId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,

    CONSTRAINT "UserInviteCourse_pkey" PRIMARY KEY ("userInviteId","courseId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_tokenHash_key" ON "UserInvite"("tokenHash");
CREATE INDEX "UserInvite_email_createdAt_idx" ON "UserInvite"("email", "createdAt");
CREATE INDEX "UserInvite_expiresAt_idx" ON "UserInvite"("expiresAt");
CREATE INDEX "UserInvite_createdById_idx" ON "UserInvite"("createdById");
CREATE INDEX "UserInvite_registeredUserId_idx" ON "UserInvite"("registeredUserId");

-- CreateIndex
CREATE INDEX "UserInviteCourse_courseId_idx" ON "UserInviteCourse"("courseId");

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_registeredUserId_fkey" FOREIGN KEY ("registeredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInviteCourse" ADD CONSTRAINT "UserInviteCourse_userInviteId_fkey" FOREIGN KEY ("userInviteId") REFERENCES "UserInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInviteCourse" ADD CONSTRAINT "UserInviteCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

