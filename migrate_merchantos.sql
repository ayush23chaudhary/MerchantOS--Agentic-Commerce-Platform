-- =============================================================================
-- MerchantOS Migration: Cart State Machine + Audit Upgrades
-- =============================================================================
-- This migration is idempotent and safe to run multiple times.

-- Ensure UUID generation is available (pgcrypto for older PG, built-in for PG 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Cart State Machine Table
-- -----------------------------------------------------------------------------
-- Tracks the full lifecycle of a cart:
--   ACTIVE     → Cart created, products validated, total calculated
--   AUTHORIZED → Policy checks passed, idempotency key generated, ready for payment
--   COMPLETED  → Razorpay order created successfully
--   ABANDONED  → Policy check failed (mandate/stock violation)

CREATE TABLE IF NOT EXISTS carts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'AUTHORIZED', 'ABANDONED', 'COMPLETED')),
    product_ids     INTEGER[] NOT NULL,
    total_amount    NUMERIC(12, 2) NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE,
    razorpay_order_id VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on status for fast lookups of active/authorized carts
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts (status);

-- Index on idempotency_key for fast duplicate detection
CREATE INDEX IF NOT EXISTS idx_carts_idempotency ON carts (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Audit Logs Table Alterations
-- -----------------------------------------------------------------------------
-- Add columns for idempotency tracking and policy engine verdicts.
-- Using DO blocks to make ALTER TABLE idempotent (no error if column exists).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN idempotency_key VARCHAR(100);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'policy_result'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN policy_result VARCHAR(50);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'cart_id'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN cart_id UUID REFERENCES carts(id);
    END IF;
END $$;
