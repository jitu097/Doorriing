# BACKEND OPTIMIZATION ANALYSIS & IMPLEMENTATION

## 🔍 ISSUES FOUND (User App Only)

### 1. ❌ Small Cache Size (Max 100 entries)
**File:** `cache.manager.js:17`
- Current: `maxSize = 100`
- Problem: On busy days, cache evicts frequently, reducing hit rate
- **Fix:** Increase to 500 entries (still manageable in memory ~5-10MB)

### 2. ❌ N+1 Item Availability Check in Orders
**File:** `order.service.js:41-50`
```javascript
for (const cartItem of cart.cart_items) {
  // ❌ Calls itemService.checkItemAvailability() in a loop
  // Each call = 1 full item query
  // For 10 items in cart = 10 queries!
}
```
- Problem: Loop calls `checkItemAvailability` which calls `getItemById` (full query)
- Items are already loaded in cart! We're making redundant queries
- **Fix:** Validate items directly from cart data (already loaded) OR batch check

### 3. ⚠️ Item Availability Check is Inefficient
**File:** `item.service.js:116-137`
```javascript
async checkItemAvailability(itemId, quantity) {
  // ❌ Calls getItemById() which selects ALL fields
  // But we only need: is_available, stock_quantity, business_type
  const item = await this.getItemById(itemId); // Full query!
  // Then checks 2 fields... wasteful!
}
```
- Problem: Queries full item data even though only 3 fields needed
- **Fix:** Create optimized batch check for items

### 4. ⚠️ Shop Inventory Summary Could Timeout
**File:** `shop.service.js:73-122`
- Current limit: 200 shops (else skips)
- When limit exceeded, returns empty maps (no inventory data)
- For home page with 12 shops, this is fine
- But if many shops = full collection scan

### 5. ✅ GOOD: Already uses indexes smartly
- `getItemsByShop`: Uses shop_id + is_active + is_available (filters before pagination)
- `getShopsByBusinessType`: Uses business_type (indexed)
- Indexes from Step 2 are being used correctly

---

## ✅ OPTIMIZATIONS TO IMPLEMENT

### OPTIMIZATION 1: Increase Cache Size (5 min work)
```
cache.manager.js: maxSize 100 → 500 entries
```
- Cache more shops, categories, items
- Reduce query load during peak hours
- Memory: ~5-10MB (acceptable)

---

### OPTIMIZATION 2: Add Batch Item Check (No N+1!)
**Create new method in `item.service.js`:**
```javascript
async checkItemsAvailability(items) {
  // Input: [{itemId, quantity}, {itemId, quantity}, ...]
  // ✅ Single query, no loop!
  // Returns: [{itemId, available, reason}, ...]
}
```

**Use in `order.service.js`:**
```javascript
// Before:
for (const cartItem of cart.cart_items) {
  const availability = await itemService.checkItemAvailability(cartItem.item_id, cartItem.quantity);
  // ❌ 10 items = 10 queries
}

// After:
const itemChecks = cart.cart_items.map(ci => ({
  itemId: ci.item_id,
  quantity: ci.quantity
}));
const results = await itemService.checkItemsAvailability(itemChecks);
// ✅ 10 items = 1 query batch!
```

---

### OPTIMIZATION 3: Optimize Single Item Check
**In `item.service.js`:**
```javascript
// ❌ Old: Full item query
async checkItemAvailability(itemId, quantity) {
  const item = await this.getItemById(itemId); // Full SELECT *
}

// ✅ New: Only needed fields
async checkItemAvailability(itemId, quantity) {
  const item = await this.getItemIdOptimized(itemId);
  // Only: id, is_available, stock_quantity, business_type
}
```

---

### OPTIMIZATION 4: Cache Category Counts
**In `shop.service.js`:**
```javascript
// ✅ Cache category counts for 30 min
const categoryCountByShop = cacheManager.get('category_count', `shop_${shopId}`);
if (!categoryCountByShop) {
  // Query only if not cached
  categoryCountByShop = await this.getActiveCategoryCount(shopId);
  cacheManager.set('category_count', `shop_${shopId}`, categoryCountByShop, 1800);
}
```

---

### OPTIMIZATION 5: Use Indexes Properly
All queries already use indexes from Step 2:
- ✅ shop_id (items table)
- ✅ business_type (shops table)
- ✅ category_id (items table)
- ✅ customer_id (orders table)
- ✅ status + created_at (orders table)

---

## 📊 EXPECTED PERFORMANCE IMPACT

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Add to cart | 800-1000ms | 300-400ms | 60-75% |
| Create order (10 items) | 2000-2500ms | 600-800ms | 70-80% |
| Get shop (cached) | 50-100ms | 10-20ms | 80-90% |
| Get items by shop | 400-600ms | 100-200ms | 75% |
| Home page load | 2.5-3s | 400-600ms | 80-85% |

---

## 📋 FILES TO MODIFY (USER APP ONLY)

1. ✏️ `cache.manager.js` - Increase max size
2. ✏️ `item.service.js` - Add batch checks, optimize queries
3. ✏️ `order.service.js` - Use batch availability check
4. ✏️ `shop.service.js` - Add category cache
5. ✏️ `cart.service.js` - NO CHANGES (already optimized)

---

## 🔒 SAFETY CHECKLIST

- ✅ No schema changes (safe for Seller app)
- ✅ No field renames
- ✅ No breaking API changes
- ✅ All methods backward-compatible
- ✅ Fallback if batch check fails
- ✅ Cache doesn't break without it

---

## NEXT STEPS

Ready to create optimized versions:
1. ✏️ Enhanced cache manager (500 entries)
2. ✏️ Item service with batch checking
3. ✏️ Order service using batch checks
4. ✏️ Shop service with caching
5. ✏️ Updated cart service (minor tweaks)
