# 🚀 Delivery Zone – Quick Reference Card

## What This Does
✅ Restricts shop visibility by geographical location  
✅ Only users inside delivery radius see shops  
✅ Shows friendly message if outside delivery area  
✅ Works with browser geolocation + address selection  

---

## 📋 Implementation Checklist

### Phase 1: Configure (5 mins)
- [ ] Open `backend/src/modules/delivery-zone/delivery-zone.service.js`
- [ ] Update `centerLat` and `centerLon` with your shop's location
- [ ] Update `radiusKm` with your delivery radius (e.g., 10)
- [ ] Restart backend

**Example:**
```javascript
centerLat: 24.2667,   // Your latitude
centerLon: 84.6167,   // Your longitude
radiusKm: 10,         // 10 km delivery radius
```

### Phase 2: Test Backend APIs (10 mins)

**Test 1: Get Zone Config**
```bash
curl http://localhost:5000/api/delivery-zone
```

**Test 2: Check Serviceability (Inside)**
```bash
curl "http://localhost:5000/api/delivery-zone/check?latitude=24.27&longitude=84.62"
# Should return: { "isServiceable": true, "distance": 2.5 }
```

**Test 3: Check Serviceability (Outside)**
```bash
curl "http://localhost:5000/api/delivery-zone/check?latitude=23.0&longitude=85.0"
# Should return: { "isServiceable": false, "distance": 130.5 }
```

**Test 4: Get Serviceable Shops**
```bash
curl "http://localhost:5000/api/shops/serviceable?latitude=24.27&longitude=84.62"
# Should return shops if inside, empty array if outside
```

### Phase 3: Integrate Frontend (15 mins)

**Option A: Copy-Paste Simple**
1. Open your Home page: `frontend/src/pages/home/Home.jsx`
2. Copy code from: `frontend/src/DELIVERY_ZONE_INTEGRATION_EXAMPLES.jsx` (Example 2)
3. Replace your existing shops rendering

**Option B: Full Control**
1. Copy code from: `frontend/src/DELIVERY_ZONE_INTEGRATION_EXAMPLES.jsx` (Example 1)
2. Integrate `useServiceability` hook into your pages
3. Handle loading, error, and serviceable states

**Option C: Component Wrapper**
1. Wrap your shops with `<ServiceabilityCheck>` component
2. Pass `onServiceabilityChange` callback
3. Done!

### Phase 4: Test Frontend (10 mins)
1. Open your app in browser
2. Should prompt for location permission
3. If inside zone: see all shops ✓
4. If outside zone: see message with retry button ✓
5. Test "Try Again" button ✓

---

## 📡 API Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/delivery-zone` | Get zone config |
| `GET` | `/api/delivery-zone/check?lat=X&lon=Y` | Check serviceability |
| `POST` | `/api/delivery-zone/check-serviceability` | Check serviceability |
| `GET` | `/api/shops/serviceable?lat=X&lon=Y&business_type=grocery` | Get serviceable shops |

---

## 🎯 Code Snippets

### 1️⃣ Quick Check Serviceability
```javascript
import { locationService } from '../services/location.service';

const location = await locationService.getCurrentLocation();
const result = await locationService.checkServiceability(
  location.latitude,
  location.longitude
);

console.log(result.isServiceable); // true or false
console.log(result.message);       // User-friendly message
```

### 2️⃣ Get Serviceable Shops
```javascript
const shops = await locationService.getServiceableShops('grocery');
// Returns: { shops: [...], pagination: {...}, serviceable: true/false }
```

### 3️⃣ Use in React Component
```javascript
import useServiceability from '../hooks/useServiceability';

function MyComponent() {
  const { isServiceable, loading, error, getCurrentLocation } = useServiceability();
  
  useEffect(() => {
    getCurrentLocation();
  }, []);

  if (loading) return <div>Checking location...</div>;
  if (!isServiceable) return <div>Outside delivery area</div>;
  return <div>Show shops here</div>;
}
```

### 4️⃣ Update Zone Configuration (Programmatically)
```javascript
import { deliveryZoneService } from './modules/delivery-zone/delivery-zone.service.js';

// Update zone
deliveryZoneService.updateZoneConfig({
  centerLat: 24.3000,
  centerLon: 84.7000,
  radiusKm: 15,
  name: 'Extended Latehar Zone',
});
```

---

## 🗺️ Finding Coordinates

### Method 1: Google Maps (Easiest)
1. Go to Google Maps
2. Right-click on your location
3. Click the coordinates at top
4. Copy: `24.2667, 84.6167`

### Method 2: GPS Coordinates
1. Use a GPS app on your phone
2. Copy the coordinates shown

### Method 3: Online Tool
1. Visit: https://www.gps-coordinates.org
2. Search your address
3. Copy coordinates

---

## 🧪 Test Coordinates

**Inside Delivery Zone (2.5 km away):**
```
Latitude: 24.27
Longitude: 84.62
```

**Outside Delivery Zone (130 km away):**
```
Latitude: 23.0
Longitude: 85.0
```

Test with these to verify your setup is working!

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Geolocation not allowed" | Browser permission denied | Enable location in browser settings |
| Always shows "Outside Area" | Wrong coordinates | Verify zone center in config |
| API returns 404 | Routes not registered | Restart backend, check imports |
| Shops still show outside area | Old code cached | Clear browser cache, restart dev server |
| Slow location detection | Geolocation timeout | Check HTTPS (required in production) |

---

## 📚 File Locations

**Backend:**
- Config: `backend/src/modules/delivery-zone/delivery-zone.service.js`
- API: `backend/src/modules/delivery-zone/delivery-zone.controller.js`
- Routes: `backend/src/modules/delivery-zone/delivery-zone.routes.js`
- Utils: `backend/src/utils/distance.util.js`

**Frontend:**
- Service: `frontend/src/services/location.service.js`
- Component: `frontend/src/components/ServiceabilityCheck.jsx`
- Hook: `frontend/src/hooks/useServiceability.js`
- Examples: `frontend/src/DELIVERY_ZONE_INTEGRATION_EXAMPLES.jsx`

---

## 🔧 Configuration Parameters

```javascript
// In: backend/src/modules/delivery-zone/delivery-zone.service.js

this.zoneConfig = {
  id: 'latehar-zone-1',           // Zone identifier
  name: 'Latehar Service Area',   // Display name
  centerLat: 24.2667,             // Your shop latitude
  centerLon: 84.6167,             // Your shop longitude
  radiusKm: 10,                   // Delivery radius in km
  city: 'Latehar',                // City name
  state: 'Jharkhand',             // State name
  createdAt: new Date(),          // Auto
  updatedAt: new Date(),          // Auto
};
```

---

## 📊 Distance Examples

**Zone Center: 24.2667, 84.6167 (Latehar)**  
**Radius: 10 km**

| Location | Latitude | Longitude | Distance | Serviceable? |
|----------|----------|-----------|----------|--------------|
| Latehar Center | 24.2667 | 84.6167 | 0 km | ✓ Yes |
| Test Location | 24.27 | 84.62 | 2.5 km | ✓ Yes |
| Nearby Town | 24.35 | 84.60 | 8 km | ✓ Yes |
| Far City | 23.0 | 85.0 | 130 km | ✗ No |

---

## ✅ Success Criteria

Your implementation is complete when:
1. ✓ Backend returns zone config without errors
2. ✓ Browser geolocation works and shows permission prompt
3. ✓ Shops visible inside zone, hidden outside zone
4. ✓ User sees friendly message when outside zone
5. ✓ "Try Again" button works and re-checks location
6. ✓ No console errors

---

## 🚀 Next Steps

1. **Immediate:**
   - Configure zone center and radius
   - Test backend APIs
   - Integrate into home/browse pages

2. **Short-term:**
   - Add analytics tracking
   - Create FAQ for users
   - Test on mobile devices

3. **Long-term:**
   - Add zone map visualization
   - Support multiple zones
   - Admin panel for zone management
   - Auto-check saved addresses

---

## 📞 Need Help?

1. Check: `DELIVERY_ZONE_IMPLEMENTATION_GUIDE.md` (detailed)
2. Check: `frontend/src/DELIVERY_ZONE_INTEGRATION_EXAMPLES.jsx` (code examples)
3. Check: API responses in network tab
4. Check: Backend logs for errors

---

**You're all set! 🎉 Start with Phase 1 (Configuration) and work through each phase.**
