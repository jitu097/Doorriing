# Review System - Quick Setup & Testing Guide

## ✅ Setup Checklist

### Frontend Files Created
- [ ] `frontend/src/components/common/ReviewModal.jsx` - Modal component
- [ ] `frontend/src/components/common/ReviewModal.css` - Modal styling  
- [ ] `frontend/src/services/review.service.js` - API service
- [ ] `frontend/src/pages/orders/OrderDetails.jsx` - Updated with modal integration

### Backend Files Created
- [ ] `backend/src/services/review.service.js` - Review business logic
- [ ] `backend/src/modules/review/review.controller.js` - Review API handlers
- [ ] `backend/src/routes/order.routes.js` - Updated with review endpoints
- [ ] `backend/src/modules/shop/shop.routes.js` - Updated with shop review endpoints
- [ ] `backend/add-reviews-table.sql` - Database migration

---

## 🗄️ Database Setup

### Step 1: Run SQL Migration
Copy all SQL from `backend/add-reviews-table.sql` and execute in Supabase SQL editor:

```sql
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Click "New Query"
-- 3. Copy-paste the entire content from backend/add-reviews-table.sql
-- 4. Click "Run"
-- 5. Verify "Success" message
```

### Step 2: Verify Table Creation
```sql
-- Check if reviews table exists
SELECT * FROM information_schema.tables WHERE table_name = 'reviews';

-- Check table structure
\d reviews;
```

---

## 🧪 Testing the Implementation

### Test Case 1: Submit a Review (Happy Path)

1. **Start Dev Servers**
   ```bash
   # Terminal 1: Frontend
   cd frontend
   npm run dev
   # Should run on http://localhost:5173

   # Terminal 2: Backend  
   cd backend
   npm start
   # Should run on http://localhost:5000
   ```

2. **Create a Test Order**
   - Open http://localhost:5173/home
   - Add items to cart
   - Complete checkout
   - Select any delivery address and payment method
   - Confirm order

3. **Manually Update Order Status** (Test)
   - Open Supabase SQL Editor
   - Run: `UPDATE orders SET status = 'delivered' WHERE id = '<your_order_id>';`
   - Note: In production, this happens when shop/admin updates status

4. **View Review Modal**
   - Open order details page (click on order in /orders)
   - Wait 2 seconds
   - Modal should appear with:
     - "How was your experience?" heading
     - 5 stars for rating
     - Comment textarea
     - Skip and Submit buttons

5. **Submit Review**
   - Click 3rd star (Good)
   - Type: "Great quality!"
   - Click "Submit Review"
   - Modal should close
   - Check browser Network tab → POST /api/user/orders/{id}/review should show 201

6. **Verify Database**
   ```sql
   -- Check if review was saved
   SELECT * FROM reviews WHERE order_id = '<your_order_id>';
   ```

---

### Test Case 2: Modal Not Showing (Troubleshooting)

**If modal doesn't appear after 2 seconds:**

1. **Check Browser Console**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for any red errors
   - Common errors: "ReviewModal is not defined", "Cannot read property 'status'"

2. **Verify Order Status**
   ```sql
   SELECT id, status, customer_id FROM orders LIMIT 5;
   ```
   - Should show at least one order with status = 'delivered'

3. **Check Frontend Logs**
   - In DevTools Network tab, check if `/api/user/orders/{id}` returns status = 'delivered'

4. **Test Modal Display Manually**
   - In browser console, run:
   ```javascript
   // Force show modal
   document.querySelector('[class*="review-modal-overlay"]').style.display = 'flex';
   ```
   - If modal appears, it's a status detection issue
   - If nothing appears, check ReviewModal component import

---

### Test Case 3: API Endpoint Testing

**Using curl or Postman:**

```bash
# 1. Get your customer ID and order ID first
# Check orders table and get an order ID

# 2. Submit Review
curl -X POST http://localhost:5000/api/user/orders/{orderId}/review \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "Excellent service!"}'

# Expected response (201):
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "success": true
  },
  "message": "Review submitted successfully"
}

# 3. Get Review
curl -X GET http://localhost:5000/api/user/orders/{orderId}/review \
  -H "Authorization: Bearer <your_jwt_token>"

# Expected response (200):
{
  "success": true,
  "data": {
    "rating": 5,
    "comment": "Excellent service!",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}

# 4. Get Shop Reviews
curl -X GET "http://localhost:5000/api/shops/{shopId}/reviews?page=1&page_size=5"

# 5. Get Shop Rating Stats
curl -X GET http://localhost:5000/api/shops/{shopId}/rating-stats
```

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Modal not appearing | 1. Verify order status = 'delivered' in database<br>2. Check browser console for errors<br>3. Verify ReviewModal.jsx is imported |
| 404 on /api/user/orders/{id}/review | 1. Check review.controller.js is imported<br>2. Verify routes are added to order.routes.js<br>3. Restart backend server |
| "Order not found" error | 1. Verify orderId is correct<br>2. Check order belongs to current customer<br>3. Verify order exists in database |
| "Order must be delivered" error | 1. Update order status to 'delivered' in database<br>2. Check status value is exactly 'delivered' (case-sensitive) |
| Modal appears but Submit doesn't work | 1. Check backend is running<br>2. Verify JWT token in headers<br>3. Check browser Network tab for 401/403 errors |
| Database table not found | 1. Run add-reviews-table.sql again<br>2. Check Supabase SQL editor for errors<br>3. Verify you have table creation permissions |

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] SQL migration has been run on production database
- [ ] All .jsx and .js files are syntactically correct (check for import errors)
- [ ] Environment variables are set (JWT_SECRET, Supabase credentials)
- [ ] CORS is configured if frontend and backend are on different domains
- [ ] Rate limiting is added to review endpoint (optional but recommended)
- [ ] RLS policies are enabled on reviews table
- [ ] Email notifications to shops are configured (optional)
- [ ] Review moderation system is set up (optional)

---

## 📝 Notes

- Modal appears **2 seconds after** order status becomes 'delivered'
- Users can submit **one review per order**
- Reviews are visible to **all users** once submitted
- Rating must be **1-5** (integer)
- Comment is **optional** and limited to **500 characters**
- Review submission requires **authentication**

---

## 🔗 Related Files

- Full documentation: `REVIEW_SYSTEM_IMPLEMENTATION.md`
- API endpoints: See review controller endpoints
- Database schema: `backend/add-reviews-table.sql`
- Example screenshots: See OrderDetails.jsx integration

