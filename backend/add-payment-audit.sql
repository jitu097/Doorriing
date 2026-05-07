-- ============================================================
-- Migration Phase 6: Refund Safety + Payment Audit Trail
-- Run in Supabase SQL Editor. Safe to run multiple times.
-- ============================================================

-- ── 1. Refund tracking columns on orders table ──────────────────────────────

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS refund_status   TEXT    DEFAULT NULL;
    -- Values: 'pending' | 'processing' | 'processed' | 'failed' | 'not_required'

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS refund_id       TEXT    DEFAULT NULL;
    -- Razorpay refund ID (e.g. 'rfnd_Abc123')

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS refund_amount   NUMERIC DEFAULT NULL;
    -- Amount refunded in INR (not paise)

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS refund_reason   TEXT    DEFAULT NULL;
    -- Human-readable reason (e.g. 'seller_rejected', 'customer_cancelled', 'admin_cancelled')

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS refund_initiated_at  TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS refund_completed_at  TIMESTAMPTZ DEFAULT NULL;

-- Index for support team queries: "show me all orders pending refund"
CREATE INDEX IF NOT EXISTS idx_orders_refund_status
    ON orders (refund_status)
    WHERE refund_status IS NOT NULL;

-- ── 2. payment_audit_logs table ─────────────────────────────────────────────
-- Append-only event log. Every payment state change writes a new row.
-- This is the source of truth for support disputes.

CREATE TABLE IF NOT EXISTS payment_audit_logs (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    order_id            UUID        REFERENCES orders(id) ON DELETE SET NULL,
    customer_id         UUID        NOT NULL,
    shop_id             UUID,

    -- Razorpay identifiers
    razorpay_order_id   TEXT,
    razorpay_payment_id TEXT,
    razorpay_refund_id  TEXT,

    -- Event type
    -- Possible values:
    --   payment_initiated   | payment_captured   | payment_failed
    --   payment_verified    | payment_recovered  | webhook_received
    --   refund_initiated    | refund_processing  | refund_completed
    --   refund_failed       | order_cancelled
    event               TEXT        NOT NULL,

    -- Snapshot of the relevant statuses at the time of this event
    payment_status      TEXT,       -- 'pending' | 'captured' | 'failed'
    order_status        TEXT,       -- e.g. 'pending', 'confirmed', 'cancelled'
    refund_status       TEXT,       -- 'none' | 'pending' | 'processing' | 'processed' | 'failed'

    -- Amounts
    amount              NUMERIC,    -- total order/payment amount in INR
    refund_amount       NUMERIC,    -- amount refunded (if applicable)

    -- Detail fields
    failure_reason      TEXT,       -- error message or gateway decline reason
    gateway_response    JSONB,      -- raw Razorpay API response for audit

    -- Metadata (anything extra: recovery source, admin user, etc.)
    metadata            JSONB,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common support queries
CREATE INDEX IF NOT EXISTS idx_audit_order_id
    ON payment_audit_logs (order_id);

CREATE INDEX IF NOT EXISTS idx_audit_customer_id
    ON payment_audit_logs (customer_id);

CREATE INDEX IF NOT EXISTS idx_audit_razorpay_payment_id
    ON payment_audit_logs (razorpay_payment_id)
    WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_event
    ON payment_audit_logs (event);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
    ON payment_audit_logs (created_at DESC);

-- ── 3. Enable Row Level Security (RLS) on audit log ─────────────────────────
-- Audit logs should only be readable by service role / admins.
-- Customers and sellers must NOT be able to read or write audit rows directly.

ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default (Supabase behaviour) — no policy needed.
-- Uncomment below to allow admin role read access if you have one:
-- CREATE POLICY "admin_read_audit" ON payment_audit_logs
--     FOR SELECT USING (auth.role() = 'admin');

-- ── 4. Verification queries (informational) ──────────────────────────────────

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN (
    'refund_status', 'refund_id', 'refund_amount',
    'refund_reason', 'refund_initiated_at', 'refund_completed_at'
  )
ORDER BY column_name;

-- Check RLS status via pg_class (information_schema.tables has no row_security column)
SELECT relname AS table_name,
       relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'payment_audit_logs';
