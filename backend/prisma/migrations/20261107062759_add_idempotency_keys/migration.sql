-- AlterTable
ALTER TABLE "answers" ADD COLUMN     "idempotency_key" VARCHAR(100),
ADD COLUMN     "idempotency_payload" VARCHAR(64);

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "idempotency_key" VARCHAR(100),
ADD COLUMN     "idempotency_payload" VARCHAR(64);

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "idempotency_key" VARCHAR(100),
ADD COLUMN     "idempotency_payload" VARCHAR(64);

-- CreateIndex
CREATE INDEX "certificates_created_by_idempotency_key_idx" ON "certificates"("created_by", "idempotency_key");

-- CreateIndex
CREATE INDEX "tickets_reporter_id_idempotency_key_idx" ON "tickets"("reporter_id", "idempotency_key");
