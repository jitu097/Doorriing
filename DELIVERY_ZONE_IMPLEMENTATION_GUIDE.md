# 📍 Delivery Zone Implementation Guide

## Overview
This guide walks you through the complete implementation of the delivery zone radius feature in your Doorriing app. Users can now only see and order from shops if they're within your defined delivery area.

---

## 🎯 Architecture

```
User Location
     ↓
Browser Geolocation API
     ↓
LocationService (Frontend)
     ↓
POST /api/delivery-zone/check-serviceability
     ↓
Backend DeliveryZoneService
     ↓
Distance Calculation (Haversine)
     ↓
Serviceability Result
     ↓
Return Shops OR "Not Serviceable" Message
```

---

## 📦 Files Created / Modified

### Backend Files Created
1. **`backend/src/utils/distance.util.js`**
   - `calculateDistance()` - Haversine formula for distance calculation
   - `checkServiceability()` - Checks if location is within zone
   - `validateCoordinates()` - Validates lat/lon format

2. **`backend/src/modules/delivery-zone/delivery-zone.service.js`**
   - Manages delivery zone configuration
   - Default: Latehar center (24.2667, 84.6167) with 10 km radius
   - Easily updateable for other cities

3. **`backend/src/modules/delivery-zone/delivery-zone.controller.js`**
   - `GET /api/delivery-zone` - Get zone config
   - `GET /api/delivery-zone/check?lat=X&lon=Y` - Check serviceability
   - `POST /api/delivery-zone/check-serviceability` - Check serviceability

4. **`backend/src/modules/delivery-zone/delivery-zone.routes.js`**
   - Routes for all delivery zone endpoints

### Backend Files Modified
1. **`backend/src/routes/index.js`**
   - Added delivery-zone routes registration

2. **`backend/src/modules/shop/shop.controller.js`**
   - Added `getServiceableShops()` method
   - Integrates with delivery zone check
   - Returns empty shops array if outside zone

3. **`backend/src/modules/shop/shop.routes.js`**
   - Added `GET /api/shops/serviceable` endpoint

### Frontend Files Created
1. **`frontend/src/services/location.service.js`**
   - `getCurrentLocation()` - Gets browser geolocation
   - `checkServiceability()` - Calls backend serviceability API
   - `getServiceableShops()` - Fetches shops within zone
   - `getZoneConfig()` - Fetches zone configuration

2. **`frontend/src/components/ServiceabilityCheck.jsx`**
   - Component to wrap around shops list
   - Shows "Outside Delivery Area" message if not serviceable
   - Provides "Try Again" and "Select Address" buttons

3. **`frontend/src/components/ServiceabilityCheck.css`**
   - Styling for serviceability alert
   - Mobile responsive design

4. **`frontend/src/hooks/useServiceability.js`**
   - Custom React hook for serviceability management
   - Methods: `getCurrentLocation()`, `checkServiceability()`, `getServiceableShops()`, `reset()`

---

## 🚀 Quick Start Integration

### Option 1: Using the ServiceabilityCheck Component (Recommended)

```jsx
// In your Home.jsx or Browse.jsx
import ServiceabilityCheck from '../components/ServiceabilityCheck';
import ShopsList from './ShopsList'; // Your existing shops list

function Home() {
  const [isServiceable, setIsServiceable] = useState(false);

  return (
    <ServiceabilityCheck onServiceabilityChange={setIsServiceable}>
      {isServiceable && <ShopsList />}
    </ServiceabilityCheck>
  );
}
```

### Option 2: Using the useServiceability Hook (More Control)

```jsx
// In any component that needs serviceability checks
import useServiceability from '../hooks/useServiceability';

function Browse() {
  const {
    isServiceable,
    loading,
    error,
    message,
    getCurrentLocation,
    getServiceableShops,
  } = useServiceability();

  useEffect(() => {
    handleLocationCheck();
  }, []);

  const handleLocationCheck = async () => {
    try {
      await getCurrentLocation();
      if (isServiceable) {
        const shops = await getServiceableShops();
        setShops(shops);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div>Checking your location...</div>;
  
  if (error) return <div className="error">{error}</div>;
  
  if (!isServiceable) {
    return (
      <div className="not-serviceable">
        <p>{message}</p>
        <button onClick={() => handleLocationCheck()}>Try Again</button>
      </div>
    );
  }

  return <ShopsList />;
}
```

### Option 3: Using LocationService Directly

```jsx
// If you want direct API access
import { locationService } from '../services/location.service';

async function checkArea() {
  try {
    // Get current location
    const location = await locationService.getCurrentLocation();
    
    // Check serviceability
    const result = await locationService.checkServiceability(
      location.latitude,
      location.longitude
    );
    
    console.log(result);
    // { isServiceable: true, distance: 2.5, message: "..." }
    
    // Get shops if serviceable
    if (result.isServiceable) {
      const shops = await locationService.getServiceableShops('grocery');
      console.log(shops);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## 🔧 Configuration

### Update Delivery Zone Center & Radius

Edit `backend/src/modules/delivery-zone/delivery-zone.service.js`:

```javascript
this.zoneConfig = {
  id: 'latehar-zone-1',
  name: 'Latehar Service Area',
  centerLat: 24.2667,  // ← Change this
  centerLon: 84.6167,  // ← Change this
  radiusKm: 10,        // ← Change this (in kilometers)
  city: 'Latehar',
  state: 'Jharkhand',
};
```

**To find coordinates:**
1. Go to Google Maps
2. Right-click on your shop location
3. Click on the coordinates at the top
4. Copy the lat/lon values

---

## 📡 API Endpoints

### 1. Get Delivery Zone Configuration
```
GET /api/delivery-zone

Response:
{
  "success": true,
  "data": {
    "id": "latehar-zone-1",
    "name": "Latehar Service Area",
    "center": {
      "latitude": 24.2667,
      "longitude": 84.6167
    },
    "radiusKm": 10,
    "city": "Latehar",
    "state": "Jharkhand"
  }
}
```

### 2. Check Serviceability (POST)
```
POST /api/delivery-zone/check-serviceability

Body:
{
  "latitude": 24.27,
  "longitude": 84.62
}

Response:
{
  "success": true,
  "data": {
    "isServiceable": true,
    "distance": 2.5,
    "radiusKm": 10,
    "message": "You are within our delivery zone (2.5 km away)"
  }
}
```

### 3. Check Serviceability (Query)
```
GET /api/delivery-zone/check?latitude=24.27&longitude=84.62

Response: Same as POST method
```

### 4. Get Serviceable Shops
```
GET /api/shops/serviceable?latitude=24.27&longitude=84.62&business_type=grocery&page=1&page_size=10

Response:
{
  "success": true,
  "data": {
    "shops": [...],
    "pagination": {...},
    "serviceable": true,
    "isServiceable": true,
    "distance": 2.5,
    "radiusKm": 10,
    "message": "You are within our delivery zone"
  }
}

// If outside zone:
{
  "success": true,
  "data": {
    "shops": [],
    "pagination": { "total": 0 },
    "serviceable": false,
    "message": "Sorry, we don't deliver to your area. You are 25 km away. We deliver within 10 km radius."
  }
}
```

---

## 🧪 Testing

### Test Case 1: Inside Service Area
```javascript
// Mock location inside Latehar
const testLocation = {
  latitude: 24.27,
  longitude: 84.62
};

// Should return shops
const response = await fetch(
  '/api/shops/serviceable?latitude=24.27&longitude=84.62'
);
```

### Test Case 2: Outside Service Area
```javascript
// Mock location far away
const testLocation = {
  latitude: 23.0,  // Different city
  longitude: 85.0
};

// Should return empty shops + message
const response = await fetch(
  '/api/shops/serviceable?latitude=23.0&longitude=85.0'
);
```

### Test Case 3: Check Zone Configuration
```javascript
const response = await fetch('/api/delivery-zone');
console.log(response.data); // Should show your zone config
```

---

## 🎨 UI Integration Examples

### Example 1: Home Page Integration
```jsx
// frontend/src/pages/home/Home.jsx

import ServiceabilityCheck from '../../components/ServiceabilityCheck';

function Home() {
  const [isServiceable, setIsServiceable] = useState(false);
  const [shops, setShops] = useState([]);

  return (
    <div className="home-page">
      <Header />
      
      <ServiceabilityCheck onServiceabilityChange={setIsServiceable}>
        <div className="shops-section">
          <h2>Recommended Shops</h2>
          {shops.length > 0 ? (
            <ShopsGrid shops={shops} />
          ) : (
            <EmptyState message="No shops available" />
          )}
        </div>
      </ServiceabilityCheck>

      <Footer />
    </div>
  );
}
```

### Example 2: Browse Page Integration
```jsx
// frontend/src/pages/Browse.jsx

import useServiceability from '../hooks/useServiceability';

function Browse({ businessType }) {
  const {
    isServiceable,
    loading,
    error,
    distance,
    radiusKm,
    message,
    getCurrentLocation,
    getServiceableShops,
  } = useServiceability();

  const [shops, setShops] = useState([]);

  useEffect(() => {
    initializeShops();
  }, [businessType]);

  const initializeShops = async () => {
    try {
      await getCurrentLocation();
      const result = await getServiceableShops(businessType);
      setShops(result.shops);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Checking your location..." />;
  }

  if (!isServiceable) {
    return (
      <div className="not-serviceable-container">
        <h2>Outside Delivery Area</h2>
        <p>{message}</p>
        <p>You are {distance} km away. We deliver within {radiusKm} km radius.</p>
        <button onClick={initializeShops}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="browse-page">
      <h2>{businessType === 'grocery' ? 'Grocery Stores' : 'Restaurants'}</h2>
      <ShopsList shops={shops} businessType={businessType} />
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Issue: Geolocation not working
**Solution:** 
- Check if HTTPS is enabled (geolocation requires HTTPS in production)
- Check browser geolocation permissions
- Test with `navigator.geolocation.getCurrentPosition()` in console

### Issue: Always showing "Outside Delivery Area"
**Solution:**
- Verify zone coordinates: `GET /api/delivery-zone`
- Check if test location is within the radius
- Verify radius distance: `24.2667, 84.6167` with 10 km is approximately:
  - North: 24.3562
  - South: 24.1772
  - East: 84.7102
  - West: 84.5232

### Issue: CORS errors when calling backend
**Solution:**
- Ensure backend CORS is configured for your frontend domain
- Check `backend/src/config/cors.js` or server middleware

### Issue: "Latitude must be between -90 and 90"
**Solution:**
- Ensure you're sending valid coordinates
- Check for swapped lat/lon values

---

## 📊 Distance Calculation Formula

The system uses the **Haversine formula** to calculate great-circle distance between two points on Earth:

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1−a))
d = R × c  // R is Earth's radius = 6371 km
```

**Example:**
- Zone Center: 24.2667, 84.6167
- User Location: 24.27, 84.62
- Distance: ~2.5 km (within 10 km radius ✓)

---

## 🚀 Production Checklist

- [ ] Update zone center coordinates for your city
- [ ] Set appropriate delivery radius in km
- [ ] Test geolocation in target browsers
- [ ] Test with real GPS devices
- [ ] Add analytics to track serviceability rejections
- [ ] Create fallback for users without location permission
- [ ] Add FAQ section explaining delivery zones
- [ ] Consider adding delivery zone map visualization
- [ ] Set up error logging for serviceability checks
- [ ] Create admin panel to manage delivery zones (future)

---

## 🔮 Future Enhancements

1. **Multiple Delivery Zones** - Support multiple cities/zones
2. **Zone Map Visualization** - Show service area on interactive map
3. **Admin Dashboard** - Manage zones without code changes
4. **Zone Scheduling** - Different zones for different times
5. **Address Auto-Select** - Auto-check saved addresses for serviceability
6. **Dynamic Radius** - Different radius per shop
7. **Zone Analytics** - Track rejections, coverage metrics
8. **Pincode-based Zones** - Alternative to radius-based

---

## 📞 Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review the API endpoint responses
3. Check browser console for errors
4. Verify backend logs: `tail -f backend/logs.txt`
