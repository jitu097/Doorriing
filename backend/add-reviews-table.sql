-- Create reviews table if it does not exist
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  order_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_id FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Unique constraint: one review per order
  CONSTRAINT unique_order_review UNIQUE(order_id)
);

-- If the table already existed without the expected columns, patch it in place.
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS shop_id UUID,
  ADD COLUMN IF NOT EXISTS rating INTEGER,
  ADD COLUMN IF NOT EXISTS comment TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Add constraints only if they do not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_customer_id'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT fk_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_id'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT fk_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_shop_id'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT fk_shop_id FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_order_review'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT unique_order_review UNIQUE(order_id);
  END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_shop_id ON reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Customers can only view/insert their own reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'reviews_customer_read'
  ) THEN
    CREATE POLICY reviews_customer_read
      ON reviews FOR SELECT
      USING (customer_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'reviews_customer_insert'
  ) THEN
    CREATE POLICY reviews_customer_insert
      ON reviews FOR INSERT
      WITH CHECK (customer_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'reviews_public_read'
  ) THEN
    CREATE POLICY reviews_public_read
      ON reviews FOR SELECT
      USING (true);  -- Allow anyone to see reviews (can be restricted later)
  END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT ON reviews TO authenticated;
GRANT SELECT ON reviews TO anon;
