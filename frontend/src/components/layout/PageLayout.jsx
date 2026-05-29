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
    const mainEl = document.querySelector('.main-content');

    const readPos = (source) => {
      if (!source) return 0;
      if (source === window) return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      return source.scrollTop || 0;
    };

    const handleScroll = (e) => {
      const src = e && e.target && e.target !== document ? e.target : window;
      const currentY = readPos(src === document ? window : src);

      if (currentY <= 20) {
        setFooterVisible(true);
        lastScrollY.current = currentY;
        return;
      }

      const delta = 8;
      if (currentY > lastScrollY.current + delta) {
        setFooterVisible(false);
      } else if (currentY < lastScrollY.current - delta) {
        setFooterVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    if (mainEl) mainEl.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainEl) mainEl.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Toggle body class to remove the bottom padding when footer is hidden
  useEffect(() => {
    const cls = 'footer-hidden';
    if (typeof document !== 'undefined') {
      if (!hideFooterAndCart) {
        if (!footerVisible) {
          document.body.classList.add(cls);
        } else {
          document.body.classList.remove(cls);
        }
      } else {
        document.body.classList.remove(cls);
      }
    }

    return () => {
      if (typeof document !== 'undefined') document.body.classList.remove(cls);
    };
  }, [footerVisible, hideFooterAndCart]);

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
