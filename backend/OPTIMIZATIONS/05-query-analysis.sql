-- ============================================================================
-- PHASE 5: QUERY OPTIMIZATION CHECK
-- ============================================================================
-- Run this to identify slow queries that need optimization

-- Find all queries taking >1 second
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND mean_time > 1000  -- More than 1 second
ORDER BY mean_time DESC
LIMIT 20;

-- ============================================================================
-- PERFORMANCE BASELINE (Run before optimizations)
-- ============================================================================
-- Measure current performance
EXPLAIN ANALYZE
SELECT *
FROM shops
WHERE business_type = 'grocery' AND is_active = true
LIMIT 6;

-- Measure items by shop
EXPLAIN ANALYZE
SELECT *
FROM items
WHERE shop_id = '69a5d7ef-7ab2-4cee-afb4-2f061b3aadd6'
  AND is_active = true
  AND is_available = true
LIMIT 20;

-- Measure orders by customer
EXPLAIN ANALYZE
SELECT *
FROM orders
WHERE customer_id = 'example-customer-id'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- AFTER OPTIMIZATION CHECK
-- ============================================================================
-- Re-run above EXPLAIN ANALYZE after indexes are created
-- Expected: "Seq Scan" changes to "Index Scan" (much faster!)
