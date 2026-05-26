-- Add delivery-state columns to notifications and trigger to create order_accepted rows
-- Run this in Supabase SQL editor. This migration is additive and safe.

BEGIN;

-- 1) Add state columns (idempotent)
ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS is_sent boolean DEFAULT false;

ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS sent_at timestamptz NULL;

ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS processing boolean DEFAULT false;

ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS processing_at timestamptz NULL;

ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS processing_by text NULL;

-- 2) Add uniqueness guard to prevent duplicate customer notifications for the same order
-- This index ensures INSERT ... ON CONFLICT DO NOTHING works predictably
-- NOTE: Creating a UNIQUE INDEX CONCURRENTLY must be run outside a transaction
-- and should be done after deduplicating existing rows. The index creation
-- has been moved to a separate migration file: 20260527_create_notifications_unique_index.sql

-- 3) Create trigger function to insert a durable notification when order transitions to 'accepted'
CREATE OR REPLACE FUNCTION public.notify_order_accepted_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only fire when status changed to 'accepted'
  IF (TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
    INSERT INTO notifications(customer_id, shop_id, title, message, type, reference_id, is_read)
    VALUES (
      NEW.customer_id,
      NEW.shop_id,
      'Order Accepted',
      'Your order has been accepted and is being prepared.',
      'order_accepted',
      NEW.id,
      false
    ) ON CONFLICT ON CONSTRAINT idx_notifications_unique_customer_type_ref DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Attach trigger to orders table
DROP TRIGGER IF EXISTS trg_order_accepted_notify ON orders;
CREATE TRIGGER trg_order_accepted_notify
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'accepted')
EXECUTE PROCEDURE public.notify_order_accepted_trigger();

COMMIT;
