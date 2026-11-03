-- CreateTable
CREATE TABLE "schema_baseline" (
    "id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schema_baseline_pkey" PRIMARY KEY ("id")
);
