# DoorRing Loading Screen Animation 🔔🚪

This is an animated loading screen for your DoorRing website that tells the story of your delivery service in 6 seconds.

## Animation Flow

1. **0s** - Delivery boy walks in from the left
2. **1.5s** - Delivery boy arrives at the door
3. **2s** - Doorbell rings 🔔
4. **3s** - Door opens
5. **4s** - Customer appears and receives the bag
6. **5s** - Door closes
7. **6s** - Loading screen fades out

## Files Created

- `frontend/src/components/common/LoadingScreen.jsx` - React component
- `frontend/src/components/common/LoadingScreen.css` - Animation styles
- `frontend/src/App.jsx` - Updated to show loading screen

## How It Works

The loading screen shows automatically when the app starts and disappears after one complete animation cycle (6 seconds).

## Customization Options

### 1. Change Animation Duration

In `App.jsx`, modify the timeout:

```javascript
// Change 6000 to your desired duration in milliseconds
setTimeout(() => {
  setLoading(false)
}, 6000)
```

### 2. Change Colors

In `LoadingScreen.css`, modify the gradient background:

```css
.loading-screen {
  /* Change these colors */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

#### Color Suggestions:
- **Fresh Green**: `linear-gradient(135deg, #11998e 0%, #38ef7d 100%)`
- **Sunset Orange**: `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`
- **Ocean Blue**: `linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)`
- **Dark Mode**: `linear-gradient(135deg, #2c3e50 0%, #3498db 100%)`

### 3. Change Brand Text

In `LoadingScreen.jsx`, modify the brand name and tagline:

```jsx
<h1 className="brand-name">DoorRing</h1>
<p className="brand-tagline">Ring once, your needs arrive</p>
```

#### Tagline Alternatives:
- "From doorbell to delivery in seconds"
- "Your neighborhood marketplace"
- "Delivered to your doorstep"
- "Fresh groceries at your door"

### 4. Change Character Emojis

Replace the emojis in `LoadingScreen.jsx`:

```jsx
.delivery-head {🧑} → Can use 👨, 🧑‍🦱, 👨‍🦰, etc.
.customer-head {😊} → Can use 👩, 🙂, 😄, etc.
.delivery-bag {🛍️} → Can use 📦, 🎁, 🛒, etc.
.doorbell {🔔} → Can use 🚪, 🔊, etc.
```

### 5. Adjust Animation Speed

In `LoadingScreen.css`, change the animation duration:

```css
/* Make animations faster (4s) or slower (8s) */
.delivery-boy {
  animation: deliveryWalk 6s ease-in-out infinite;
  /* Change 6s to your preferred speed */
}
```

### 6. Show Loading Screen on Page Load Only

Current setup shows on every app mount. To show only on first visit:

```javascript
// In App.jsx
const [loading, setLoading] = useState(() => {
  // Check if user has visited before
  return !sessionStorage.getItem('hasLoaded')
})

useEffect(() => {
  if (loading) {
    const timer = setTimeout(() => {
      setLoading(false)
      sessionStorage.setItem('hasLoaded', 'true')
    }, 6000)
    return () => clearTimeout(timer)
  }
}, [loading])
```

### 7. Show Loading Screen While Fetching Data

You can also trigger it based on app loading state:

```javascript
// In App.jsx
import { useAuth } from './context/AuthContext'

function App() {
  const { loading: authLoading } = useAuth()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      setTimeout(() => setShowSplash(false), 1000)
    }
  }, [authLoading])

  if (showSplash) {
    return <LoadingScreen />
  }

  // Rest of your app
}
```

## Advanced: Using Lottie Animations

If you want more detailed animations, you can use Lottie:

### Step 1: Install Lottie

```bash
npm install lottie-react
```

### Step 2: Get Animation JSON

Visit these sites to find delivery animations:
- [LottieFiles](https://lottiefiles.com/) - Search "delivery"
- [Storyset](https://storyset.com/) - Download as Lottie
- [Icons8](https://icons8.com/animated-icons) - Animated icons

### Step 3: Use in Component

```jsx
import Lottie from 'lottie-react'
import deliveryAnimation from './delivery-animation.json'

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <Lottie 
        animationData={deliveryAnimation}
        loop={true}
        style={{ width: 400, height: 400 }}
      />
      <h1>DoorRing</h1>
    </div>
  )
}
```

## Using GSAP for More Control

For complex animations, use GSAP:

### Install GSAP

```bash
npm install gsap
```

### Example Usage

```jsx
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

const LoadingScreen = () => {
  const deliveryRef = useRef()
  
  useEffect(() => {
    const tl = gsap.timeline()
    
    tl.to(deliveryRef.current, {
      x: 200,
      duration: 2,
      ease: 'power2.inOut'
    })
    .to('.doorbell', {
      rotation: 15,
      yoyo: true,
      repeat: 3,
      duration: 0.2
    })
    // Add more animations
  }, [])
  
  return (
    <div className="loading-screen">
      <div ref={deliveryRef} className="delivery-boy">
        {/* Content */}
      </div>
    </div>
  )
}
```

## Testing

To test the loading screen:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to the app
3. The loading screen should play automatically
4. After 6 seconds, it will fade out and show your main app

## Troubleshooting

### Loading screen doesn't disappear

- Check browser console for errors
- Verify the timeout in `App.jsx`
- Make sure `LoadingScreen.css` is imported

### Animation looks broken on mobile

- The design is responsive, but test on actual devices
- Adjust the media queries in `LoadingScreen.css`

### Emojis not showing

- Some emojis may not render on all devices
- Consider using SVG icons instead
- Use image files for consistent cross-platform appearance

## Performance Notes

- Pure CSS animations are very performant
- No external dependencies added
- Animation runs at 60fps on most devices
- Mobile-optimized with responsive design

## Future Enhancements

Consider these improvements:

1. **Sound Effects** - Add doorbell sound
2. **Skip Button** - Let users skip the animation
3. **Random Variations** - Show different characters each time
4. **Progress Bar** - Show loading progress
5. **Preload Assets** - Preload fonts and images while animation plays

Enjoy your DoorRing loading animation! 🎉
