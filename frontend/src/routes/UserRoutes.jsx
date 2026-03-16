import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import Landingpage from '../pages/Landingpage/Landingpage';
import Home from '../pages/home/Home';
import Checkout from '../pages/cart/Checkout';
import CheckoutPayment from '../pages/cart/CheckoutPayment';
import OrderSuccess from '../pages/cart/OrderSuccess';
import OrderConfirmation from '../pages/orders/OrderConfirmation';
import OrdersList from '../pages/orders/OrdersList';
import OrderDetails from '../pages/orders/OrderDetails';
import Profile from '../pages/profile/Profile';
import Address from '../pages/Address/Address';
import About from '../pages/legal/About';
import Contact from '../pages/legal/Contact';
import PrivacyPolicy from '../pages/legal/PrivacyPolicy';
import TermsConditions from '../pages/legal/TermsConditions';
import RefundPolicy from '../pages/legal/RefundPolicy';

import ShopsList from '../pages/shop/ShopsList';
import ShopDetails from '../pages/shop/ShopDetails';
import ProtectedRoute from './ProtectedRoute';
import PageLayout from '../components/layout/PageLayout';
import Grocery from '../pages/Grocery/Grocery';
import GroceryLanding from '../pages/Grocery/GroceryLanding';
import Restaurant from '../pages/Restaurant/Restaurant';
import RestaurantLanding from '../pages/Restaurant/RestaurantLanding';
import ItemCategory from '../pages/Grocery/itemcategory';
import CategoryItem from '../pages/Restaurant/categoryitem';
import SubCategory from '../pages/Restaurant/subcategory';
import SubCategoryItem from '../pages/Grocery/subcategoryitem';

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 600;
}

const UserRoutes = () => {
  return (
    <Routes>
      {/* Landing Page - Only show on mobile, redirect to /home on desktop */}
      <Route
        path="/"
        element={
          isMobile() ? <Landingpage /> : <Navigate to="/home" replace />
        }
      />

      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Public Browsing Pages - Allow exploring without auth */}
      <Route element={<PageLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/shops" element={<ShopsList />} />
        <Route path="/shop/:shopId" element={<ShopDetails />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
      </Route>

      {/* Public Grocery & Restaurant Pages - Browse without navbar */}
      <Route path="/grocery" element={<GroceryLanding />} />
      <Route path="/restaurant" element={<RestaurantLanding />} />

      {/* Public Grocery & Restaurant Browsing - With navbar */}
      <Route element={<PageLayout />}>
        <Route path="/grocery/browse" element={<Grocery />} />
        <Route path="/grocery/shop/:shopId" element={<ItemCategory />} />
        <Route path="/grocery/shop/:shopId/category/:categoryId" element={<SubCategoryItem />} />
        <Route path="/restaurant/browse" element={<Restaurant />} />
        <Route path="/restaurant/shop/:restaurantId" element={<CategoryItem />} />
        <Route path="/restaurant/shop/:restaurantId/category/:categoryId" element={<SubCategory />} />
      </Route>

      {/* Protected Routes - Require authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<PageLayout />}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/payment" element={<CheckoutPayment />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/orders/:orderId" element={<OrderDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/address" element={<Address />} />
        </Route>
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default UserRoutes;
