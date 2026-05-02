
import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import MainFooter from './Footer';
import MobileFooter from '../common/Footer';
import FloatingCart from '../common/FloatingCart';
import CartDrawer from '../common/CartDrawer';


const PageLayout = () => {
  const [showCart, setShowCart] = useState(false);
  const [footerVisible, setFooterVisible] = useState(true);
  const location = useLocation();
  const lastScrollY = useRef(window.scrollY);

  const handleCartOpen = () => setShowCart(true);
  const handleCartClose = () => setShowCart(false);

  // Hide both footer and cart on /cart and /checkout
  const hideFooterAndCart =
    location.pathname.startsWith('/cart') || location.pathname.startsWith('/checkout');

  // Hide only floating cart on /address (but keep footer visible)
  const hideFloatingCart = hideFooterAndCart || location.pathname.startsWith('/address');

  const isHomePage = location.pathname === '/' || location.pathname === '/home';

  // Scroll direction detection
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current + 10) {
        // Scrolling down
        setFooterVisible(false);
      } else if (currentY < lastScrollY.current - 10) {
        // Scrolling up
        setFooterVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="page-layout">
      <Navbar onCartClick={handleCartOpen} />
      <main className="main-content">
        <Outlet />
      </main>
      {isHomePage && <MainFooter />}
      {!hideFooterAndCart && <MobileFooter visible={footerVisible} onCartClick={handleCartOpen} />}
      {!hideFloatingCart && <FloatingCart onCartClick={handleCartOpen} footerVisible={footerVisible} />}
      <CartDrawer isOpen={showCart} onClose={handleCartClose} />
    </div>
  );
};

export default PageLayout;
