import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const PageLayout = () => {
  return (
    <div className="page-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PageLayout;
