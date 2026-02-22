# 🚀 BazarSe User Backend

Production-ready Node.js + Express backend for the **BazarSe User Application**.

## 📌 Overview

This backend serves the **customer-facing application**, providing APIs for:
- 🔐 Authentication (Firebase)
- 🏪 Shop browsing
- 🍔 Item management
- 🛒 Shopping cart
- 📦 Order placement & tracking
- 🔔 Notifications

**Important**: This is the **USER backend** only. The seller backend is separate and should not be modified.

---

## ⚙️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Firebase Admin SDK
- **Architecture**: Clean, service-oriented

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/              # Environment & client configs
│   │   ├── env.js
│   │   ├── firebaseAdmin.js
│   │   └── supabaseClient.js
│   ├── middlewares/         # Express middlewares
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── role.middleware.js
│   ├── modules/            # Feature modules
│   │   ├── auth/           # User authentication
│   │   ├── cart/           # Shopping cart
│   │   ├── item/           # Product items
│   │   ├── notification/   # Notifications
│   │   ├── order/          # Order management
│   │   └── shop/           # Shop listings
│   ├── routes/             # Route definitions
│   │   └── index.js
│   ├── utils/              # Helper utilities
│   │   ├── constants.js
│   │   ├── logger.js
│   │   └── response.js
│   ├── app.js              # Express app setup
│   └── server.js           # Server entry point
├── .env.example            # Environment template
├── package.json
└── README.md
```

---

## 🔧 Setup Instructions

### Prerequisites
- Node.js 16+ installed
- Supabase project created
- Firebase project with Admin SDK credentials

### 1. Clone & Install
```bash
cd backend
npm install
```

### 2. Environment Configuration
Create a `.env` file from the example:
```bash
cp .env.example .env
```

Fill in your credentials:
```env
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### 3. Verify Database Schema
Ensure all tables exist in Supabase as defined in `DATABASE_SCHEMA_REFERENCE.md`:
- `customers`
- `customer_addresses`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `notifications`
- `shops` (shared)
- `items` (shared)
- `categories` (shared)

### 4. Run the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

Server will start at: `http://localhost:5001`

---

## 📡 API Endpoints

Full API documentation available in: **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**

### Quick Reference

| Module | Endpoint | Description |
|--------|----------|-------------|
| Health | `GET /api/health` | Health check |
| Auth | `POST /api/auth/register` | Register/login customer |
| Auth | `GET /api/auth/me` | Get profile |
| Auth | `PUT /api/auth/profile` | Update profile |
| Shops | `GET /api/shops` | List shops |
| Shops | `GET /api/shops/nearby` | Get nearby shops |
| Shops | `GET /api/shops/:id` | Shop details |
| Items | `GET /api/items/shop/:shopId` | Items by shop |
| Items | `GET /api/items/:id` | Item details |
| Cart | `GET /api/cart` | Get cart |
| Cart | `POST /api/cart/items` | Add to cart |
| Cart | `PUT /api/cart/items/:id` | Update quantity |
| Cart | `DELETE /api/cart/items/:id` | Remove item |
| Orders | `POST /api/orders` | Place order |
| Orders | `GET /api/orders` | List orders |
| Orders | `GET /api/orders/:id` | Order details |
| Orders | `POST /api/orders/:id/cancel` | Cancel order |
| Notifications | `GET /api/notifications` | List notifications |
| Notifications | `GET /api/notifications/unread/count` | Unread count |
| Notifications | `PUT /api/notifications/:id/read` | Mark as read |

---

## 🔐 Authentication Flow

1. Frontend authenticates user via Firebase Auth
2. Frontend sends Firebase ID token in header: `Authorization: Bearer <token>`
3. Backend middleware verifies token
4. Backend maps `firebase_uid` to `customers` table
5. If customer doesn't exist, creates record on first request
6. Subsequent requests use existing customer record

**Key Point**: Same email can be both seller and customer (different Firebase UIDs or roles).

---

## 🗄️ Database Access Rules

### Customer Scoping
All queries are scoped to the authenticated customer:
- Cart operations → `customer_id = auth.user.customerId`
- Orders → `customer_id = auth.user.customerId`
- Notifications → `customer_id = auth.user.customerId`

### Read-Only Access
Public endpoints (shops, items) have read-only access and filter by:
- `is_active = true`
- `is_available = true` (items)

### Stock Validation
Cart operations validate:
- Item availability
- Stock quantity (grocery only)
- Shop association

---

## 🛡️ Security Features

✅ **Firebase Token Verification** - All protected routes verify Firebase ID tokens  
✅ **Customer Isolation** - Users can only access their own data  
✅ **SQL Injection Protection** - Using Supabase parameterized queries  
✅ **Input Validation** - Defensive coding in all controllers  
✅ **Error Handling** - Centralized error middleware  
✅ **Logging** - Structured logging with sensitive data filtering  

---

## 🚨 Important Constraints

### DO NOT:
- ❌ Modify seller-side logic or routes
- ❌ Allow cross-customer data access
- ❌ Hardcode business logic in controllers
- ❌ Skip shop_id or customer_id scoping
- ❌ Use console.log (use logger instead)

### DO:
- ✅ Keep controllers thin
- ✅ Keep business logic in services
- ✅ Use utils/response for all responses
- ✅ Validate input before processing
- ✅ Log errors with context

---

## 📊 Response Formats

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Paginated
```json
{
  "success": true,
  "message": "Data fetched",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": null
}
```

---

## 🧪 Testing

To test the API:

1. **Get Firebase Token**: Login via frontend/Firebase
2. **Use Postman/Thunder Client**:
   - Add header: `Authorization: Bearer <firebase_token>`
   - Test endpoints as documented

3. **Health Check**:
   ```bash
  curl http://localhost:5001/api/health
   ```

---

## 🐛 Debugging

### Check Logs
Logs are JSON-formatted with levels:
- `error`: Critical issues
- `warn`: Warnings
- `info`: General info
- `debug`: Detailed debug info

Set `LOG_LEVEL=debug` in `.env` for verbose logging.

### Common Issues

**"Missing Supabase configuration"**  
→ Check `.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`

**"Missing Firebase Admin configuration"**  
→ Ensure Firebase credentials are correct in `.env`

**"Authorization token required"**  
→ Add `Authorization: Bearer <token>` header

**"Customer account required"**  
→ Call `POST /api/auth/register` first to create customer record

---

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use production Firebase credentials
- [ ] Configure production Supabase instance
- [ ] Enable RLS on Supabase tables
- [ ] Set up SSL/HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up logging to external service
- [ ] Enable rate limiting
- [ ] Set up monitoring/alerts

### Environment Variables
Ensure all required environment variables are set on your hosting platform.

---

## 📞 Support

For issues or questions:
1. Check `API_DOCUMENTATION.md`
2. Review `DATABASE_SCHEMA_REFERENCE.md`
3. Check logs for errors
4. Verify environment configuration

---

## 📝 License

Proprietary - BazarSe Platform

---

**Built with ❤️ for BazarSe Users**
