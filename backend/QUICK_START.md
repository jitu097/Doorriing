# 🚀 Quick Start Guide

## Initial Setup (One-time)

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environmentcreate `.env` file from template:
   ```bash
   cp .env.example .env
   ```

3. **Add Credentials to `.env`**
   - Get Supabase URL and Anon Key from Supabase Dashboard
   - Get Firebase credentials from Firebase Console → Project Settings → Service Accounts
   - Fill in the credentials in `.env`

4. **Verify Database**
   - Ensure all tables exist in Supabase (see `DATABASE_SCHEMA_REFERENCE.md`)
   - Tables needed: customers, carts, cart_items, orders, order_items, notifications, shops, items, categories

## Running the Server

**Development Mode** (recommended):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

Server will be available at: `http://localhost:5001`

## Quick Test

1. **Health Check**:
   ```bash
   curl http://localhost:5001/api/health
   ```

2. **List Shops** (no auth required):
   ```bash
   curl http://localhost:5001/api/shops
   ```

3. **Authenticated Request** (requires Firebase token):
   ```bash
   curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
      http://localhost:5001/api/auth/me
   ```

## API Endpoints

See `API_DOCUMENTATION.md` for complete API reference.

## Troubleshooting

**Server won't start?**
- Check `.env` file exists with correct credentials
- Verify Supabase and Firebase credentials are valid

**"Authorization token required"?**
- Add `Authorization: Bearer <token>` header to request
- Get token from Firebase Auth on frontend

**"Customer account required"?**
- Call `POST /api/auth/register` first to create customer record

## Next Steps

1. Test all endpoints with Postman/Thunder Client
2. Integrate with frontend application
3. Set up production environment
4. Configure monitoring and logging

---

**Happy Coding! 🎉**
