-- ============================================================================
-- PHASE 4: MATERIALIZED VIEW FOR INVENTORY SUMMARY (Advanced)
-- ============================================================================
-- Pre-computed shop inventory stats refreshed periodically
-- Eliminates expensive aggregation queries

-- Create materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS shops_inventory_summary AS
SELECT
  s.id as shop_id,
  s.name,
  s.business_type,
  s.is_active,
  COUNT(DISTINCT CASE WHEN i.is_active = true AND i.is_available = true THEN i.id END) as active_item_count,
  COALESCE(SUM(CASE WHEN i.is_active = true AND i.is_available = true THEN i.stock_quantity ELSE 0 END), 0) as total_stock,
  MAX(i.created_at) as last_item_updated,
  NOW() as view_refreshed_at
FROM shops s
LEFT JOIN items i ON s.id = i.shop_id
WHERE s.is_active = true
GROUP BY s.id, s.name, s.business_type, s.is_active;

-- Create index on materialized view for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_inventory_summary_pk
  ON shops_inventory_summary(shop_id);

-- Create index on business_type for filtering
CREATE INDEX IF NOT EXISTS idx_shops_inventory_business_type
  ON shops_inventory_summary(business_type);

-- ============================================================================
-- USAGE EXAMPLE: Replace inventory aggregation with view lookup
-- ============================================================================
-- Instead of:
--   SELECT * FROM items WHERE shop_id IN (...) GROUP BY shop_id
-- Use:
--   SELECT * FROM shops_inventory_summary WHERE shop_id IN (...)

-- Query to verify view contents
SELECT * FROM shops_inventory_summary
WHERE business_type = 'grocery'
LIMIT 10;

-- ============================================================================
-- REFRESH STRATEGY
-- ============================================================================
-- Option 1: Manual refresh (run when needed)
REFRESH MATERIALIZED VIEW CONCURRENTLY shops_inventory_summary;

-- Option 2: Schedule automatic refresh (requires pg_cron extension)
-- First, enable pg_cron:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Then schedule refresh every 5 minutes:
-- SELECT cron.schedule('refresh-shops-inventory', '5 minutes',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY shops_inventory_summary');

-- Option 3: Refresh on-demand from application (recommended for real-time accuracy)
-- Call from backend when inventory changes significantly
