# 🚀 MASTER VERIFICATION COMMANDS - Copy & Paste
**Keep this open in another terminal window!**

---

## BEFORE YOU START ⚠️

```bash
# The server must be running for these commands to work!
# Keep server running in one terminal window
node backend/src/server.js

# Then run these commands in a DIFFERENT terminal window
```

---

## 🎯 ONE-COMMAND QUICK VERIFICATION (EASIEST)

```bash
# RUN THIS ONE COMMAND - Shows everything!
cd backend && node src/scripts/benchmark-stage1.js
```

**Expected Output:** 5 tests with ✅ checkmarks (green)
**Time:** 30 seconds

---

## 🔧 STEP-BY-STEP COMMANDS

### STEP 1: Check Server is Running
```bash
curl http://localhost:5000/api/health
```
**Expected:** `{"status":"ok"}` (or similar)

---

### STEP 2: Test Compression (Check Response Headers)
```bash
curl -i http://localhost:5000/api/shops
```
**Look For:** `content-encoding: gzip` in response headers
**Expected:** YES (gzip should be present)

---

### STEP 3: Test Cache First Time (Slow - Hits Database)
```bash
curl http://localhost:5000/api/shops/1
```
**What to Note:** Response time (should be something like 45-100ms)

---

### STEP 4: Test Cache Second Time (Fast - From Memory)
```bash
curl http://localhost:5000/api/shops/1
```
**What to Note:** Response time (should be 1-5ms - MUCH faster!)
**Expected:** 40-50x faster than first request

---

### STEP 5: Check Cache Statistics
```bash
curl http://localhost:5000/api/monitoring/cache
```
**Expected Response Example:**
```json
{
  "totalRequests": 10,
  "cacheHits": 5,
  "cacheMisses": 5,
  "hitRate": "50%",
  "entries": {
    "shop:1:false:false": "cached data..."
  }
}
```

---

### STEP 6: Clear Cache (Reset Statistics)
```bash
curl -X DELETE http://localhost:5002/api/monitoring/cache
```
**Expected:** `{"message":"Cache cleared"}`

---

### STEP 7: Check Performance Metrics
```bash
curl http://localhost:5000/api/monitoring/performance
```
**Expected Response Example:**
```json
{
  "avgResponseTime": "23ms",
  "minResponseTime": "1ms",
  "maxResponseTime": "145ms"
}
```

---

### STEP 8: Full Run Test (Automated)
```bash
cd backend && node src/scripts/benchmark-stage1.js
```

---

## 📊 QUICK TESTS (Pick Any)

### Test Compression Only
```bash
# Check if response is compressed
curl -i http://localhost:5000/api/shops | grep -i "content-encoding"

# On Windows PowerShell:
curl -i http://localhost:5000/api/shops | findstr "content-encoding"
```

---

### Test Caching Only
```bash
# First: Check cache
curl http://localhost:5000/api/monitoring/cache

# Second: Make a shop request
curl http://localhost:5000/api/shops/1

# Third: Check cache again (should have 1 hit)
curl http://localhost:5000/api/monitoring/cache
```

---

### Test Categories Endpoint
```bash
curl http://localhost:5000/api/categories/shop/1
```

---

### Test with Multiple Requests
```bash
# Repeat same request 5 times
for i in {1..5}; do curl http://localhost:5002/api/shops/1; done

# On Windows PowerShell:
1..5 | ForEach-Object { curl http://localhost:5002/api/shops/1 }
```

---

## 🧪 DIAGNOSTIC COMMANDS

### Check Node Process
```bash
# On Windows - find what's using port 5000
netstat -ano | findstr :5000

# On Mac/Linux:
lsof -i :5000
```

---

### View Server Logs
```bash
# The server logs will show in the same terminal window
# Look for: [CACHE MANAGER], [PERFORMANCE], or [COMPRESSION]
```

---

### Get Detailed Performance Info
```bash
curl http://localhost:5002/api/monitoring/performance
```

---

### Reset All Stats
```bash
# Clear cache clears statistics too
curl -X DELETE http://localhost:5002/api/monitoring/cache
```

---

## ✅ SUCCESS CHECKLIST

Run each command and check if you see the expected output:

```
☐ STEP 1: Server responds with {"status":"ok"}
☐ STEP 2: Response has "content-encoding: gzip"
☐ STEP 3: First request takes 50-150ms
☐ STEP 4: Second request takes 1-10ms (40x+ faster)
☐ STEP 5: Cache stats show hits/misses
☐ STEP 6: Cache can be cleared successfully
☐ STEP 7: Performance metrics show data
☐ STEP 8: Benchmark shows 5 ✅ marks
```

---

## 🐛 TROUBLESHOOTING

### Server Won't Start
```bash
# Check if port is already in use
# Kill it and restart
netstat -ano | findstr :5000
taskkill /PID <PID> /F
node backend/src/server.js
```

### Curl Not Found (Windows)
```bash
# Use PowerShell instead of Command Prompt
# Or install curl: choco install curl
```

### "Connection Refused" Error
```bash
# Make sure server is actually running
# You should see logs in the server terminal
# Default port: 5000
```

### Cache Shows 0 Hits
```bash
# First request always misses cache (expected)
# Make the same API call twice to see a hit
curl http://localhost:5002/api/shops/1
curl http://localhost:5002/api/shops/1  # This should be a hit
```

### No "gzip" in Headers
```bash
# This could mean compression isn't working
# Check server logs for errors
# Might need to restart server
```

---

## 📈 EXPECTED METRICS

### Compression
- **Expected Reduction:** 30-40% on average
- **What to see:** `content-encoding: gzip` header
- **Benchmark shows:** ~68% for test data

### Caching
- **Expected Speed:** 40-50x faster for repeated requests
- **What to see:** 1-5ms response time on cache hit
- **Benchmark shows:** ~97% improvement

### Hit Rate
- **Expected:** 70%+ after 2+ requests
- **What to see:** In cache stats: `"hitRate": "70%"`

### Pagination
- **Expected:** Works with `?page=1&limit=10`
- **What to see:** Returns paginated data

### Performance
- **Expected:** Avg response < 30ms
- **Stress Test:** Handles 50 concurrent requests

---

## 🎯 COMMON CURL EXAMPLES

### Get Shops
```bash
curl http://localhost:5002/api/shops
```

### Get Specific Shop
```bash
curl http://localhost:5002/api/shops/1
```

### Get Categories
```bash
curl http://localhost:5002/api/categories
```

### Get Categories for Shop
```bash
curl http://localhost:5002/api/categories/shop/1
```

### Pagination
```bash
curl "http://localhost:5002/api/shops?page=1&limit=10"
```

### With Headers (See Compression)
```bash
curl -i http://localhost:5002/api/shops
```

---

## 📱 Mobile/Quick Reference

### Absolute Minimum (2 commands)
```bash
# 1. Check server
curl http://localhost:5002/api/health

# 2. Run full test
cd backend && node src/scripts/benchmark-stage1.js
```

### Quick Validation (3 commands)
```bash
# 1. Check cache
curl http://localhost:5002/api/monitoring/cache

# 2. Make request
curl http://localhost:5002/api/shops/1

# 3. Check cache again
curl http://localhost:5002/api/monitoring/cache
```

---

## 🔁 REPEAT TEST PATTERN

To quickly verify caching is working:

```bash
# Terminal 1: Start server
node backend/src/server.js

# Terminal 2: Run these in sequence
curl http://localhost:5002/api/monitoring/cache
curl http://localhost:5002/api/shops/1
curl http://localhost:5002/api/shops/1
curl http://localhost:5002/api/monitoring/cache
```

**Expected:** Cache hits increase after 2nd request

---

## 💾 COPY-PASTE SCRIPT (All at Once)

```bash
# Full verification sequence (copy all lines and paste)
echo "Starting verification..."
echo "1. Health check:"
curl http://localhost:5002/api/health
echo -e "\n2. Original cache stats:"
curl http://localhost:5002/api/monitoring/cache
echo -e "\n3. First shop request (DB hit):"
curl http://localhost:5002/api/shops/1
echo -e "\n4. Second shop request (cache hit):"
curl http://localhost:5002/api/shops/1
echo -e "\n5. Updated cache stats:"
curl http://localhost:5002/api/monitoring/cache
echo -e "\n6. Full benchmark:"
cd backend && node src/scripts/benchmark-stage1.js
```

---

## 🎓 What Each Test Proves

| Command | Proves | Expected |
|---------|--------|----------|
| `curl health` | Server running | `{"status":"ok"}` |
| `curl -i shops` | Compression active | `gzip` in headers |
| Slow 1st request | Cache miss | 50-150ms |
| Fast 2nd request | Cache hit | 1-10ms |
| Cache stats | Caching working | Hit/miss counts |
| Benchmark script | All features | 5 ✅ marks |

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Health check | 5 sec |
| Compression test | 10 sec |
| Cache test (2 requests) | 15 sec |
| Full verification | 2 min |
| Benchmark | 30 sec |
| **Total** | **~3-5 min** |

---

## 🎉 SUCCESS = All These Working

✅ Server starts without errors
✅ Health check returns OK
✅ Gzip compression active
✅ First request is slow
✅ Second request is fast
✅ Cache statistics track hits/misses
✅ Benchmark shows 5 ✓ marks
✅ No errors in terminal

---

## 📞 Still Not Working?

1. **Check server is running** - See terminal with `node backend/src/server.js`
2. **Check correct port** - Default is 5002, or check in `backend/src/config/env.js`
3. **Check firewall** - LocalHost should work
4. **Check curl is installed** - Or use PowerShell on Windows
5. **Read troubleshooting section** - Above
6. **Check server logs** - Look for error messages
7. **Read QUICK_VERIFICATION.md** - Has more help

---

**🎯 Bottom Line: Copy one command, paste it, see the results!**
```bash
cd backend && node src/scripts/benchmark-stage1.js
```

---
