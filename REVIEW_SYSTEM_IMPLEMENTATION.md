# In-App Review Modal Implementation Guide

## Overview
Implemented a complete in-app review system that displays a modal when an order is delivered. Customers can rate orders (1-5 stars) and leave optional comments, which are saved to the database.

## Frontend Implementation

### 1. **ReviewModal Component** (`frontend/src/components/common/ReviewModal.jsx`)
- **Features**:
  - Star rating picker (1-5 stars) with hover effects
  - Optional comment textarea (max 500 characters)
  - Character counter
  - Skip/Submit buttons
  - Loading state during submission
  - Error message display
  
- **Props**:
  - `orderId` (string): Order ID
  - `shopName` (string): Shop name to display in header
  - `onClose` (function): Callback when modal is closed
  - `onSubmit` (function): Callback when review is submitted

- **UI Features**:
  - Smooth animations (fade-in, slide-up)
  - Mobile responsive design
  - Orange (#FF9500) accent color matching app theme
  - Accessibility features (aria-labels, proper button types)

### 2. **ReviewModal Styling** (`frontend/src/components/common/ReviewModal.css`)
- Modal overlay with semi-transparent backdrop
- Centered card design with shadow effects
- Star animation with scale effects on hover
- Button hover states
- Mobile optimization with responsive padding

### 3. **Review Service** (`frontend/src/services/review.service.js`)
Provides API wrapper functions:
- `submitOrderReview(orderId, rating, comment)` - Submit review
- `getOrderReview(orderId)` - Fetch review if it exists

### 4. **OrderDetails Integration** (`frontend/src/pages/orders/OrderDetails.jsx`)
**Modified sections**:
- Added imports for ReviewModal and review service
- Added state variables:
  - `showReviewModal` - Controls modal visibility
  - `reviewSubmitted` - Prevents duplicate modals
  - `reviewLoading` - Shows loading state
  
- **Logic**:
  - Monitors order status with each fetch
  - When status becomes 'delivered', shows modal after 2-second delay
  - Handles review submission and closes modal
  - Prevents showing modal if already submitted

## Backend Implementation

### 1. **Review Service** (`backend/src/services/review.service.js`)
Core business logic for reviews:
- `createReview(customerId, orderId, rating, comment)` - Create review with validation
- `getOrderReview(customerId, orderId)` - Fetch order review
- `getShopReviews(shopId, page, pageSize)` - Fetch all shop reviews with pagination
- `getShopRatingStats(shopId)` - Get average rating and breakdown

**Validation**:
- Rating must be 1-5 and integer
- Order must belong to customer
- Order must be in 'delivered' status
- Prevents duplicate reviews per order
- Validates order exists in database

### 2. **Review Controller** (`backend/src/modules/review/review.controller.js`)
HTTP request handlers:
- `submitReview` - POST /api/user/orders/:orderId/review
  - Validates rating (1-5)
  - Calls review service
  - Returns appropriate error codes
  - 201 for success, 400/403/404/409 for errors

- `getReview` - GET /api/user/orders/:orderId/review
  - Returns review if exists
  - 404 if no review found

- `getShopReviews` - GET /api/shops/:shopId/reviews
  - Returns paginated shop reviews
  - Supports page and page_size query params

- `getShopRatingStats` - GET /api/shops/:shopId/rating-stats
  - Returns average rating, total count, and breakdown

### 3. **API Routes**

**Order Review Routes** (`backend/src/routes/order.routes.js`):
```
POST   /api/user/orders/:orderId/review       - Submit review
GET    /api/user/orders/:orderId/review       - Get review for order
```

**Shop Review Routes** (`backend/src/modules/shop/shop.routes.js`):
```
GET    /api/shops/:shopId/reviews            - Get shop reviews (paginated)
GET    /api/shops/:shopId/rating-stats       - Get shop rating statistics
```

### 4. **Database Schema** (`backend/add-reviews-table.sql`)
Creates `reviews` table with:
- **Columns**:
  - `id` (UUID, PRIMARY KEY)
  - `customer_id` (UUID, FK to customers)
  - `order_id` (UUID, FK to orders)
  - `shop_id` (UUID, FK to shops)
  - `rating` (INTEGER, 1-5)
  - `comment` (TEXT, optional)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

- **Constraints**:
  - Unique constraint on order_id (one review per order)
  - Foreign keys with CASCADE delete
  - CHECK constraint for rating range

- **Indexes**:
  - customer_id
  - order_id
  - shop_id
  - created_at (DESC)

- **Row Level Security**:
  - Customers can only view/insert their own reviews
  - Public can read all reviews

## Setup Instructions

### 1. Create Database Table
Execute the SQL migration:
```bash
# Using psql or Supabase SQL editor
psql -U postgres -d your_database -f backend/add-reviews-table.sql

# Or copy-paste the SQL from backend/add-reviews-table.sql into Supabase SQL editor
```

### 2. Verify Frontend Setup
- ReviewModal.jsx and ReviewModal.css are created
- review.service.js is created
- OrderDetails.jsx is updated
- All imports are correct

### 3. Verify Backend Setup
- review.service.js in backend/src/services/
- review.controller.js in backend/src/modules/review/
- Routes are added to order.routes.js and shop.routes.js
- Review controller is imported correctly

### 4. Test the Flow
1. **Place an order**:
   - Navigate to home page
   - Add items to cart
   - Complete checkout with any payment method
   
2. **Deliver the order** (in production):
   - Admin/Shop updates order status to 'delivered'
   
3. **View review modal**:
   - Open order details page (OrderDetails)
   - Wait for order to be delivered
   - Modal should appear after 2 seconds
   - Rate and comment on order
   - Submit review

4. **Verify database**:
   - Check reviews table for new entry
   - Verify rating and comment are saved

## API Endpoints Reference

### Submit Review
```
POST /api/user/orders/:orderId/review
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Great quality and fast delivery!"
}

Response (201):
{
  "success": true,
  "data": {
    "id": "uuid",
    "success": true
  },
  "message": "Review submitted successfully"
}
```

### Get Review
```
GET /api/user/orders/:orderId/review
Authorization: Bearer <jwt_token>

Response (200):
{
  "success": true,
  "data": {
    "rating": 5,
    "comment": "Great quality!",
    "createdAt": "2024-01-20T10:30:00Z"
  },
  "message": "Review fetched successfully"
}

Response (404):
{
  "success": false,
  "message": "Review not found"
}
```

### Get Shop Reviews
```
GET /api/shops/:shopId/reviews?page=1&page_size=10

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Best quality",
      "created_at": "2024-01-20T10:30:00Z",
      "customers": { "name": "John Doe" }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "pages": 10
  }
}
```

### Get Shop Rating Stats
```
GET /api/shops/:shopId/rating-stats

Response (200):
{
  "success": true,
  "data": {
    "averageRating": 4.5,
    "totalReviews": 50,
    "ratingBreakdown": {
      "1": 2,
      "2": 3,
      "3": 5,
      "4": 15,
      "5": 25
    }
  }
}
```

## Error Handling

### Frontend
- Missing rating: Shows "Please select a rating" error
- API errors: Displays error message from backend
- Failed submission: Allows retry

### Backend
- Invalid rating: 400 Bad Request
- Order not found: 404 Not Found
- Unauthorized: 403 Forbidden (order doesn't belong to customer)
- Already reviewed: 409 Conflict
- Order not delivered: 400 Bad Request

## Future Enhancements

1. **Shop Reviews Display**
   - Show review modal on shop detail page
   - Display average rating in shop card
   - Add reviews section to shop page

2. **Customer Review Management**
   - Edit/delete review capability
   - Add helpful reactions (thumbs up/down)
   - Filter reviews by rating

3. **Admin Dashboard**
   - Review moderation
   - Flag inappropriate reviews
   - Analytics on shop ratings

4. **Notifications**
   - Shop notified when review submitted
   - Email to customer requesting review (24h after delivery)
   - SMS reminder option

5. **Review Response**
   - Shop owners can respond to reviews
   - Customer notification on response
   - Conversation thread

## Troubleshooting

### Modal not showing
- Check browser console for errors
- Verify order status is exactly 'delivered'
- Check ReviewModal component is imported
- Verify showReviewModal state is true

### Review not saving
- Check API endpoint is registered correctly
- Verify JWT token is valid
- Check database table exists
- Verify supabase RLS policies are correct
- Check browser Network tab for 500 errors

### Missing database table
- Run the SQL migration script
- Check Supabase SQL editor for any errors
- Verify foreign key references exist
- Check RLS policies are enabled

## File Summary

| File | Purpose |
|------|---------|
| `frontend/src/components/common/ReviewModal.jsx` | Review modal UI component |
| `frontend/src/components/common/ReviewModal.css` | Modal styling |
| `frontend/src/services/review.service.js` | API wrapper for reviews |
| `frontend/src/pages/orders/OrderDetails.jsx` | Integration with order details |
| `backend/src/services/review.service.js` | Business logic |
| `backend/src/modules/review/review.controller.js` | HTTP handlers |
| `backend/src/routes/order.routes.js` | Order review endpoints |
| `backend/src/modules/shop/shop.routes.js` | Shop review endpoints |
| `backend/add-reviews-table.sql` | Database schema |

