# Complete Production Guide: Fixing Restaurant Variant Cart Issue

## 🔥 Root Cause Analysis

**Problem**: Database constraint `cart_items_cart_id_item_id_key` prevents multiple variants of the same item in cart.

**Current constraint**: `UNIQUE (cart_id, item_id)`  
**Required constraint**: `UNIQUE (cart_id, item_id, variant)`

---

## 🛠️ Solution 1: Fix Database Schema (RECOMMENDED)

### Step 1: Drop the old unique constraint

```sql
-- In Supabase SQL Editor

ALTER TABLE cart_items 
DROP CONSTRAINT IF EXISTS cart_items_cart_id_item_id_key;
```

### Step 2: Create new composite unique constraint including variant

```sql
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_cart_id_item_id_variant_key 
UNIQUE (cart_id, item_id, variant);
```

### Why this works:
- Allows same item with different variants (Half/Full)
- Prevents duplicate entries for same variant
- Maintains data integrity

---

## 🛠️ Solution 2: Alternative Schema Design (If you can't modify constraints)

If you cannot change the database constraint, use **composite item IDs** in the database:

### Backend approach:
```javascript
// In cart.service.js addItemToCart()
async addItemToCart(customerId, shopId, itemId, quantity, variant) {
  // Create composite key that includes variant
  const compositeItemId = variant ? `${itemId}:${variant}` : itemId;
  
  // Store compositeItemId in database
  await supabase
    .from('cart_items')
    .insert({
      cart_id: cart.id,
      item_id: compositeItemId,  // e.g., "uuid-123:Full"
      quantity,
      variant: variant || null
    });
}
```

**Pros**: No schema change needed  
**Cons**: Complex querying, denormalized data

---

## 📊 Recommended Production Schema

```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  variant TEXT CHECK (variant IN ('Half', 'Full', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite unique constraint including variant
  CONSTRAINT cart_items_cart_id_item_id_variant_key 
  UNIQUE (cart_id, item_id, variant)
);

-- Index for faster lookups
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_item_id ON cart_items(item_id);
```

---

## 🔍 How to Debug This Properly (What You Did Right)

### 1. Backend Logging Strategy ✅
```javascript
logger.info('[CART-SERVICE] Insert payload', { 
  cart_id, 
  item_id, 
  variant,
  insertPayload 
});

logger.error('[CART-SERVICE] Database error', {
  error: insertError.message,
  code: insertError.code,
  details: insertError.details,
  hint: insertError.hint
});
```

### 2. Isolate the Problem ✅
- Created standalone test script
- Tested Half vs Full separately
- Identified exact failure point

### 3. Check Database Constraints ✅
```javascript
// Query to list all constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'cart_items'::regclass;
```

---

## 🚨 Production-Level Causes Checklist

### ✅ **Your Issue: Database Constraint**
- `UNIQUE (cart_id, item_id)` without variant
- Most common cause of variant failures

### Other Common Causes:

#### 1. **ENUM Type Mismatch**
```sql
-- Check if variant is an ENUM
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'cart_items' AND column_name = 'variant';

-- If it's ENUM, check allowed values
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'variant_type'::regtype;
```

**Fix**: Ensure 'Full' and 'Half' are in ENUM values (case-sensitive!)

#### 2. **Case Sensitivity**
```javascript
// Backend receives "full" but DB expects "Full"
variant = variant ? variant.charAt(0).toUpperCase() + variant.slice(1).toLowerCase() : null;
```

#### 3. **NULL Handling**
```javascript
// Postgres treats NULL != NULL in UNIQUE constraints
// So UNIQUE(cart_id, item_id, variant) allows multiple NULLs
variant: variant || null  // ✅ Correct
variant: variant || ''    // ❌ Wrong - empty string != NULL
```

#### 4. **Price Validation**
```javascript
// If full_price is NULL, fallback to base price
const fullPrice = item.full_price ?? item.price;
if (!fullPrice || fullPrice <= 0) {
  throw new Error('Invalid price for Full variant');
}
```

#### 5. **Stock/Availability for Variants**
```javascript
// Ensure item has variant support
if (variant && !item.has_variants) {
  throw new Error('Item does not support variants');
}
```

---

## 🔐 Defensive Backend Code

```javascript
// cart.service.js - Production-ready addItemToCart
async addItemToCart(customerId, shopId, itemId, quantity, variant) {
  try {
    // 1. Normalize variant (handle case sensitivity)
    const normalizedVariant = variant 
      ? variant.charAt(0).toUpperCase() + variant.slice(1).toLowerCase()
      : null;
    
    // 2. Validate item exists and supports variants
    const item = await this.getItemById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }
    
    if (normalizedVariant && !item.has_variants) {
      throw new Error(`Item "${item.name}" does not support variants`);
    }
    
    // 3. Validate price exists for variant
    let itemPrice;
    if (normalizedVariant === 'Half') {
      itemPrice = item.half_portion_price;
      if (!itemPrice) {
        throw new Error('Half portion not available for this item');
      }
    } else if (normalizedVariant === 'Full') {
      itemPrice = item.full_price ?? item.price;
      if (!itemPrice) {
        throw new Error('Full portion not available for this item');
      }
    } else {
      itemPrice = item.price;
    }
    
    if (!itemPrice || itemPrice <= 0) {
      throw new Error('Invalid item price');
    }
    
    // 4. Get cart
    const cart = await this.getOrCreateCart(customerId, shopId);
    
    // 5. Check if item+variant combo already exists
    const { data: existingItems } = await supabase
      .from('cart_items')
      .select('id, quantity, variant')
      .eq('cart_id', cart.id)
      .eq('item_id', itemId);
    
    const existingItem = existingItems?.find(i => 
      (i.variant || null) === (normalizedVariant || null)
    );
    
    if (existingItem) {
      // Update quantity
      const newQty = existingItem.quantity + quantity;
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQty })
        .eq('id', existingItem.id);
      
      if (error) {
        logger.error('[CART] Update failed', { error, cartItemId: existingItem.id });
        throw new Error(`Failed to update cart: ${error.message}`);
      }
    } else {
      // Insert new cart item
      const insertPayload = {
        cart_id: cart.id,
        item_id: itemId,
        quantity,
        variant: normalizedVariant || null
      };
      
      const { error } = await supabase
        .from('cart_items')
        .insert(insertPayload);
      
      if (error) {
        // Log detailed error for debugging
        logger.error('[CART] Insert failed', {
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          },
          payload: insertPayload
        });
        
        // User-friendly error messages
        if (error.code === '23505') {
          throw new Error('This item variant is already in your cart');
        } else if (error.code === '23503') {
          throw new Error('Invalid cart or item reference');
        } else if (error.code === '23514') {
          throw new Error('Invalid variant type');
        }
        
        throw new Error(`Failed to add item to cart: ${error.message}`);
      }
    }
    
    // 6. Update cart timestamp
    await supabase
      .from('carts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', cart.id);
    
    logger.info('[CART] Item added successfully', {
      cartId: cart.id,
      itemId,
      variant: normalizedVariant,
      quantity
    });
    
    return this.getCustomerCart(customerId, shopId);
    
  } catch (error) {
    logger.error('[CART] addItemToCart failed', {
      error: error.message,
      stack: error.stack,
      customerId,
      shopId,
      itemId,
      variant
    });
    throw error;
  }
}
```

---

## 📝 Summary of Actions

### Immediate Fix (Choose ONE):

**Option A: Fix Database Constraint** (Recommended)
```sql
ALTER TABLE cart_items DROP CONSTRAINT cart_items_cart_id_item_id_key;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_cart_id_item_id_variant_key UNIQUE (cart_id, item_id, variant);
```

**Option B: Use Composite Keys**
- Modify backend to store `item_id` as `"uuid:Full"` or `"uuid:Half"`
- No database changes needed

### Long-term Improvements:
1. ✅ Add detailed logging (already done)
2. ✅ Add constraint checks in schema
3. ✅ Validate variant support before insert
4. ✅ Normalize variant strings (case handling)
5. ✅ Add proper error codes mapping

---

## 🧪 Test After Fix

```javascript
// Test script
const testCases = [
  { itemId: 'uuid-123', variant: 'Half', shouldPass: true },
  { itemId: 'uuid-123', variant: 'Full', shouldPass: true },
  { itemId: 'uuid-123', variant: 'Half', shouldPass: false }, // Duplicate
  { itemId: 'uuid-456', variant: null, shouldPass: true },
];

for (const test of testCases) {
  try {
    await cartService.addItemToCart(customerId, shopId, test.itemId, 1, test.variant);
    console.log(`✅ ${test.variant || 'no-variant'}: ${test.shouldPass ? 'PASS' : 'FAIL (expected)'}`);
  } catch (error) {
    console.log(`❌ ${test.variant || 'no-variant'}: ${!test.shouldPass ? 'PASS (expected)' : 'FAIL'}`, error.message);
  }
}
```

---

Generated: 2026-02-26
Issue: Restaurant full variant cart insertion failure
Status: Root cause identified, solution provided
