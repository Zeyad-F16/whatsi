-- Long-term minimal contact hashes support lead/follow-up classification across 48-hour message retention.
CREATE TABLE "customer_contact_history" (
    "contact_hash" VARCHAR(64) NOT NULL,
    "first_contact_at" TIMESTAMPTZ(6) NOT NULL,
    "first_account_id" TEXT NOT NULL,
    "baseline_contact" BOOLEAN NOT NULL DEFAULT FALSE,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_contact_history_pkey" PRIMARY KEY ("contact_hash")
);
CREATE INDEX "idx_contact_history_first_contact" ON "customer_contact_history"("first_contact_at");

CREATE TABLE "sales_daily_scores" (
    "account_id" TEXT NOT NULL,
    "score_date" DATE NOT NULL,
    "account_name" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "improvement" TEXT NOT NULL,
    "lead_count" INTEGER NOT NULL DEFAULT 0,
    "followup_count" INTEGER NOT NULL DEFAULT 0,
    "conversation_count" INTEGER NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_daily_scores_pkey" PRIMARY KEY ("account_id", "score_date"),
    CONSTRAINT "sales_daily_scores_overall_score_check" CHECK ("overall_score" BETWEEN 0 AND 100)
);
CREATE INDEX "idx_sales_daily_scores_date" ON "sales_daily_scores"("score_date");