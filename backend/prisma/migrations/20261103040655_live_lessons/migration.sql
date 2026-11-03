-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('SCHEDULE_CREATED', 'SCHEDULE_CHANGED', 'SCHEDULE_CANCELLED', 'ESSAY_OVERDUE', 'CERTIFICATE_ISSUED');

-- CreateTable
CREATE TABLE "live_lessons" (
    "id" UUID NOT NULL,
    "cohort_id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'SCHEDULED',
    "room_reference" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "live_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_participants" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "source" TEXT NOT NULL DEFAULT 'JOIN',
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "corrected_by" UUID,
    "corrected_at" TIMESTAMPTZ(6),

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_audit_logs" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_lessons_cohort_id_starts_at_idx" ON "live_lessons"("cohort_id", "starts_at");

-- CreateIndex
CREATE INDEX "live_lessons_mentor_id_starts_at_idx" ON "live_lessons"("mentor_id", "starts_at");

-- CreateIndex
CREATE INDEX "lesson_participants_user_id_idx" ON "lesson_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_participants_lesson_id_user_id_key" ON "lesson_participants"("lesson_id", "user_id");

-- CreateIndex
CREATE INDEX "attendance_records_lesson_id_status_idx" ON "attendance_records"("lesson_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_lesson_id_user_id_key" ON "attendance_records"("lesson_id", "user_id");

-- CreateIndex
CREATE INDEX "lesson_audit_logs_lesson_id_created_at_idx" ON "lesson_audit_logs"("lesson_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "live_lessons" ADD CONSTRAINT "live_lessons_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_participants" ADD CONSTRAINT "lesson_participants_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "live_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "live_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_audit_logs" ADD CONSTRAINT "lesson_audit_logs_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "live_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
