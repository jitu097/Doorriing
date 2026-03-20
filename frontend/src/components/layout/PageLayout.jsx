import { Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './Navbar';
import MainFooter from './Footer';
import MobileFooter from '../common/Footer';
import FloatingCart from '../common/FloatingCart';
import CartDrawer from '../common/CartDrawer';

const PageLayout = () => {
  const [showCart, setShowCart] = useState(false);
  const location = useLocation();

  const handleCartOpen = () => setShowCart(true);
  const handleCartClose = () => setShowCart(false);

  // Hide FloatingCart on /cart and /checkout
  const hideFloatingCart =
    location.pathname.startsWith('/cart') || location.pathname.startsWith('/checkout');

  const isHomePage = location.pathname === '/' || location.pathname === '/home';
  return (
    <div className="page-layout">
      <Navbar onCartClick={handleCartOpen} />
      <main className="main-content">
        <Outlet />
      </main>
      {isHomePage && <MainFooter />}
      {!hideFloatingCart && <MobileFooter />}
      {!hideFloatingCart && <FloatingCart onCartClick={handleCartOpen} />}
      <CartDrawer isOpen={showCart} onClose={handleCartClose} />
    </div>
  );
};

export default PageLayout;
