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

  const lastScrollY = useRef(0);

  const handleCartOpen = () => setShowCart(true);
  const handleCartClose = () => setShowCart(false);

  const hideFooterAndCart =
    location.pathname.startsWith('/cart') ||
    location.pathname.startsWith('/checkout');

  const hideFloatingCart =
    hideFooterAndCart ||
    location.pathname.startsWith('/address');

  const isHomePage =
    location.pathname === '/' ||
    location.pathname === '/home';

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      const delta = 6;

      if (scrollTop <= 50) {
        setFooterVisible(true);
      } else if (scrollTop > lastScrollY.current + delta) {
        setFooterVisible(false);
      } else if (scrollTop < lastScrollY.current - delta) {
        setFooterVisible(true);
      }

      lastScrollY.current = scrollTop;
    };

    setFooterVisible(true);
    lastScrollY.current =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [location.pathname]);

  return (
    <div className="page-layout">
      <Navbar />

      <main
        className="main-content"
        style={{
          paddingBottom: !hideFooterAndCart ? '80px' : '0px',
        }}
      >
        <Outlet />

        {isHomePage && <MainFooter />}
      </main>

      {!hideFooterAndCart && (
        <MobileFooter
          visible={footerVisible}
          onCartClick={handleCartOpen}
        />
      )}

      {!hideFloatingCart && (
        <FloatingCart
          onCartClick={handleCartOpen}
          footerVisible={footerVisible}
        />
      )}

      <CartDrawer
        isOpen={showCart}
        onClose={handleCartClose}
      />
    </div>
  );
};

export default PageLayout;
