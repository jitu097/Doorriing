# 🔒 MULTI-CODEBASE SAFETY GUIDE

## Your Current Setup
```
Database (Shared)
    ↓
├─→ User App Backend (Doorriing Customer)
│   └─ backend/ folder
│
└─→ Seller App Backend (Separate)
    └─ vendor-backend/ or seller-backend/ folder
```

---

## ⚠️ CRITICAL: What NOT To Change

### Database Tables (SHARED - DO NOT TOUCH)
```
❌ shops table
❌ items table
❌ categories table
❌ orders table
❌ users table
❌ cart table
```

**Why?** Changing schema would break Seller App.

### Seller App Backend Code
```
❌ vendor-backend/src/
❌ seller-app/backend/src/
❌ Any seller backend repository
```

**Why?** We're only optimizing User App for now.

---

## ✅ What TO Change (USER APP ONLY)

### User App Backend Files (SAFE TO CHANGE)
```bash
backend/src/modules/shop/shop.service.js ✅ CHANGE
backend/src/modules/item/item.service.js ✅ CHANGE
backend/src/modules/order/order.service.js ✅ CHANGE
backend/src/utils/cache.manager.js ✅ CHANGE
```

**Why?** Each app has its own backend instance & cache.

---

## 📋 SAFETY CHECKLIST

Before you start Step 3, verify:

- [ ] You have TWO separate backend codebases
  ```bash
  ls -la /path/to/user-app/backend/
  ls -la /path/to/seller-app/backend/
  # Both should exist and be different
  ```

- [ ] Both use same database
  ```bash
  # Both should point to same SUPABASE_URL
  grep "SUPABASE_URL" /path/to/user-app/backend/.env
  grep "SUPABASE_URL" /path/to/seller-app/backend/.env
  # Should show same URL
  ```

- [ ] You're only modifying User App backend
  ```bash
  # DO NOT change:
  /path/to/seller-app/backend/src/

  # ONLY change:
  /path/to/user-app/backend/src/
  ```

---

## 🚀 DEPLOYMENT STRATEGY

### Phase 1: User App Only (Today)
```
User Backend
├─ Update service files ✅
├─ Update cache manager ✅
├─ Test locally ✅
├─ Deploy to staging ✅
└─ Deploy to production ✅

Seller Backend: NO CHANGES ✓
Database: NO CHANGES ✓
```

### Phase 2: Seller App Later (Next Week)
```
When Seller App is ready:
├─ Test Seller App compatibility
├─ Update Seller backend similarly
├─ Deploy Seller separately
└─ Monitor both apps

Users: Enjoy fast app ✅
Sellers: Continue working as-is (for now) ✅
```

---

## 🔍 FILE COMPARISON

### User App Backend (CHANGE)
```javascript
// backend/src/modules/shop/shop.service.js
❌ OLD: async enrichShopsWithInventory(shops) {
  // Queries ALL items for each shop (N+1 problem)
}

✅ NEW: async enrichShopsWithInventory(shops) {
  // Uses denormalized columns (no extra queries)
}
```

### Seller App Backend (LEAVE UNCHANGED)
```javascript
// vendor-backend/src/modules/shop/shop.service.js
// KEEP AS-IS - Don't touch
// Seller query patterns can be different
```

---

## 📊 DATABASE IMPACT ANALYSIS

### Schema Changes?
```
❌ NO - We skipped denormalization (Step 3)
✅ Safe for Seller App
```

### Index Changes?
```
✅ YES - Added 10 indexes (Step 2)
✅ Safe - Both User & Seller benefit from indexes
✅ No schema changes, just new indexes
```

### Data Changes?
```
❌ NO - No data modifications
✅ Safe for Seller App
```

**Verdict:** 🟢 SAFE - Database changes affect both apps positively

---

## 🔄 IF YOU WANT TO OPTIMIZE SELLER TOO (Later)

### Current (User App Only)
```
1. Create indexes ✅
2. Update User backend ✅
3. Deploy User app ✅
```

### Future (Both Apps)
```
1. Create indexes ✅ (already done)
2. Update User backend ✅ (already done)
3. Update Seller backend ← NEW
4. Deploy Seller app ← NEW
```

**Just repeat Steps 3-7 for Seller app!**

---

## 🛡️ CONFLICT PREVENTION

### Git Safety
```bash
# Make sure you're in the RIGHT folder
cd /path/to/user-app/backend
# NOT in seller-app/backend

# Verify correct folder
pwd
# Should show: .../doorriing/backend or .../user-app/backend
```

### File Paths (Double-Check)
```bash
# ✅ CORRECT
cp backend/OPTIMIZATIONS/shop.service.optimized.js \
   backend/src/modules/shop/shop.service.js

# ❌ WRONG (Don't do this!)
cp backend/OPTIMIZATIONS/shop.service.optimized.js \
   vendor-backend/src/modules/shop/shop.service.js
```

### Env Variables
```bash
# Each app should have its own .env file

# User App
cat /path/to/user-app/backend/.env | grep DATABASE_URL

# Seller App
cat /path/to/seller-app/backend/.env | grep DATABASE_URL

# Both should point to same database - this is correct!
```

---

## ✅ BEFORE YOU START STEP 3

Run this checklist:

```bash
# 1. Confirm you have 2 repos
[ -d "backend" ] && echo "✅ User backend exists"
[ -d "../seller-backend" ] && echo "✅ Seller backend exists" || echo "❌ Seller backend not found"

# 2. Confirm no recent changes to schema
git log --oneline -- backend/src/modules/shop/shop.service.js | head -5
# Should show old commits, nothing recent

# 3. Confirm backups ready
ls -la backend/src/modules/shop/shop.service.js
# File should exist

# 4. Ready to proceed?
echo "✅ Ready for Step 3"
```

---

## 🚨 SAFETY NET: If You Accidentally Change Seller App

If you realize you modified Seller App files:

### Undo Changes
```bash
# Go to Seller repo
cd ../seller-backend

# Restore original files
git checkout src/modules/shop/shop.service.js
git checkout src/modules/item/item.service.js
git checkout src/modules/order/order.service.js
git checkout src/utils/cache.manager.js

# Verify restore
npm test
```

---

## 📞 QUESTIONS BEFORE STEP 3?

- ❓ Where is your Seller App backend?
- ❓ Does it have the same file structure?
- ❓ Does it share the same database?
- ❓ When do you want to optimize it?

**Answer these and we're good to go!**

---

## ✅ READY FOR STEP 3?

When confirmed:
1. You have 2 separate backend repos
2. They share same database (OK)
3. You're only changing User App backend
4. Backups are ready

**Then proceed with:** `STEPS_3_4_5_USER_APP_ONLY.md`

👉 **Ready?** Let me know!
