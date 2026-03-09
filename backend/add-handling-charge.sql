-- ============================================
-- ADD HANDLING_CHARGE COLUMN TO ORDERS TABLE
-- ============================================

-- Step 1: Add the column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS handling_charge numeric DEFAULT 2;

-- Step 2: Update all existing orders to have proper charges
UPDATE orders 
SET 
    delivery_charge = 20,
    handling_charge = 2,
    total_amount = items_total + 20 + 2
WHERE handling_charge IS NULL OR delivery_charge = 0;

-- Step 3: Verify the update
SELECT 
    order_number,
    items_total,
    delivery_charge,
    handling_charge,
    total_amount,
    (items_total + delivery_charge + handling_charge) as calculated_total
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;
