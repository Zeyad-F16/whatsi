-- CreateTable
CREATE TABLE "messages" (
    "id" BIGSERIAL NOT NULL,
    "account_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "chat_id" TEXT,
    "message_id" TEXT,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "display_time" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_messages" (
    "id" BIGSERIAL NOT NULL,
    "account_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "chat_id" TEXT,
    "message_id" TEXT,
    "sender" TEXT NOT NULL,
    "file_path" TEXT NOT NULL DEFAULT '',
    "duration_sec" INTEGER,
    "transcript" TEXT,
    "tone_analysis" TEXT,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "display_time" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_job_outbox" (
    "job_id" TEXT NOT NULL,
    "audio_id" BIGINT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "audio_job_outbox_pkey" PRIMARY KEY ("job_id")
);

-- CreateIndex
CREATE INDEX "idx_messages_account_timestamp" ON "messages"("account_id", "timestamp");

-- CreateIndex
CREATE INDEX "idx_messages_timestamp" ON "messages"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "idx_messages_account_message" ON "messages"("account_id", "message_id");

-- CreateIndex
CREATE INDEX "idx_audio_account_timestamp" ON "audio_messages"("account_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "idx_audio_account_message" ON "audio_messages"("account_id", "message_id");

-- CreateIndex
CREATE INDEX "idx_audio_outbox_pending" ON "audio_job_outbox"("published_at", "created_at");

-- AddForeignKey
ALTER TABLE "audio_job_outbox" ADD CONSTRAINT "audio_job_outbox_audio_id_fkey" FOREIGN KEY ("audio_id") REFERENCES "audio_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
