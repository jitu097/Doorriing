
import { useState, useEffect } from 'react';
import { getRedirectResult } from 'firebase/auth';
import UserRoutes from './routes/UserRoutes';
import LoadingScreen from './components/common/LoadingScreen';
import { auth } from './config/firebase';

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 600;
}


function App() {
  const [loading, setLoading] = useState(isMobile());

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);

        if (result?.user) {
          console.log('Google login success:', result.user);
        }
      } catch (error) {
        console.error('Google redirect error:', error);
      }
    };

    handleRedirectResult();
  }, []);

  useEffect(() => {
    if (!isMobile()) {
      setLoading(false);
      return;
    }
    
    // Wait for auth state to hydrate instead of hardcoded delay
    auth.authStateReady().then(() => {
      // Small artificial delay to allow animations/styles to paint smoothly, but much shorter than 4s
      setTimeout(() => setLoading(false), 500); 
    }).catch(() => {
      setLoading(false);
    });
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
 //jitu