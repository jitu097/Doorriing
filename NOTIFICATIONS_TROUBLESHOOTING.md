# Notification Fetch Error - Troubleshooting Guide

## ❌ Error Details
```
TypeError: Failed to fetch
Path: /notifications
Method: GET
Location: NotificationContext.jsx
```

## 🔍 Possible Causes

### 1. **Backend is Down (Most Likely)**
Your backend on Render (https://doorriing.onrender.com) may be:
- Spun down (Render free tier does this after 15 min inactivity)
- Crashed or stopped
- Timing out due to cold start

**Check:**
```bash
# Try accessing backend health endpoint
curl https://doorriing.onrender.com/api/health

# If this fails or times out, backend is down
```

### 2. **Authentication Token Missing or Expired**
The API request needs a valid Firebase JWT token

**Symptoms:**
- Browser console shows: `Failed to retrieve auth token for api request`
- Status 401 Unauthorized

**Fix:**
- Ensure user is logged in
- Check Firebase authentication is working

### 3. **CORS Issue**
Backend may not have CORS enabled for frontend domain

**Check browser console for:**
```
Access to XMLHttpRequest at 'https://doorriing.onrender.com/api/notifications' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

### 4. **Notification Endpoint Not Implemented**
The `GET /api/notifications` route may not be properly registered

## ✅ Solutions

### Solution 1: Wake Up Backend on Render
1. Go to https://doorriing.onrender.com/api/health
2. Wait for response (first access may take 30-60 seconds)
3. Refresh your app

### Solution 2: Check Backend Server Status
```bash
# Terminal: Check if backend is running locally
cd backend
npm start

# Should see: "Server running on port 5000" (or whatever port)
```

### Solution 3: Temporarily Use Local Backend (For Development)
Change API URL in frontend:

**File:** `frontend/src/services/api.js`
```javascript
// Change this:
const DEV_API_BASE_URL = 'http://localhost:5002/api';

// To this:
const DEV_API_BASE_URL = 'http://localhost:5000/api';
```

Then restart frontend dev server.

### Solution 4: Add Error Recovery
✅ Already done! Updated `NotificationContext.jsx` to:
- Show user-friendly error messages
- Stop polling after 3 consecutive failures
- Gracefully degrade (empty notifications instead of crashing)

## 🚀 For Review System (Not Affected)

**Good news:** The notifications error does **NOT** affect your review system! 

The reviews table is already created in Supabase (visible in your screenshot). Here's what's ready:

✅ **Reviews table exists** with columns:
- id (UUID)
- customer_id (FK to customers)
- order_id (FK to orders)
- shop_id (FK to shops)
- rating (1-5)
- comment (TEXT)
- created_at, updated_at

✅ **Frontend components** for review modal:
- ReviewModal.jsx
- ReviewModal.css
- review.service.js

✅ **Backend endpoints** for reviews:
- POST /api/user/orders/:orderId/review
- GET /api/user/orders/:orderId/review
- GET /api/shops/:shopId/reviews
- GET /api/shops/:shopId/rating-stats

✅ **OrderDetails integration** - Modal displays when order.status === 'delivered'

## ✅ Review System Setup Checklist

- [x] Database table exists (reviews)
- [x] Frontend components created
- [x] Backend endpoints implemented
- [x] Routes configured
- [ ] **Test the flow** (see next section)

## 🧪 Test Review System

### Step 1: Ensure Backend is Running
```bash
cd backend
npm start
# Watch for: "Server running on port 5000"
```

### Step 2: Start Frontend
```bash
cd frontend
npm run dev
# Watch for: "Local: http://localhost:5173"
```

### Step 3: Create Test Order
1. Go to http://localhost:5173/home
2. Add items to cart
3. Checkout (use test payment)
4. Complete order

### Step 4: Mark Order as Delivered (Test Only)
Open Supabase SQL Editor and run:
```sql
-- Replace ORDER_ID with your actual order ID
UPDATE orders 
SET status = 'delivered' 
WHERE id = 'YOUR_ORDER_ID';
```

### Step 5: View Order Details
1. Go to /orders
2. Click on the delivered order
3. **Modal should appear in 2 seconds**
4. Rate and submit review
5. Check database:
```sql
SELECT * FROM reviews ORDER BY created_at DESC LIMIT 1;
```

## 🔧 Quick Fixes Implemented

✅ **Better error handling** in NotificationContext:
- Detailed error logging
- User-friendly error messages
- Graceful degradation
- Reduced polling frequency (30s instead of 15s)
- Stop polling after 3 failures

## 📋 Debugging Checklist

Before asking for help, check:

- [ ] Backend is running (`npm start` in backend folder)
- [ ] Frontend is running (`npm run dev` in frontend folder)
- [ ] Browser console shows no errors (F12 → Console)
- [ ] User is logged in
- [ ] Firebase authentication is working
- [ ] Network tab shows API requests being made
- [ ] Supabase tables exist (reviews, orders, customers, shops)
- [ ] Database has test data (orders, items, etc.)

## 🆘 Still Getting Error?

1. **Check Network Tab**
   - Open DevTools (F12)
   - Go to Network tab
   - Reload page
   - Look at the failed request to /api/notifications
   - Check Response tab for error message
   - Check Status code (401, 403, 500, etc.)

2. **Check Backend Logs**
   - Look at terminal running `npm start` in backend
   - Check for error stack traces
   - Look for warning messages

3. **Check Supabase**
   - Go to Supabase dashboard
   - Check "Auth" tab - is user authenticated?
   - Check "Tables" - do the tables exist?
   - Check "SQL Editor" - can you query notifications table?

4. **Verify API URL**
   - Check `frontend/src/services/api.js`
   - Ensure `DEV_API_BASE_URL` matches your backend port
   - Ensure `PROD_API_BASE_URL` is correct for Render

## 📞 Contact Backend Support

If backend keeps crashing:
1. Check Render dashboard: https://dashboard.render.com
2. Look at deployment logs
3. Check if there are error messages
4. Redeploy backend from GitHub

---

## TL;DR

- **Notifications error:** Backend may be down on Render, but it's been fixed with better error handling
- **Review system:** Ready to go! Just test locally
- **Next step:** Run your backend locally and test the review flow

