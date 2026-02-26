-- Drop ONLY the old constraint (without variant)
ALTER TABLE cart_items 
DROP CONSTRAINT IF EXISTS cart_items_cart_id_item_id_key;

-- Verify the correct constraint exists
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'cart_items'::regclass 
AND conname LIKE '%variant%';
