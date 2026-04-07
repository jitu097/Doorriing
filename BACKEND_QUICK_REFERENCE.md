# Backend Architecture Quick Reference Guide

## 1. COMPLETE "ADD TO CART" FLOW WITH ACTUAL CODE

### Frontend → Backend → Database (Complete Example)

#### ⚡ STEP 1: Frontend Component Calls Function
```javascript
// File: frontend/src/context/CartContext.jsx
const addToCart = async (item) => {
  if (!isAuthenticated) {
    navigate('/login');
    return;
  }

  try {
    // Extract the item ID
    const payloadItemId = item.id ?? item.itemId ?? item.serverItemId;
    if (!payloadItemId) {
      throw new Error('Item identifier missing');
    }

    // Create client-side item ID with variant info
    const clientItemId = deriveClientItemId(item, payloadItemId);

    // Check for shop conflicts
    const hasItems = cartItems.length > 0;
    if (hasItems) {
      const firstItem = cartItems[0];
      if (item.shopId && firstItem.shopId && item.shopId !== firstItem.shopId) {
        const confirmMsg = 'Cannot add items from different shops. Clear cart?';
        if (window.confirm(confirmMsg)) {
          await cartService.clearCart(firstItem.shopId);
          await fetchCart();
        } else {
          return;
        }
      }
    }

    // Optimistically update UI
    setCartItems(prev => {
      const exists = prev.find(i => deriveClientItemId(i) === clientItemId);
      if (exists) {
        return prev.map(i =>
          deriveClientItemId(i) === clientItemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, {
        ...item,
        id: payloadItemId,
        clientItemId,
        quantity: 1,
        cartItemId: `temp-${Date.now()}`
      }];
    });

    // Send request to backend
    const result = await cartService.addToCart(item.shopId, payloadItemId, 1);

    // Verify by refetching cart
    await fetchCart();

  } catch (error) {
    console.error('Error adding to cart:', error);
    setError(error.message);
  }
};
```

#### 📡 STEP 2: Frontend Service Makes HTTP Request
```javascript
// File: frontend/src/services/cart.service.js
export const cartService = {
  /**
   * Add item to cart
   * @param {string} shopId 
   * @param {string} itemId 
   * @param {number} quantity 
   * @returns {Promise}
   */
  addToCart: async (shopId, itemId, quantity = 1) => {
    // Calls backend: POST /api/cart/add
    return api.post('/cart/add', { 
      item_id: itemId, 
      quantity: quantity 
    });
  }
};
```

#### 🔌 STEP 3: API Helper Adds Auth Header and Sends HTTP Request
```javascript
// File: frontend/src/services/api.js
const apiRequest = async (path, { method = 'GET', params, body, headers = {} } = {}) => {
  const url = buildUrl(path, params);

  // Get Firebase auth token
  let authHeaders = {};
  try {
    await auth.authStateReady();
    const currentUser = auth?.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken(false);
      authHeaders = { Authorization: `Bearer ${token}` };
    }
  } catch (e) {
    console.warn('Failed to retrieve auth token', e);
  }

  // Build request
  const requestInit = {
    method,
    headers: {
      'Accept': 'application/json',
      ...authHeaders,
      ...headers,
    },
  };

  if (body !== undefined && body !== null) {
    requestInit.body = JSON.stringify(body);
    requestInit.headers['Content-Type'] = 'application/json';
  }

  // Send request
  const response = await fetch(url, requestInit);

  if (!response.ok) {
    throw await formatError(response);
  }

  const payload = await response.json();

  if (payload?.success === false) {
    const error = new Error(payload.message || 'Request failed');
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
```

#### ⚙️ STEP 4: Backend Route Receives Request
```javascript
// File: backend/src/routes/cart.routes.js
import express from 'express';
import { cartController } from '../controllers/cart.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply auth to all routes
router.use(authenticate);

// Route: POST /api/cart/add
router.post('/add', cartController.addToCart);

router.get('/', cartController.getCart);
router.patch('/update', cartController.updateCartItem);
router.delete('/remove/:itemId', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

export default router;
```

#### 🎯 STEP 5: Backend Controller Validates and Processes
```javascript
// File: backend/src/controllers/cart.controller.js
import { cartService } from '../services/cart.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const cartController = {
  /**
   * Add item to cart
   * Endpoint: POST /api/cart/add
   */
  async addToCart(req, res) {
    try {
      // 1. Get authenticated user
      const { customerId } = req.user;  // From auth.middleware.js

      // 2. Get item ID and quantity from request body
      const { itemId, quantity = 1 } = req.body;

      // 3. Validate input
      if (!customerId) {
        return sendError(res, 'Customer not found. Please log in.', 401);
      }

      if (!itemId) {
        return sendError(res, 'Item ID is required', 400);
      }

      // 4. Call service to add to database
      const result = await cartService.addToCart(customerId, itemId, quantity);

      // 5. Send success response
      return sendSuccess(res, result, 'Item added to cart');

    } catch (error) {
      logger.error('Error adding to cart:', { error: error.message });
      
      // Handle specific errors
      if (error.message.includes('from different shops')) {
        return sendError(res, error.message, 400);
      }
      
      return sendError(res, error.message || 'Failed to add item to cart', 500);
    }
  }
};
```

#### 💾 STEP 6: Backend Service Interacts with Database
```javascript
// File: backend/src/services/cart.service.js
import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';

export const cartService = {
  /**
   * Add an item to cart. Creates cart if needed.
   * @param {string} customerId - Customer ID
   * @param {string} itemId - Item ID to add
   * @param {number} quantity - Quantity to add
   * @returns {Promise<Object>}
   */
  async addToCart(customerId, itemId, quantity = 1) {
    try {
      // STEP A: Fetch item details from database
      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id, shop_id, price, is_available')
        .eq('id', itemId)
        .single();  // Expect exactly one result

      if (itemError) throw new Error('Item not found');
      if (!item.is_available) throw new Error('Item is currently unavailable');

      const shopId = item.shop_id;
      const unitPrice = item.price;

      // STEP B: Check if customer already has active cart
      const { data: activeCart, error: cartError } = await supabase
        .from('carts')
        .select('id, shop_id')
        .eq('customer_id', customerId)
        .maybeSingle();  // Can return null if no result

      let cartId;

      if (activeCart) {
        // Cart already exists - check if same shop
        if (activeCart.shop_id !== shopId) {
          throw new Error('Cannot add items from different shops to the same cart');
        }
        cartId = activeCart.id;
      } else {
        // Create new cart for this customer and shop
        const { data: newCart, error: createCartError } = await supabase
          .from('carts')
          .insert({
            customer_id: customerId,
            shop_id: shopId,
          })
          .select('id')
          .single();

        if (createCartError) throw new Error('Failed to create cart');
        cartId = newCart.id;
      }

      // STEP C: Check if item already in cart
      const { data: existingCartItem, error: existingItemError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('item_id', itemId)
        .maybeSingle();

      if (existingCartItem) {
        // Item already in cart - increase quantity
        const newQuantity = existingCartItem.quantity + quantity;
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({
            quantity: newQuantity,
            unit_price: unitPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCartItem.id);

        if (updateError) throw new Error('Failed to update cart item');
      } else {
        // New item - insert into cart_items
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cartId,
            item_id: itemId,
            quantity: quantity,
            unit_price: unitPrice
          });

        if (insertError) throw new Error('Failed to add item to cart');
      }

      // STEP D: Update cart's updated_at timestamp
      await supabase
        .from('carts')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', cartId);

      return { success: true, message: 'Item added to cart' };

    } catch (error) {
      logger.error('cartService.addToCart error', { 
        error: error.message, 
        customerId, 
        itemId 
      });
      throw error;
    }
  }
};
```

#### 🗂️ STEP 7: Database Executes SQL Queries
```sql
/* QUERY A: Fetch item details */
SELECT id, shop_id, price, is_available 
FROM items 
WHERE id = 'item-123';

/* Result:
 id       | shop_id    | price | is_available
 item-123 | shop-xyz   | 299.99| true
*/

/* QUERY B: Check for existing cart */
SELECT id, shop_id 
FROM carts 
WHERE customer_id = 'cust-456' 
LIMIT 1;

/* Result: NULL (no cart exists) */

/* QUERY C: Create new cart */
INSERT INTO carts (customer_id, shop_id, created_at, updated_at)
VALUES ('cust-456', 'shop-xyz', NOW(), NOW())
RETURNING id;

/* Result:
 id
 cart-999
*/

/* QUERY D: Check if item already in cart */
SELECT id, quantity 
FROM cart_items 
WHERE cart_id = 'cart-999' AND item_id = 'item-123';

/* Result: NULL (item not in cart) */

/* QUERY E: Insert cart item */
INSERT INTO cart_items (cart_id, item_id, quantity, unit_price)
VALUES ('cart-999', 'item-123', 1, 299.99);

/* QUERY F: Update cart timestamp */
UPDATE carts 
SET updated_at = NOW() 
WHERE id = 'cart-999';
```

#### ✅ STEP 8: Response Sent Back Through Chain
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

// Frontend's api.js receives response
// Extracts: response.json() → { success: true, data: {...} }

// cartService returns this to CartContext
// CartContext updates local state: setCartItems([...])

// React re-renders with new item in cart ✨
```

---

## 2. ALL IMPORTANT FILES AT A GLANCE

### Backend Structure
```
backend/src/
├── server.js                  # Start server: node src/server.js
├── app.js                     # Express setup (middleware, CORS, routes)
├── config/
│   ├── supabaseClient.js      # Database connection
│   ├── firebaseAdmin.js       # Firebase auth setup
│   └── env.js                 # Load environment variables
├── routes/
│   ├── index.js               # Combine all routes
│   ├── cart.routes.js         # POST/GET/PATCH/DELETE /api/cart/*
│   ├── order.routes.js        # POST/GET /api/orders/*
│   └── monitoring.routes.js   # Health checks
├── controllers/
│   ├── cart.controller.js     # Logic for cart endpoint
│   └── order.controller.js    # Logic for order endpoint
├── services/
│   ├── cart.service.js        # Database queries for cart
│   └── order.service.js       # Database queries for order
├── middlewares/
│   ├── auth.middleware.js     # Verify Firebase token
│   ├── error.middleware.js    # Handle errors
│   └── performance.middleware.js
├── utils/
│   ├── response.js            # sendSuccess() 、sendError()
│   ├── logger.js              # Logging
│   └── razorpay.js            # Payment integration
└── modules/
    ├── auth/
    ├── cart/
    ├── order/
    ├── shop/
    ├── item/
    └── ...
```

---

## 3. KEY FUNCTIONS AND UTILITIES

### Response Formatting (utils/response.js)
```javascript
import { sendSuccess, sendError } from '../utils/response.js';

// Success response
sendSuccess(res, data, message);
// Returns: { success: true, message, data }
// HTTP Status: 200

// Error response
sendError(res, errorMessage, statusCode);
// Returns: { success: false, message: errorMessage }
// HTTP Status: statusCode (e.g., 400, 500)
```

### Logger (utils/logger.js)
```javascript
import { logger } from '../utils/logger.js';

logger.info('Information message', { context });
logger.error('Error occurred', { error, customerId });
logger.debug('Debug information', { variable });
```

### Auth Middleware (middlewares/auth.middleware.js)
```javascript
import { authenticate } from '../middlewares/auth.middleware.js';

// Use on routes that need auth
router.post('/add', authenticate, cartController.addToCart);

// Inside controller, req.user is available:
const { customerId, email } = req.user;
```

---

## 4. DATABASE OPERATIONS EXAMPLES

### SELECT (Get Data)
```javascript
// Get all items from a shop
const { data: items } = await supabase
  .from('items')
  .select('id, name, price')
  .eq('shop_id', shopId);

// Get single item
const { data: item } = await supabase
  .from('items')
  .select('*')
  .eq('id', itemId)
  .single();  // Expect exactly one result

// Get with filters
const { data: cartItems } = await supabase
  .from('cart_items')
  .select('id, quantity, item_id')
  .eq('cart_id', cartId)
  .gte('quantity', 1);  // Greater than or equal
```

### INSERT (Add Data)
```javascript
// Insert single item
const { data: newCart } = await supabase
  .from('carts')
  .insert({
    customer_id: customerId,
    shop_id: shopId,
  })
  .select()  // Return inserted row
  .single();

// Insert multiple items
const { data: items } = await supabase
  .from('items')
  .insert([
    { name: 'Apple', price: 50 },
    { name: 'Banana', price: 30 },
  ])
  .select();
```

### UPDATE (Modify Data)
```javascript
// Update single row
await supabase
  .from('cart_items')
  .update({ quantity: 5, updated_at: new Date().toISOString() })
  .eq('id', cartItemId);

// Update multiple rows
await supabase
  .from('carts')
  .update({ status: 'archived' })
  .eq('customer_id', customerId)
  .lt('created_at', oneMonthAgo);  // Less than
```

### DELETE (Remove Data)
```javascript
// Delete single item
await supabase
  .from('cart_items')
  .delete()
  .eq('id', cartItemId);

// Delete multiple items
await supabase
  .from('carts')
  .delete()
  .eq('customer_id', customerId);
```

---

## 5. COMMON API CALL PATTERNS

### Frontend Calling Backend

#### GET Request
```javascript
// Fetch cart
const cartResponse = await api.get('/cart');
// API: fetch('http://localhost:5002/api/cart', { method: 'GET', headers })

// With query parameters
const ordersResponse = await api.get('/orders', { 
  params: { status: 'pending', limit: 10 } 
});
// API: fetch('http://localhost:5002/api/orders?status=pending&limit=10')
```

#### POST Request
```javascript
// Add to cart
const result = await api.post('/cart/add', { 
  item_id: 'item-123', 
  quantity: 1 
});
// API: fetch('http://localhost:5002/api/cart/add', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' },
//   body: JSON.stringify({ item_id: 'item-123', quantity: 1 })
// })
```

#### PATCH Request
```javascript
// Update cart item
const result = await api.patch('/cart/update', {
  item_id: 'item-123',
  quantity: 5
});
```

#### DELETE Request
```javascript
// Remove from cart
const result = await api.delete('/cart/remove/item-123');
// API: fetch('http://localhost:5002/api/cart/remove/item-123', { method: 'DELETE' })
```

---

## 6. RUNNING THE PROJECT

### Start Backend Server
```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your keys

# Development mode (with auto-reload)
npm run dev
# Server runs at http://localhost:5002

# Production
npm start
```

### Start Frontend
```bash
cd frontend

# Install dependencies
npm install

# Development
npm run dev
# Opens at http://localhost:5173

# Production
npm run build
npm run preview
```

---

## 7. TESTING AN ENDPOINT

### Using curl/Postman

#### Add to Cart
```bash
curl -X POST http://localhost:5002/api/cart/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_FIREBASE_TOKEN>" \
  -d '{
    "item_id": "item-123",
    "quantity": 1
  }'
```

#### Get Cart
```bash
curl -X GET http://localhost:5002/api/cart \
  -H "Authorization: Bearer <YOUR_FIREBASE_TOKEN>"
```

#### Get Orders
```bash
curl -X GET http://localhost:5002/api/orders \
  -H "Authorization: Bearer <YOUR_FIREBASE_TOKEN>"
```

---

## 8. ERROR HANDLING EXAMPLES

### Frontend Error Handling
```javascript
try {
  const result = await cartService.addToCart(shopId, itemId, quantity);
  // Success: result.success === true
} catch (error) {
  // error.message = "Item is already in cart"
  // error.status = 400
  
  if (error.message.includes('different shops')) {
    // Handle shop conflict
    showAlert('Cannot add items from different shops');
  } else if (error.status === 401) {
    // Unauthorized - redirect to login
    navigate('/login');
  } else {
    // Generic error
    showAlert(error.message);
  }
}
```

### Backend Error Handling
```javascript
try {
  const result = await cartService.addToCart(customerId, itemId, quantity);
} catch (error) {
  // Error from service is caught here
  
  if (error.message.includes('from different shops')) {
    return sendError(res, error.message, 400);  // Bad request
  } else if (error.message.includes('not found')) {
    return sendError(res, error.message, 404);  // Not found
  } else {
    return sendError(res, 'Internal server error', 500);  // Server error
  }
}
```

---

## 9. AUTHENTICATION FLOW DIAGRAM

```
User Signs Up/Login
        ↓
  Firebase Auth
        ↓
Firebase generates ID Token  (JWT)
        ↓
Frontend stores token in localStorage
        ↓
Every API request:
  ├─ Extract token from localStorage
  ├─ Add to request header: "Authorization: Bearer <token>"
  └─ Send HTTP request
        ↓
Backend receives request:
  ├─ Extract token from header
  ├─ Verify with Firebase: admin.auth().verifyIdToken(token)
  ├─ If valid: Extract customerId, set req.user
  ├─ If invalid: Return 401 Unauthorized
  └─ Continue to route handler
        ↓
Route handler has access to req.user.customerId
```

---

This is the complete backend system! Study this guide and the main document for deep understanding.
