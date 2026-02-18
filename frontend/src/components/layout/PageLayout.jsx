import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingCart from '../common/FloatingCart';

const PageLayout = () => {
  return (
    <div className="page-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <FloatingCart />
    </div>
  );
};

export default PageLayout;
