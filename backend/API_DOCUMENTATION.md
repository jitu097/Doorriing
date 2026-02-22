# 📚 User Backend API Documentation

## Base URL
```
http://localhost:5001/api
```

---

## 🔐 Authentication

All protected endpoints require a Firebase ID token in the Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

---

## 📋 API Endpoints

### Health Check
- **GET** `/health` - Server health check

---

## 👤 Auth Module

### Register/Login
- **POST** `/auth/register`
  - **Auth**: Required
  - **Body**:
    ```json
    {
      "full_name": "John Doe",
      "phone": "+1234567890"
    }
    ```
  - Creates customer account if doesn't exist

### Get Profile
- **GET** `/auth/me`
  - **Auth**: Required
  - Returns current customer profile

### Update Profile
- **PUT** `/auth/profile`
  - **Auth**: Required
  - **Body**:
    ```json
    {
      "full_name": "John Doe Updated",
      "phone": "+0987654321"
    }
    ```

---

## 🏪 Shop Module

### List Shops
- **GET** `/shops`
  - **Auth**: Optional
  - **Query Params**:
    - `business_type`: restaurant | grocery
    - `city`: City name
    - `search`: Search by shop name
    - `page`: Page number (default: 1)
    - `page_size`: Items per page (default: 20, max: 100)

### Get Shop by ID
- **GET** `/shops/:id`
  - **Auth**: Optional

### Get Nearby Shops
- **GET** `/shops/nearby`
  - **Auth**: Optional
  - **Query Params** (Required):
    - `latitude`: User latitude
    - `longitude`: User longitude
    - `radius`: Radius in km (default: 10)
    - `business_type`: restaurant | grocery

---

## 🍔 Item Module

### Get Items by Shop
- **GET** `/items/shop/:shopId`
  - **Auth**: Optional
  - **Query Params**:
    - `category_id`: Filter by category
    - `search`: Search by item name
    - `in_stock_only`: true | false
    - `page`: Page number
    - `page_size`: Items per page

### Get Item by ID
- **GET** `/items/:id`
  - **Auth**: Optional

### Get Items by Category
- **GET** `/items/category/:categoryId`
  - **Auth**: Optional
  - **Query Params**:
    - `page`: Page number
    - `page_size`: Items per page

---

## 🛒 Cart Module

### Get Cart
- **GET** `/cart`
  - **Auth**: Required + Customer
  - **Query Params**:
    - `shop_id`: Filter by shop (optional)

### Add Item to Cart
- **POST** `/cart/items`
  - **Auth**: Required + Customer
  - **Body**:
    ```json
    {
      "shop_id": "uuid",
      "item_id": "uuid",
      "quantity": 2
    }
    ```
  - Validates stock availability
  - Auto-updates if item already in cart

### Update Cart Item
- **PUT** `/cart/items/:id`
  - **Auth**: Required + Customer
  - **Body**:
    ```json
    {
      "quantity": 3
    }
    ```
  - Validates stock availability

### Remove Cart Item
- **DELETE** `/cart/items/:id`
  - **Auth**: Required + Customer

### Clear Cart
- **DELETE** `/cart`
  - **Auth**: Required + Customer
  - **Body**:
    ```json
    {
      "shop_id": "uuid"
    }
    ```

---

## 📦 Order Module

### Create Order
- **POST** `/orders`
  - **Auth**: Required + Customer
  - **Body**:
    ```json
    {
      "shop_id": "uuid",
      "customer_name": "John Doe",
      "customer_phone": "+1234567890",
      "delivery_address": "123 Main St, City",
      "payment_method": "cod",
      "delivery_charge": 50
    }
    ```
  - Creates order from cart
  - Clears cart on success
  - Sends notification

### Get Orders
- **GET** `/orders`
  - **Auth**: Required + Customer
  - **Query Params**:
    - `status`: pending | confirmed | preparing | ready | out_for_delivery | delivered | cancelled
    - `shop_id`: Filter by shop
    - `page`: Page number
    - `page_size`: Items per page

### Get Order by ID
- **GET** `/orders/:id`
  - **Auth**: Required + Customer
  - Includes order items

### Cancel Order
- **POST** `/orders/:id/cancel`
  - **Auth**: Required + Customer
  - Cannot cancel delivered or already cancelled orders

---

## 🔔 Notification Module

### Get Notifications
- **GET** `/notifications`
  - **Auth**: Required + Customer
  - **Query Params**:
    - `is_read`: true | false
    - `type`: order | stock | booking | promotion
    - `page`: Page number
    - `page_size`: Items per page

### Get Unread Count
- **GET** `/notifications/unread/count`
  - **Auth**: Required + Customer
  - Returns count of unread notifications

### Mark as Read
- **PUT** `/notifications/:id/read`
  - **Auth**: Required + Customer

### Mark All as Read
- **PUT** `/notifications/read-all`
  - **Auth**: Required + Customer

### Delete Notification
- **DELETE** `/notifications/:id`
  - **Auth**: Required + Customer

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Success message",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": null
}
```

---

## 🔒 Security Features

1. **Firebase Authentication** - All protected routes verify Firebase ID tokens
2. **Customer Scoping** - All queries scoped to authenticated customer
3. **No Data Leakage** - Customers can only access their own data
4. **Stock Validation** - Cart operations validate item availability and stock
5. **Ownership Verification** - Cart and order operations verify ownership

---

## ⚠️ Important Notes

1. **Same Email Different Roles**: A user with the same email can be both a customer and seller
2. **One Cart Per Shop**: Customers can have one active cart per shop
3. **Order Atomicity**: Orders are created atomically with order items
4. **Stock Checking**: Only applies to grocery items with `stock_quantity` field
5. **Notifications**: Auto-created for order placement and status updates

---

## 🚀 Getting Started

1. Copy `.env.example` to `.env` and fill in credentials
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`
4. Server runs on `http://localhost:5001`

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── middlewares/     # Auth, error, role middlewares
│   ├── modules/         # Feature modules
│   │   ├── auth/
│   │   ├── cart/
│   │   ├── item/
│   │   ├── notification/
│   │   ├── order/
│   │   └── shop/
│   ├── routes/          # Route definitions
│   ├── utils/           # Utilities
│   ├── app.js           # Express app
│   └── server.js        # Server entry point
└── package.json
```

---

## 🛠 Tech Stack

- **Node.js** + **Express** - Backend framework
- **Supabase** - PostgreSQL database
- **Firebase Auth** - Authentication
- **ES Modules** - Modern JavaScript
