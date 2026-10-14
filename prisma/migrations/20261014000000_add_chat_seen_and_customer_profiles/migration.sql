-- Migration: add sales_chat_seen and customer_profiles tables
-- These tables already exist in the database (created by initialize() raw SQL).
-- This migration file is used to bring the Prisma migration history in sync
-- with the actual database state using `prisma migrate resolve --applied`.

CREATE TABLE IF NOT EXISTS sales_chat_seen (
  account_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unread_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, chat_id)
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  chat_id TEXT NOT NULL PRIMARY KEY,
  customer_phone TEXT,
  customer_name TEXT,
  first_account_name TEXT,
  last_account_name TEXT,
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_at TIMESTAMPTZ DEFAULT NOW(),
  brief TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON customer_profiles (customer_phone);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_updated_at ON customer_profiles (updated_at);
