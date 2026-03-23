
import { useState, useEffect } from 'react';
import UserRoutes from './routes/UserRoutes';
import LoadingScreen from './components/common/LoadingScreen';

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 600;
}


function App() {
  const [loading, setLoading] = useState(isMobile());

  useEffect(() => {
    if (!isMobile()) {
      setLoading(false);
      return;
    }
    // Show loading screen for 6 seconds (one full animation cycle)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Toggle body scroll based on loading state
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Clean up on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [loading]);

  if (loading) {
    return <LoadingScreen />;
  }

  return <UserRoutes />;
}

export default App;
