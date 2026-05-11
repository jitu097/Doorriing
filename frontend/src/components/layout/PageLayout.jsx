
import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import MainFooter from './Footer';
import MobileFooter from '../common/Footer';
import FloatingCart from '../common/FloatingCart';
import CartDrawer from '../common/CartDrawer';
import './PageLayout.css';


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

  // Scroll direction detection on main content
  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const handleScroll = () => {
      const currentY = mainContent.scrollTop;
      const threshold = 20;
      
      // Show footer when at top
      if (currentY <= 50) {
        setFooterVisible(true);
        lastScrollY.current = currentY;
        return;
      }

      // Hide/show based on scroll direction
      if (currentY > lastScrollY.current + threshold) {
        // Scrolling down
        setFooterVisible(false);
      } else if (currentY < lastScrollY.current - threshold) {
        // Scrolling up
        setFooterVisible(true);
      }
      lastScrollY.current = currentY;
    };

    mainContent.addEventListener('scroll', handleScroll);
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="page-layout">
      <Navbar onCartClick={handleCartOpen} />
      <main className="main-content" style={{ paddingBottom: !hideFooterAndCart ? '70px' : '0px' }}>
        <Outlet />
        {/* keep the desktop footer inside main-content so it scrolls with the page */}
        {isHomePage && <MainFooter />}
      </main>
      {!hideFooterAndCart && <MobileFooter visible={footerVisible} onCartClick={handleCartOpen} />}
      {!hideFloatingCart && <FloatingCart onCartClick={handleCartOpen} footerVisible={footerVisible} />}
      <CartDrawer isOpen={showCart} onClose={handleCartClose} />
    </div>
  );
};

export default PageLayout;
