CREATE TABLE IF NOT EXISTS item_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  order_id UUID NOT NULL,
  item_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE item_reviews
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS item_id UUID,
  ADD COLUMN IF NOT EXISTS shop_id UUID,
  ADD COLUMN IF NOT EXISTS rating INTEGER,
  ADD COLUMN IF NOT EXISTS comment TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'item_reviews_customer_id_fkey'
  ) THEN
    ALTER TABLE item_reviews
      ADD CONSTRAINT item_reviews_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'item_reviews_order_id_fkey'
  ) THEN
    ALTER TABLE item_reviews
      ADD CONSTRAINT item_reviews_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'item_reviews_item_id_fkey'
  ) THEN
    ALTER TABLE item_reviews
      ADD CONSTRAINT item_reviews_item_id_fkey
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'item_reviews_shop_id_fkey'
  ) THEN
    ALTER TABLE item_reviews
      ADD CONSTRAINT item_reviews_shop_id_fkey
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'item_reviews_order_item_unique'
  ) THEN
    ALTER TABLE item_reviews
      ADD CONSTRAINT item_reviews_order_item_unique UNIQUE(order_id, item_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_item_reviews_customer_id ON item_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_item_reviews_order_id ON item_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_item_reviews_item_id ON item_reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_item_reviews_shop_id ON item_reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_item_reviews_created_at ON item_reviews(created_at DESC);
