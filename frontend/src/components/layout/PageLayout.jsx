import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingCart from '../common/FloatingCart';
import CartDrawer from '../common/CartDrawer';

const PageLayout = () => {
  const [showCart, setShowCart] = useState(false);

  const handleCartOpen = () => setShowCart(true);
  const handleCartClose = () => setShowCart(false);

  return (
    <div className="page-layout">
      <Navbar onCartClick={handleCartOpen} />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <FloatingCart onCartClick={handleCartOpen} />
      <CartDrawer isOpen={showCart} onClose={handleCartClose} />
    </div>
  );
};

export default PageLayout;
