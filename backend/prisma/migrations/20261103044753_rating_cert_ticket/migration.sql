-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "edited_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cohort_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_history" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "from_status" "TicketStatus",
    "to_status" "TicketStatus",
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ratings_lesson_id_idx" ON "ratings"("lesson_id");

-- CreateIndex
CREATE INDEX "ratings_mentor_id_idx" ON "ratings"("mentor_id");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_user_id_lesson_id_key" ON "ratings"("user_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_number_key" ON "certificates"("number");

-- CreateIndex
CREATE INDEX "certificates_user_id_cohort_id_idx" ON "certificates"("user_id", "cohort_id");

-- CreateIndex
CREATE INDEX "tickets_reporter_id_status_idx" ON "tickets"("reporter_id", "status");

-- CreateIndex
CREATE INDEX "tickets_status_updated_at_idx" ON "tickets"("status", "updated_at");

-- CreateIndex
CREATE INDEX "ticket_history_ticket_id_created_at_idx" ON "ticket_history"("ticket_id", "created_at");

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
