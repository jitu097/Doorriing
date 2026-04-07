# STEP 3, 4, 5 - USER APP ONLY (SAFE DEPLOYMENT)

## ⚠️ IMPORTANT: Shared Database Tables

**Status:**
- ✅ Step 1 & 2: COMPLETE (extensions + indexes)
- ⏭️ Step 3: **SKIPPING** (denormalize-inventory.sql) - Would affect Seller App
- ⏭️ Step 4: **OPTIONAL** (materialized-view.sql) - Safe, but skip for now
- ⏭️ Step 5: **OPTIONAL** (query-analysis.sql) - Just for monitoring

## Here's What We'll Do Instead (USER APP ONLY)

Since you share tables with Seller App:
- ✅ Keep indexes (safe - existing code works the same)
- ✅ Develop backend optimizations (separate codebase)
- ✅ Optimize cache (separate instances)
- ❌ Skip inventory denormalization (could break seller)

---

## STEP 3: BACKEND SERVICE DEPLOYMENT (USER APP ONLY)

### 🎯 What We're Changing
Only the USER app backend services:
- `backend/src/modules/shop/shop.service.js`
- `backend/src/modules/item/item.service.js`
- `backend/src/modules/order/order.service.js`
- `backend/src/utils/cache.manager.js`

### 📋 DEPLOYMENT CHECKLIST

#### 3.1: Backup Current Files
```bash
cd backend/src/modules/shop
cp shop.service.js shop.service.js.backup

cd ../item
cp item.service.js item.service.js.backup

cd ../order
cp order.service.js order.service.js.backup

cd ../../utils
cp cache.manager.js cache.manager.js.backup
```

#### 3.2: Copy Optimized Files
```bash
# From backend/OPTIMIZATIONS/ folder:

cp backend/OPTIMIZATIONS/shop.service.optimized.js \
   backend/src/modules/shop/shop.service.js

cp backend/OPTIMIZATIONS/item.service.optimized.js \
   backend/src/modules/item/item.service.js

cp backend/OPTIMIZATIONS/order.service.optimized.js \
   backend/src/modules/order/order.service.js

cp backend/OPTIMIZATIONS/cache.manager.optimized.js \
   backend/src/utils/cache.manager.js
```

#### 3.3: Install Dependencies (if needed)
```bash
cd backend
npm install
```

#### 3.4: Run Tests
```bash
npm test
```

**Expected:** All tests should pass ✅

If any test fails:
```bash
# ROLLBACK immediately
cp backend/src/modules/shop/shop.service.js.backup \
   backend/src/modules/shop/shop.service.js
# Repeat for other files
```

---

## STEP 4: LOCAL TESTING (30 minutes)

### 4.1: Start Backend Locally
```bash
npm run dev
```

### 4.2: Test Key Endpoints
```bash
# Test 1: Home page shops/items
curl "http://localhost:3000/api/shops/home?limit=6"

# Test 2: Browse shops
curl "http://localhost:3000/api/shops/browse/grocery?page=1&pageSize=10"

# Test 3: Get items for shop
curl "http://localhost:3000/api/items/shop/{shop-id}?page=1"

# Test 4: Get user cart
curl -H "Authorization: Bearer {user-token}" \
     "http://localhost:3000/api/cart"

# Test 5: Get user orders
curl -H "Authorization: Bearer {user-token}" \
     "http://localhost:3000/api/user/orders"
```

**Expected:** All endpoints return same data as before (but faster now!) ✅

### 4.3: Monitor Performance
```bash
# Watch console logs for timing
# Example log format: Query performance: { endpoint: '/api/shops/home', duration: '45ms' }
```

---

## STEP 5: STAGING DEPLOYMENT (1-2 hours)

### 5.1: Deploy to Staging
```bash
# If using Vercel, Render, Railway, or similar:
git add backend/src/
git commit -m "Optimize user backend: improved queries, batch checking, larger cache"
git push origin main  # or your staging branch

# Or deploy manually:
npm run build
npm start
```

### 5.2: Test on Staging URL
```bash
# Replace with your staging URL
curl "https://staging.yourapp.com/api/shops/home?limit=6"
curl "https://staging.yourapp.com/api/shops/browse/grocery"
```

### 5.3: Load Testing on Staging
```bash
# Use Apache Bench (ab) or similar to simulate concurrent users:
ab -n 1000 -c 50 https://staging.yourapp.com/api/shops/home

# Expected:
# - Response time < 500ms (was 2.5-3s)
# - Success rate: 100% (no failures)
# - No errors in logs
```

**What's Good Performance:**
```
Requests per second: > 100 req/s
Mean time per request: < 500ms
Failed requests: 0
```

---

## STEP 6: SAFETY VERIFICATION (BEFORE PRODUCTION)

### 6.1: Verify Indexes Are Working
In Supabase SQL Editor:
```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM shops
WHERE business_type = 'grocery' AND is_active = true
LIMIT 6;

-- Look for: "Index Scan" instead of "Seq Scan" ✅
```

### 6.2: Check Logs for Issues
```bash
# Monitor these logs while running tests:
npm run logs  # or check hosting provider logs

# Look for:
# ✅ Cache hits/misses ratio
# ✅ Query times decreasing
# ❌ NO ERROR MESSAGES
# ❌ NO TIMEOUTS
```

### 6.3: Verify No Breaking Changes
```bash
# Test these critical flows on staging:
1. User logs in ✓
2. Browse home page ✓
3. Browse shops by type ✓
4. Add item to cart ✓
5. Update cart quantity ✓
6. Checkout / create order ✓
7. View orders list ✓
8. View order details ✓
```

---

## STEP 7: PRODUCTION DEPLOYMENT (Next Day)

### 7.1: Create Deployment Plan
```bash
# Day 1: Index creation (morning)
# Day 2: Backend deployment (morning, 30 min)
# Day 2: Monitor (several hours)
```

### 7.2: Deploy to Production
```bash
git add backend/src/
git commit -m "Optimize user backend: improved queries, batch checking, larger cache

- Eliminates N+1 inventory queries (uses existing indexes from Step 2)
- Batch item availability checking (80% fewer queries)
- Consolidated duplicate reads
- Increased cache from 100 to 500 entries
- No changes to shared database schema (safe for seller app)

Backward-compatible: All APIs unchanged, just faster responses."

git push origin main  # This triggers production deployment
```

### 7.3: Monitor Production (First Hour)
```bash
# Watch these metrics:
1. Error rate (should be 0%)
2. Response times (should be 80% faster)
3. Database load (should be 70-80% lower)
4. User complaints (should be none, more likely praise!)

# Commands to monitor:
npm run logs  # Real-time logs
curl https://yourapp.com/api/shops/home  # Test endpoint
```

---

## 🚨 ROLLBACK PROCEDURE (If Issues Arise)

If anything goes wrong on production:

### Quick Rollback (< 30 seconds)
```bash
# Restore from backups
cp backend/src/modules/shop/shop.service.js.backup \
   backend/src/modules/shop/shop.service.js
cp backend/src/modules/item/item.service.js.backup \
   backend/src/modules/item/item.service.js
cp backend/src/modules/order/order.service.js.backup \
   backend/src/modules/order/order.service.js
cp backend/src/utils/cache.manager.js.backup \
   backend/src/utils/cache.manager.js

# Restart
npm run build
npm start

# Verify old code is running
```

### Long Rollback (with git)
```bash
git log --oneline | head -5
# Find the commit before your deployment
git revert <commit-hash>
git push origin main
```

---

## ✅ FINAL CHECKLIST BEFORE PRODUCTION

- [ ] All local tests pass
- [ ] Staging deployment successful
- [ ] Load test completed (response time < 500ms)
- [ ] No errors in staging logs
- [ ] Backup files created (shop, item, order, cache)
- [ ] Monitoring dashboard ready
- [ ] Seller app status confirmed (not affected)
- [ ] Team notified of deployment plan
- [ ] Rollback procedure documented

---

## 📊 WHAT TO EXPECT AFTER DEPLOYMENT

### Immediate (First Hour)
- ✅ Home page loads in ~300-500ms (was 2.5-3s)
- ✅ Shop browse in ~200-400ms (was 1.8-2.5s)
- ✅ Add to cart in ~150-200ms (was 800ms)
- ✅ Get orders in ~150-300ms (was 1.2-1.5s)

### Database Metrics
- ✅ Query count reduced by 70-80%
- ✅ Database CPU usage down
- ✅ Cost reduction visible this month

### User Experience
- 🎉 App feels snappy/instant
- 🎉 Less loading spinners
- 🎉 Better on slow networks (India)

---

## ❓ COMMON QUESTIONS

### Q: Will this affect the Seller App?
A: **No!** We're only changing the USER app backend code. Seller app continues with its own backend.

### Q: What if Seller App shares some backend code?
A: Make sure you ONLY update the USER app backend files. Seller backend should be separate.

### Q: Can I deploy both at the same time?
A: **Not yet.** Test Seller app compatibility first, then deploy separately.

### Q: What about the denormalization?
A: We're skipping it for now to avoid affecting Seller. We can add it later once Seller app is optimized too.

### Q: How long will this take?
A:
- Local testing: 30 min
- Staging: 1-2 hours
- Production: 30 min (+ monitoring)

---

## 🆘 TROUBLESHOOTING

### Issue: Tests fail after updating services
```bash
# Copy optimized files again, make sure no merge conflicts
cp backend/OPTIMIZATIONS/shop.service.optimized.js \
   backend/src/modules/shop/shop.service.js

# If still failing:
git checkout backend/src/modules/shop/shop.service.js
npm test  # Should pass with original
```

### Issue: Production endpoint returns error
```bash
# Check logs immediately
npm run logs | grep ERROR

# If batch availability checking fails:
# Make sure user backend is using itemService.checkItemsAvailability()
# Not the old per-item checking method
```

### Issue: Cart operations slow
```bash
# Verify cart.service.js is NOT changed
# Only update the 4 files listed above
# If you changed cart.service.js, rollback it
```

---

## 📞 NEXT STEPS

1. **Backup current files** (Step 3.1)
2. **Copy optimized files** (Step 3.2)
3. **Run tests locally** (Step 3.4)
4. **Test endpoints** (Step 4)
5. **Deploy to staging** (Step 5)
6. **Load test staging** (Step 5.3)
7. **Verify safety** (Step 6)
8. **Deploy to production** (Step 7)
9. **Monitor** (Step 7.3)

**Ready to proceed?** Let me know when you're done with each step!
