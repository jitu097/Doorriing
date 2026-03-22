import { Routes, Route, Navigate } from 'react-router-dom';

import React, { Suspense, lazy } from 'react';
const Login = lazy(() => import('../pages/auth/Login'));
const Signup = lazy(() => import('../pages/auth/Signup'));
const DeleteAccount = lazy(() => import('../pages/auth/DeleteAccount'));
const Landingpage = lazy(() => import('../pages/Landingpage/Landingpage'));
const Home = lazy(() => import('../pages/home/Home'));
const Checkout = lazy(() => import('../pages/cart/Checkout'));
const CheckoutPayment = lazy(() => import('../pages/cart/CheckoutPayment'));
const OrderSuccess = lazy(() => import('../pages/cart/OrderSuccess'));
const OrderConfirmation = lazy(() => import('../pages/orders/OrderConfirmation'));
const OrdersList = lazy(() => import('../pages/orders/OrdersList'));
const OrderDetails = lazy(() => import('../pages/orders/OrderDetails'));
const Profile = lazy(() => import('../pages/profile/Profile'));
const Address = lazy(() => import('../pages/Address/Address'));
const About = lazy(() => import('../pages/legal/About'));
const Contact = lazy(() => import('../pages/legal/Contact'));
const PrivacyPolicy = lazy(() => import('../pages/legal/PrivacyPolicy'));
const TermsConditions = lazy(() => import('../pages/legal/TermsConditions'));
const RefundPolicy = lazy(() => import('../pages/legal/RefundPolicy'));
const DeleteAccountInfo = lazy(() => import('../pages/legal/DeleteAccountInfo'));

const ShopsList = lazy(() => import('../pages/shop/ShopsList'));
const ShopDetails = lazy(() => import('../pages/shop/ShopDetails'));
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));
const PageLayout = lazy(() => import('../components/layout/PageLayout'));
const Grocery = lazy(() => import('../pages/Grocery/Grocery'));
const GroceryLanding = lazy(() => import('../pages/Grocery/GroceryLanding'));
const Restaurant = lazy(() => import('../pages/Restaurant/Restaurant'));
const RestaurantLanding = lazy(() => import('../pages/Restaurant/RestaurantLanding'));
const ItemCategory = lazy(() => import('../pages/Grocery/itemcategory'));
const CategoryItem = lazy(() => import('../pages/Restaurant/categoryitem'));
const SubCategory = lazy(() => import('../pages/Restaurant/subcategory'));
const SubCategoryItem = lazy(() => import('../pages/Grocery/subcategoryitem'));

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 600;
}

const UserRoutes = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
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
        <Route path="/delete-account" element={<DeleteAccountInfo />} />
        <Route path="/settings/delete-account" element={<DeleteAccount />} />
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
    </Suspense>
  );
};

export default UserRoutes;
