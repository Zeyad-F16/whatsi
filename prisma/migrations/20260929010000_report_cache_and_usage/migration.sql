-- Report cache revisions and per-request Gemini usage accounting.
CREATE TABLE "daily_report_revisions" (
    "account_key" TEXT NOT NULL,
    "report_date" VARCHAR(10) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_report_revisions_pkey" PRIMARY KEY ("account_key", "report_date")
);

CREATE TABLE "daily_report_cache" (
    "account_key" TEXT NOT NULL,
    "report_date" VARCHAR(10) NOT NULL,
    "source_version" VARCHAR(80) NOT NULL,
    "prompt_version" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_report_cache_pkey" PRIMARY KEY ("account_key", "report_date")
);
CREATE INDEX "idx_daily_report_cache_generated_at" ON "daily_report_cache"("generated_at");

CREATE TABLE "gemini_usage" (
    "id" BIGSERIAL NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "call_type" VARCHAR(40) NOT NULL,
    "account_id" TEXT,
    "model" VARCHAR(100) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "input_tokens" INTEGER,
    "input_text_tokens" INTEGER,
    "input_audio_tokens" INTEGER,
    "cached_input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "thinking_tokens" INTEGER,
    "estimated_cost_usd" DECIMAL(14,8),
    "error_code" VARCHAR(80),
    CONSTRAINT "gemini_usage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_gemini_usage_occurred_at" ON "gemini_usage"("occurred_at");
CREATE INDEX "idx_gemini_usage_type_time" ON "gemini_usage"("call_type", "occurred_at");
CREATE INDEX "idx_gemini_usage_account_time" ON "gemini_usage"("account_id", "occurred_at");
