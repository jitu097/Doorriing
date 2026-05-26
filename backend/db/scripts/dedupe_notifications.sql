-- Backup duplicate customer-related notification rows and deduplicate
-- Run after you've applied the column-add migration (20260527_add_order_accepted_notifications.sql)
-- NOTE: This script only touches notifications where customer_id IS NOT NULL.

-- 1) Backup duplicates
CREATE TABLE IF NOT EXISTS notifications_duplicates_backup AS
SELECT * FROM notifications WHERE false;

INSERT INTO notifications_duplicates_backup
SELECT n.*
FROM notifications n
JOIN (
  SELECT customer_id, type, reference_id
  FROM notifications
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id, type, reference_id
  HAVING COUNT(*) > 1
) dup
  ON ( (dup.customer_id IS NOT DISTINCT FROM n.customer_id)
       AND dup.type IS NOT DISTINCT FROM n.type
       AND dup.reference_id IS NOT DISTINCT FROM n.reference_id );

-- 2) Deduplicate keeping the best row per group
WITH ranked AS (
  SELECT
    id,
    customer_id,
    type,
    reference_id,
    is_sent,
    sent_at,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id, type, reference_id
      ORDER BY
        (CASE WHEN is_sent THEN 0 ELSE 1 END) ASC,
        sent_at DESC NULLS LAST,
        created_at DESC
    ) AS rn
  FROM notifications
  WHERE customer_id IS NOT NULL
)
DELETE FROM notifications
USING ranked
WHERE notifications.id = ranked.id
  AND ranked.rn > 1
RETURNING notifications.*;
