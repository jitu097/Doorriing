-- ============================================================================
-- PHASE 3: DENORMALIZE SHOP INVENTORY (Optional but High-Impact)
-- ============================================================================
-- Adds columns to shops table to store pre-computed inventory stats
-- Eliminates N+1 aggregation queries

-- Step 1: Add new columns to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS category_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_active_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_stock_quantity INTEGER DEFAULT 0;

-- Step 2: Initialize columns with current data
UPDATE shops SET
  category_count = COALESCE((
    SELECT COUNT(*) FROM categories
    WHERE shop_id = shops.id AND is_active = true
  ), 0),
  total_active_items = COALESCE((
    SELECT COUNT(*) FROM items
    WHERE shop_id = shops.id AND is_active = true AND is_available = true
  ), 0),
  total_stock_quantity = COALESCE((
    SELECT COALESCE(SUM(stock_quantity), 0) FROM items
    WHERE shop_id = shops.id AND is_active = true AND is_available = true
  ), 0);

-- Step 3: Create trigger to maintain category_count
CREATE OR REPLACE FUNCTION update_shop_category_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE shops SET category_count = category_count - 1
    WHERE id = OLD.shop_id;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.is_active THEN
      UPDATE shops SET category_count = category_count + 1
      WHERE id = NEW.shop_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
    UPDATE shops SET category_count = category_count + (CASE WHEN NEW.is_active THEN 1 ELSE -1 END)
    WHERE id = NEW.shop_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_shop_category_count ON categories;

CREATE TRIGGER trg_update_shop_category_count
AFTER INSERT OR UPDATE OR DELETE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_shop_category_count();

-- Step 4: Create trigger to maintain inventory stats
CREATE OR REPLACE FUNCTION update_shop_item_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE shops SET
      total_active_items = CASE
        WHEN OLD.is_active = true AND OLD.is_available = true THEN total_active_items - 1
        ELSE total_active_items
      END,
      total_stock_quantity = total_stock_quantity - COALESCE(OLD.stock_quantity, 0)
    WHERE id = OLD.shop_id;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE shops SET
      total_active_items = CASE
        WHEN NEW.is_active = true AND NEW.is_available = true THEN total_active_items + 1
        ELSE total_active_items
      END,
      total_stock_quantity = total_stock_quantity + COALESCE(NEW.stock_quantity, 0)
    WHERE id = NEW.shop_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE shops SET
      total_active_items = total_active_items + CASE
        WHEN NEW.is_active = true AND NEW.is_available = true AND (OLD.is_active = false OR OLD.is_available = false) THEN 1
        WHEN (NEW.is_active = false OR NEW.is_available = false) AND OLD.is_active = true AND OLD.is_available = true THEN -1
        ELSE 0
      END,
      total_stock_quantity = total_stock_quantity + (COALESCE(NEW.stock_quantity, 0) - COALESCE(OLD.stock_quantity, 0))
    WHERE id = NEW.shop_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_shop_item_stats ON items;

CREATE TRIGGER trg_update_shop_item_stats
AFTER INSERT OR UPDATE OR DELETE ON items
FOR EACH ROW
EXECUTE FUNCTION update_shop_item_stats();

-- ============================================================================
-- VERIFY DENORMALIZED DATA
-- ============================================================================
SELECT
  id,
  name,
  business_type,
  category_count,
  total_active_items,
  total_stock_quantity
FROM shops
WHERE is_active = true
LIMIT 5;
