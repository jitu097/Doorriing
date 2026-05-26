-- Create partial unique index for customer notifications
-- IMPORTANT: Run this as a standalone statement in Supabase (not inside BEGIN/COMMIT)
-- It uses CONCURRENTLY to avoid long locks on the notifications table.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unique_customer_type_ref
  ON notifications(customer_id, type, reference_id)
  WHERE customer_id IS NOT NULL;

-- This index enforces uniqueness only for notifications that belong to a customer
-- (customer_id IS NOT NULL). Seller-side notifications (where customer_id is NULL)
-- are unaffected.
