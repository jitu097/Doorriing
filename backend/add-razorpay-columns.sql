-- ============================================================
-- Migration: Add Razorpay columns to orders table
-- Run this in Supabase SQL Editor before deploying the backend fix
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================

-- Add razorpay_order_id: used to link DB order to Razorpay order
-- and for webhook matching via .eq('razorpay_order_id', orderId)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT DEFAULT NULL;

-- Add razorpay_payment_id: useful for refunds and audit trail
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT DEFAULT NULL;

-- Index for fast webhook lookup
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
  ON orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- Verify columns exist (informational)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('razorpay_order_id', 'razorpay_payment_id');

-- ============================================================
-- Migration Phase 5: Payment Recovery + Audit columns
-- ============================================================

-- payment_recovered_at: set when an order is auto-recovered via the
-- /recover-payment-status endpoint. NULL for all normal orders.
-- Lets support team instantly identify auto-recovered orders.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_recovered_at TIMESTAMPTZ DEFAULT NULL;

-- Unique constraint on razorpay_payment_id: database-level enforcement
-- that no two orders can share the same Razorpay payment_id.
-- This is the last line of defense against duplicates beyond application guards.
-- Wrapped in DO block so it doesn't error if constraint already exists.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_razorpay_payment_id_unique'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_razorpay_payment_id_unique
            UNIQUE (razorpay_payment_id);
    END IF;
END;
$$;

-- Unique constraint on razorpay_order_id (one DB order per Razorpay order)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_razorpay_order_id_unique'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_razorpay_order_id_unique
            UNIQUE (razorpay_order_id);
    END IF;
END;
$$;

-- Verify Phase 5 columns (informational)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('payment_recovered_at');
