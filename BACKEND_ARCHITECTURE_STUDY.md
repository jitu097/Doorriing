# Backend Architecture Study: Frontend-Backend-Database Connection

## 1. PROJECT STRUCTURE OVERVIEW

### Backend Folder Structure
```
backend/
├── src/
│   ├── app.js                 # Express app setup (middleware, routes)
│   ├── server.js              # Server entry point
│   ├── config/                # Configuration files
│   │   ├── supabaseClient.js  # Database (Supabase) connection
│   │   ├── firebaseAdmin.js   # Firebase admin setup
│   │   └── env.js             # Environment variables
│   ├── routes/                # API route definitions
│   │   ├── index.js           # Main router that combines all routes
│   │   ├── cart.routes.js     # Shopping cart routes
│   │   ├── order.routes.js    # Order routes
│   │   └── monitoring.routes.js
│   ├── controllers/           # Handle business logic
│   │   ├── cart.controller.js # Cart logic
│   │   └── order.controller.js # Order logic
│   ├── services/              # Database interactions
│   │   ├── cart.service.js    # Cart database operations
│   │   └── order.service.js   # Order database operations
│   ├── middlewares/           # Express middleware
│   │   ├── auth.middleware.js # Authentication check
│   │   ├── error.middleware.js # Error handling
│   │   └── performance.middleware.js
│   └── utils/                 # Utility functions
│       ├── response.js        # Standard response formatting
│       ├── logger.js          # Logging
│       └── razorpay.js        # Payment processing
├── package.json               # Dependencies (Express, Supabase, Firebase)
├── nodemon.json               # Development server config
└── .env                       # Secrets (API keys, DB credentials)
```

---

## 2. HOW COMPONENTS INTERACT

### Architecture Flow Diagram
```
┌─────────────────┐
│   FRONTEND      │ (React App)
│   (React/Vue)   │
└────────┬────────┘
         │ HTTP Requests (fetch/axios)
         ▼
    "/api/cart"
    "/api/orders"
┌────────────────────────┐
│   BACKEND - EXPRESS    │ (Node.js)
│   ┌──────────────────┐ │
│   │   app.js         │ │ Setup middleware, CORS, auth
│   │   (13 lines)     │ │
│   └────────┬─────────┘ │
│            ▼           │
│   ┌──────────────────┐ │
│   │  routes/index.js │ │ Route definitions
│   │                  │ │ /api/cart, /api/orders
│   └────────┬─────────┘ │
│            ▼           │
│   ┌──────────────────┐ │
│   │  controllers/    │ │ Business logic
│   │  *controller.js  │ │ Validate, process requests
│   └────────┬─────────┘ │
│            ▼           │
│   ┌──────────────────┐ │
│   │  services/       │ │ Database operations
│   │  *service.js     │ │ Query, insert, update
│   └────────┬─────────┘ │
└─────────────┼───────────┘
              │ SQL Queries
              ▼
    ┌──────────────────────┐
    │   SUPABASE           │ (PostgreSQL DB)
    │   (Database)         │
    │                      │
    │ Tables:              │
    │ - carts              │
    │ - cart_items         │
    │ - items              │
    │ - orders             │
    │ - customers          │
    │ - shops              │
    └──────────────────────┘
```

---

## 3. EXAMPLE: ADD TO CART FLOW

### Step-by-Step: Frontend → Backend → Database

#### Step 1: Frontend (CartContext.jsx)
```javascript
// User clicks "Add to Cart" button
const addToCart = async (item) => {
    if (!isAuthenticated) {
        navigate('/login');
        return;
    }

    try {
        // 1. Extract item ID
        const payloadItemId = item.id ?? item.itemId;
        
        // 2. Call backend API
        const response = await cartService.addToCart(
            item.shopId,        // Which shop this item is from
            payloadItemId,      // Which item
            1                   // Quantity
        );
        
        // 3. Update local state (optimistic update)
        setCartItems([...cartItems, { ...item, quantity: 1 }]);
        
    } catch (error) {
        console.error('Failed to add to cart:', error);
    }
};
```

#### Step 2: Frontend Service (services/cart.service.js)
```javascript
addToCart: async (shopId, itemId, quantity = 1) => {
    // This calls the backend API endpoint: POST /api/cart/add
    return api.post('/cart/add', { 
        item_id: itemId, 
        quantity: quantity 
    });
};
```

#### Step 3: Frontend API Call (services/api.js)
```javascript
// The api.post() method makes an HTTP request:
POST http://localhost:5002/api/cart/add
Headers:
  - Content-Type: application/json
  - Authorization: Bearer <firebase_token>

Body:
{
  "item_id": "item-123",
  "quantity": 1
}
```

#### Step 4: Backend Route (routes/cart.routes.js)
```javascript
// This route receives the request
router.post('/add', cartController.addToCart);
// Routes to: cartController.addToCart()
```

#### Step 5: Backend Controller (controllers/cart.controller.js)
```javascript
async addToCart(req, res) {
    try {
        // 1. Get authenticated user
        const { customerId } = req.user;  // From auth middleware
        
        // 2. Get item details from request
        const { itemId, quantity = 1 } = req.body;
        
        // 3. Validate
        if (!customerId) {
            return sendError(res, 'Customer not found', 401);
        }
        if (!itemId) {
            return sendError(res, 'Item ID is required', 400);
        }
        
        // 4. Call service layer for database operations
        const result = await cartService.addToCart(
            customerId, 
            itemId, 
            quantity
        );
        
        // 5. Send response back to frontend
        return sendSuccess(res, result, 'Item added to cart');
        
    } catch (error) {
        return sendError(res, error.message, 500);
    }
}
```

#### Step 6: Backend Service (services/cart.service.js)
```javascript
async addToCart(customerId, itemId, quantity = 1) {
    // 1. Fetch item from database to get shop_id and price
    const { data: item } = await supabase
        .from('items')
        .select('id, shop_id, price, is_available')
        .eq('id', itemId)
        .single();

    if (!item.is_available) throw new Error('Item is unavailable');

    // 2. Check if customer has an active cart
    const { data: activeCart } = await supabase
        .from('carts')
        .select('id, shop_id')
        .eq('customer_id', customerId)
        .maybeSingle();

    let cartId;
    
    if (activeCart) {
        // Cart exists
        if (activeCart.shop_id !== item.shop_id) {
            throw new Error('Cannot add items from different shops');
        }
        cartId = activeCart.id;
    } else {
        // Create new cart
        const { data: newCart } = await supabase
            .from('carts')
            .insert({
                customer_id: customerId,
                shop_id: item.shop_id
            })
            .select('id')
            .single();
        cartId = newCart.id;
    }

    // 3. Check if item already in cart
    const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('item_id', itemId)
        .maybeSingle();

    if (existingItem) {
        // Update quantity
        await supabase
            .from('cart_items')
            .update({ quantity: existingItem.quantity + quantity })
            .eq('id', existingItem.id);
    } else {
        // Insert new cart item
        await supabase
            .from('cart_items')
            .insert({
                cart_id: cartId,
                item_id: itemId,
                quantity: quantity,
                unit_price: item.price
            });
    }

    return { success: true, message: 'Item added to cart' };
}
```

#### Step 7: Database (Supabase PostgreSQL)
```sql
-- Tables involved:

-- 1. items table
SELECT id, shop_id, price, is_available FROM items WHERE id = 'item-123';

-- 2. carts table (if doesn't exist, create new)
INSERT INTO carts (customer_id, shop_id) VALUES ('cust-456', 'shop-789');

-- 3. cart_items table
INSERT INTO cart_items (cart_id, item_id, quantity, unit_price)
VALUES ('cart-111', 'item-123', 1, 299.99);
```

#### Step 8: Response Back to Frontend
```javascript
// Backend sends this JSON response:
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "success": true,
    "message": "Item added to cart"
  }
}

// Frontend receives and updates UI
```

---

## 4. KEY ENDPOINTS AND EXAMPLES

### 4.1 CART ENDPOINTS
| Method | Endpoint | Purpose | Example |
|--------|----------|---------|---------|
| GET | `/api/cart` | Fetch customer's cart | `fetch('/api/cart')` |
| POST | `/api/cart/add` | Add item to cart | `POST { item_id, quantity }` |
| PATCH | `/api/cart/update` | Update item quantity | `PATCH { item_id, quantity }` |
| DELETE | `/api/cart/remove/:itemId` | Remove item from cart | `DELETE /api/cart/remove/item-123` |
| DELETE | `/api/cart/clear` | Clear entire cart | `DELETE /api/cart/clear` |

### 4.2 ORDER ENDPOINTS
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/user/orders/checkout` | Create order from cart |
| GET | `/api/user/orders` | Fetch all user orders |
| GET | `/api/user/orders/:id` | Get specific order details |
| PATCH | `/api/user/orders/:id/cancel` | Cancel an order |
| POST | `/api/user/orders/initiate-payment` | Start payment process |
| POST | `/api/user/orders/verify-payment` | Verify payment |

### 4.3 OTHER ENDPOINTS
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/categories` | Get all categories |
| GET | `/api/items` | Get items (filtered by shop/category) |
| GET | `/api/shops` | Get all shops |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |

---

## 5. DEPENDENCIES AND TECHNOLOGIES

### Backend Dependencies (package.json)
```json
{
  "dependencies": {
    "express": "4.18.2",              // Web framework
    "@supabase/supabase-js": "2.39.0", // Database client
    "firebase-admin": "12.0.0",        // Auth & notifications
    "razorpay": "2.9.6",               // Payment processing
    "cors": "2.8.5",                   // Cross-Origin Resource Sharing
    "compression": "1.8.1",            // Response compression
    "dotenv": "16.3.1",                // Environment variables
    "ws": "8.18.3",                    // WebSockets (real-time updates)
    "node-fetch": "2.7.0"              // HTTP requests
  }
}
```

### Frontend APIs Used
```javascript
// services/api.js provides helper functions

api.get(path, options)      // GET request
api.post(path, body)        // POST request
api.put(path, body)         // PUT request
api.patch(path, body)       // PATCH request
api.delete(path, options)   // DELETE request

// All requests include:
- Firebase authentication token
- Base URL: http://localhost:5002/api (dev)
- Error handling and retry logic
```

---

## 6. AUTHENTICATION FLOW

### Firebase Authentication
```
1. User signs up/logs in via Firebase (Google, Email, etc.)
   └─→ Frontend stores Firebase ID token in localStorage

2. Every API request includes: Authorization: Bearer <token>
   
3. Backend verifies token with Auth Middleware
   └─→ authenticate middleware (auth.middleware.js)
   
4. If valid, extracts user info and attaches to req.user
   └─→ req.user.customerId is available in all routes
   
5. If invalid, returns 401 Unauthorized
```

### Example Request with Auth:
```javascript
// Frontend request
fetch('/api/cart', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...'
  }
})

// Backend validation
async authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  // Verify with Firebase
  const decodedToken = await admin.auth().verifyIdToken(token);
  req.user = { customerId: decodedToken.uid, ... };
  
  next();
}
```

---

## 7. ERROR HANDLING

### Response Format
```javascript
// Success Response
{
  "success": true,
  "message": "Item added to cart",
  "data": { /* actual data */ }
}

// Error Response
{
  "success": false,
  "message": "Item not found",
  "error": "404"
}
```

### Error Middleware
```javascript
// If any error is thrown in controllers:
app.use(errorHandler);  // Catches and formats errors

// Returns appropriate HTTP status codes:
- 400: Bad request (validation error)
- 401: Unauthorized (not authenticated)
- 404: Not found
- 500: Server error
```

---

## 8. DATABASE SCHEMA (Supabase)

### Main Tables
```sql
-- Users table
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  phone VARCHAR,
  created_at TIMESTAMP
);

-- Shops table
CREATE TABLE shops (
  id UUID PRIMARY KEY,
  name VARCHAR,
  business_type VARCHAR, -- 'grocery', 'restaurant'
  location POINT
);

-- Items table
CREATE TABLE items (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  name VARCHAR,
  price DECIMAL,
  is_available BOOLEAN
);

-- Carts table
CREATE TABLE carts (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  shop_id UUID REFERENCES shops(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Cart Items table
CREATE TABLE cart_items (
  id UUID PRIMARY KEY,
  cart_id UUID REFERENCES carts(id),
  item_id UUID REFERENCES items(id),
  quantity INTEGER,
  unit_price DECIMAL
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  status VARCHAR, -- 'pending', 'confirmed', 'cancelled'
  payment_status VARCHAR, -- 'pending', 'paid'
  total_amount DECIMAL,
  created_at TIMESTAMP
);
```

---

## 9. MIDDLEWARE STACK

### Execution Order (in app.js)
```
Request comes in
  ↓
1. Compression Middleware
  ↓
2. CORS Middleware (allow cross-origin requests)
  ↓
3. Body Parser (parse JSON)
  ↓
4. Performance Monitor (track response time)
  ↓
5. Request Logger (log incoming requests)
  ↓
6. Routes & Controllers
  ↓
7. 404 Handler (if route not found)
  ↓
8. Error Handler (catch any errors)
  ↓
Response sent back to Frontend
```

---

## 10. FLOW SUMMARY TABLE

| Step | Location | Action | Code |
|------|----------|--------|------|
| 1 | Frontend (React) | User clicks "Add to Cart" | `addToCart(item)` |
| 2 | CartContext.jsx | Prepare data, call service | `cartService.addToCart()` |
| 3 | cart.service.js | Make HTTP POST request | `api.post('/cart/add', data)` |
| 4 | api.js | Add auth header, send request | `fetch(url, { headers, body })` |
| 5 | Backend Routes | Route to controller | `router.post('/add', controller)` |
| 6 | cart.controller.js | Validate, extract data | `const { itemId } = req.body` |
| 7 | cart.service.js | Query database | `supabase.from('items').select()` |
| 8 | Supabase DB | Return item data | SQL Query Result |
| 9 | cart.service.js | Insert/update cart records | `supabase.from('carts').insert()` |
| 10 | Backend Controller | Format response | `sendSuccess(res, data)` |
| 11 | Frontend Service | Parse JSON response | `response.json()` |
| 12 | CartContext.jsx | Update UI state | `setCartItems([...])` |
| 13 | React Component | Render updated cart | Shows new item in cart |

---

## 11. IMPORTANT NOTES

### Security:
- ✅ Database is NOT exposed to frontend
- ✅ All DB operations go through backend only
- ✅ Authentication token required for protected routes
- ✅ User can only access their own data

### Performance:
- ✅ Response compression enabled
- ✅ Requests are optimized and validated
- ✅ Database queries are specific (no SELECT *)
- ✅ Proper error handling prevents crashes

### Scalability:
- ✅ Service layer separates concerns
- ✅ Easy to add new endpoints
- ✅ Easy to change database without affecting frontend
- ✅ Middleware makes code reusable

---

## 12. HOW TO ADD A NEW FEATURE

Example: Adding "Get All Favorites" endpoint

### Step 1: Database
```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  item_id UUID REFERENCES items(id)
);
```

### Step 2: Backend Service
```javascript
// services/favorite.service.js
export const favoriteService = {
  async getFavorites(customerId) {
    const { data } = await supabase
      .from('favorites')
      .select(`
        items!inner(id, name, price, image),
        created_at
      `)
      .eq('customer_id', customerId);
    return data;
  }
};
```

### Step 3: Backend Controller
```javascript
// controllers/favorite.controller.js
async getFavorites(req, res) {
  try {
    const { customerId } = req.user;
    const favorites = await favoriteService.getFavorites(customerId);
    return sendSuccess(res, favorites, 'Favorites fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}
```

### Step 4: Backend Route
```javascript
// routes/favorite.routes.js
router.get('/', authenticate, favoriteController.getFavorites);
```

### Step 5: Frontend Service
```javascript
// services/favorite.service.js
export const favoriteService = {
  getFavorites: async () => {
    return api.get('/favorites');
  }
};
```

### Step 6: Frontend Component
```javascript
// Components use hook
const { data: favorites } = useQuery('/api/favorites');
```

---

This is the complete architecture of your project! All endpoints follow this same pattern.
