-- Performance Indexes for DoorRiing User & Delivery Database
-- Execute these queries in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Shops Table Optimization
CREATE INDEX IF NOT EXISTS idx_shops_business_type ON shops(business_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shops_city ON shops(city);
CREATE INDEX IF NOT EXISTS idx_shops_is_active_is_open ON shops(is_active, is_open);

-- 2. Items Table Optimization
CREATE INDEX IF NOT EXISTS idx_items_shop_id ON items(shop_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_items_subcategory_id ON items(subcategory_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_items_is_available ON items(is_available);

-- 3. Reviews Table Optimization
CREATE INDEX IF NOT EXISTS idx_reviews_shop_id ON reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_item_reviews_item_id ON item_reviews(item_id);

-- 4. Categories Table Optimization
CREATE INDEX IF NOT EXISTS idx_categories_shop_id_is_active ON categories(shop_id, is_active);
