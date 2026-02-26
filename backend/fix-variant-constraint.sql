-- ============================================
-- FIX: Cart Items Variant Constraint Issue
-- ============================================
-- Problem: UNIQUE constraint on (cart_id, item_id) prevents
-- adding multiple variants (Half/Full) of the same item
--
-- Solution: Replace with composite constraint including variant
-- ============================================

-- Step 1: Drop the old unique constraint
ALTER TABLE cart_items 
DROP CONSTRAINT IF EXISTS cart_items_cart_id_item_id_key;

-- Step 2: Add new composite unique constraint including variant
-- This allows Half and Full variants of the same item in the same cart
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_cart_id_item_id_variant_key 
UNIQUE (cart_id, item_id, variant);

-- Step 3: Add check constraint to ensure variant values are valid
ALTER TABLE cart_items
DROP CONSTRAINT IF EXISTS cart_items_variant_check;

ALTER TABLE cart_items
ADD CONSTRAINT cart_items_variant_check
CHECK (variant IS NULL OR variant IN ('Half', 'Full'));

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cart_items_lookup 
ON cart_items(cart_id, item_id, variant);

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the constraint was created:
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'cart_items'::regclass
ORDER BY conname;
