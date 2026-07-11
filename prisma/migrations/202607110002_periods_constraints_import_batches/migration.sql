-- P03/P04 rehearsal migration. Do not apply to production without a fresh
-- inventory-enums dry-run and duplicate ExamSupervisor check.

CREATE TYPE "Department" AS ENUM ('GMIM', 'DUIM');
CREATE TYPE "Role" AS ENUM ('user', 'admin', 'baskan', 'dekan');
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'assigned', 'approved', 'rejected', 'archived');
CREATE TYPE "TaskSource" AS ENUM ('external', 'temsilci_assigned', 'auto_assigned', 'import');
CREATE TYPE "AcademicPeriodStatus" AS ENUM ('open', 'closed');
CREATE TYPE "ImportBatchStatus" AS ENUM ('previewed', 'committed', 'rolled_back', 'failed');

ALTER TABLE "ResearchAssistant"
  ALTER COLUMN "department" DROP DEFAULT,
  ALTER COLUMN "department" TYPE "Department" USING "department"::"Department",
  ALTER COLUMN "department" SET DEFAULT 'GMIM',
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "Role" USING "role"::"Role",
  ALTER COLUMN "role" SET DEFAULT 'user';

ALTER TABLE "Task"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "TaskStatus" USING "status"::"TaskStatus",
  ALTER COLUMN "status" SET DEFAULT 'pending',
  ALTER COLUMN "source" DROP DEFAULT,
  ALTER COLUMN "source" TYPE "TaskSource" USING "source"::"TaskSource",
  ALTER COLUMN "source" SET DEFAULT 'external',
  ADD COLUMN "periodId" TEXT;

ALTER TABLE "Exam"
  ALTER COLUMN "department" DROP DEFAULT,
  ALTER COLUMN "department" TYPE "Department" USING "department"::"Department",
  ALTER COLUMN "department" SET DEFAULT 'GMIM';

ALTER TABLE "Announcement"
  ALTER COLUMN "department" DROP DEFAULT,
  ALTER COLUMN "department" TYPE "Department" USING "department"::"Department",
  ALTER COLUMN "department" SET DEFAULT 'GMIM';

CREATE TABLE "AcademicPeriod" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "department" "Department" NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "status" "AcademicPeriodStatus" NOT NULL DEFAULT 'open',
  "closedAt" TIMESTAMP(3),
  "closedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportBatch" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileHash" TEXT NOT NULL,
  "importType" TEXT NOT NULL,
  "department" "Department" NOT NULL,
  "status" "ImportBatchStatus" NOT NULL DEFAULT 'previewed',
  "createdById" TEXT NOT NULL,
  "committedAt" TIMESTAMP(3),
  "rolledBackAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportBatchRow" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "raw" JSONB NOT NULL,
  "taskId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportBatchRow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicPeriod_department_name_key" ON "AcademicPeriod"("department", "name");
CREATE INDEX "AcademicPeriod_department_status_idx" ON "AcademicPeriod"("department", "status");
CREATE INDEX "Task_assistantId_status_idx" ON "Task"("assistantId", "status");
CREATE INDEX "Task_date_idx" ON "Task"("date");
CREATE INDEX "Task_periodId_idx" ON "Task"("periodId");
CREATE UNIQUE INDEX "ExamSupervisor_examId_assistantId_key" ON "ExamSupervisor"("examId", "assistantId");
CREATE UNIQUE INDEX "ImportBatch_fileHash_importType_department_key" ON "ImportBatch"("fileHash", "importType", "department");
CREATE INDEX "ImportBatch_department_status_idx" ON "ImportBatch"("department", "status");
CREATE INDEX "ImportBatchRow_batchId_idx" ON "ImportBatchRow"("batchId");
CREATE INDEX "ImportBatchRow_taskId_idx" ON "ImportBatchRow"("taskId");

ALTER TABLE "Task" ADD CONSTRAINT "Task_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportBatchRow" ADD CONSTRAINT "ImportBatchRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportBatchRow" ADD CONSTRAINT "ImportBatchRow_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
