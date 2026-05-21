import { Routes, Route, Navigate } from 'react-router-dom';

import React, { Suspense, lazy } from 'react';
import { SuspenseFallback } from '../components/common/SuspenseFallback';
import RouteErrorBoundary from './RouteErrorBoundary';

// ── Critical startup routes (loaded with minimal delay) ──────────────────────
const Login = lazy(() => import('../pages/auth/Login'));
const Signup = lazy(() => import('../pages/auth/Signup'));
const Landingpage = lazy(() => import('../pages/Landingpage/Landingpage'));
const Home = lazy(() => import('../pages/home/Home'));

// ── Layout & shared wrappers ──────────────────────────────────────────────────
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));
const PageLayout = lazy(() => import('../components/layout/PageLayout'));

// ── Browsing routes (public grocery & restaurant pages) ───────────────────────
const Grocery = lazy(() => import('../pages/Grocery/Grocery'));
const Restaurant = lazy(() => import('../pages/Restaurant/Restaurant'));
const ItemCategory = lazy(() => import('../pages/Grocery/itemcategory'));
const CategoryItem = lazy(() => import('../pages/Restaurant/categoryitem'));
const SubCategory = lazy(() => import('../pages/Restaurant/subcategory'));
const SubCategoryItem = lazy(() => import('../pages/Grocery/subcategoryitem'));
const ShopsList = lazy(() => import('../pages/shop/ShopsList'));
const ShopDetails = lazy(() => import('../pages/shop/ShopDetails'));

// ── Non-critical protected routes ─────────────────────────────────────────────
// These are only loaded when the user navigates to them, reducing startup bundle
/* webpackChunkName: "checkout" */
const CheckoutPayment = lazy(() => import('../pages/cart/CheckoutPayment'));
const OrderSuccess = lazy(() => import('../pages/cart/OrderSuccess'));
const OrderConfirmation = lazy(() => import('../pages/orders/OrderConfirmation'));

/* webpackChunkName: "orders" */
const OrdersList = lazy(() => import('../pages/orders/OrdersList'));
const OrderDetails = lazy(() => import('../pages/orders/OrderDetails'));
const TrackOrder = lazy(() => import('../pages/orders/TrackOrder'));
const CallDriver = lazy(() => import('../pages/orders/CallDriver'));

/* webpackChunkName: "profile" */
const Profile = lazy(() => import('../pages/profile/Profile'));
const Address = lazy(() => import('../pages/Address/Address'));
const DeleteAccount = lazy(() => import('../pages/auth/DeleteAccount'));

/* webpackChunkName: "legal" */
const About = lazy(() => import('../pages/legal/About'));
const Contact = lazy(() => import('../pages/legal/Contact'));
const PrivacyPolicy = lazy(() => import('../pages/legal/PrivacyPolicy'));
const TermsConditions = lazy(() => import('../pages/legal/TermsConditions'));
const RefundPolicy = lazy(() => import('../pages/legal/RefundPolicy'));
const DeleteAccountInfo = lazy(() => import('../pages/legal/DeleteAccountInfo'));

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 600;
}

// Tiny inline null-fallback — prevents full-screen spinner on route transitions
// when a layout or page chunk is already partially cached
const PageFallback = () => <SuspenseFallback />;

const UserRoutes = () => {
  return (
    // Outer boundary covers the PageLayout, Navbar, and all pages
    <RouteErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Landing Page - Only show on mobile, redirect to /home on desktop */}
          <Route
            path="/"
            element={
              isMobile() ? <Landingpage /> : <Navigate to="/home" replace />
            }
          />

          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public Pages wrapped in PageLayout */}
          <Route element={<PageLayout />}>
            {/* Critical browsing routes – loaded eagerly within the shared bundle */}
            <Route path="/home" element={<Home />} />
            <Route path="/shops" element={<ShopsList />} />
            <Route path="/shop/:shopId" element={<ShopDetails />} />

            {/* Legal pages — low priority, wrapped in a per-group error boundary */}
            <Route
              path="/about"
              element={
                <RouteErrorBoundary>
                  <Suspense fallback={<PageFallback />}>
                    <About />
                  </Suspense>
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/contact"
              element={
                <RouteErrorBoundary>
                  <Suspense fallback={<PageFallback />}>
                    <Contact />
                  </Suspense>
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/privacy-policy"
              element={
                <RouteErrorBoundary>
                  <Suspense fallback={<PageFallback />}>
                    <PrivacyPolicy />
                  </Suspense>
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/terms"
              element={
                <RouteErrorBoundary>
                  <Suspense fallback={<PageFallback />}>
                    <TermsConditions />
                  </Suspense>
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/refund-policy"
              element={
                <RouteErrorBoundary>
                  <Suspense fallback={<PageFallback />}>
                    <RefundPolicy />
                  </Suspense>
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/delete-account"
              element={
                <RouteErrorBoundary>
                  <Suspense fallback={<PageFallback />}>
                    <DeleteAccountInfo />
                  </Suspense>
                </RouteErrorBoundary>
              }
            />
            <Route path="/settings/delete-account" element={<DeleteAccount />} />
          </Route>

          {/* Redirect roots to browse pages */}
          <Route path="/grocery" element={<Navigate to="/grocery/browse" replace />} />
          <Route path="/restaurant" element={<Navigate to="/restaurant/browse" replace />} />

          {/* Public Grocery & Restaurant Browsing */}
          <Route element={<PageLayout />}>
            <Route path="/grocery/browse" element={<Grocery />} />
            <Route path="/grocery/shop/:shopId" element={<ItemCategory />} />
            <Route path="/grocery/shop/:shopId/category/:categoryId" element={<SubCategoryItem />} />
            <Route path="/restaurant/browse" element={<Restaurant />} />
            <Route path="/restaurant/shop/:restaurantId" element={<CategoryItem />} />
            <Route path="/restaurant/shop/:restaurantId/category/:categoryId" element={<SubCategory />} />
          </Route>

          {/* Protected Routes — require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route element={<PageLayout />}>
              {/* Checkout group */}
              <Route
                path="/checkout/payment"
                element={
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <CheckoutPayment />
                    </Suspense>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/order-success"
                element={
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <OrderSuccess />
                    </Suspense>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/order-confirmation"
                element={
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <OrderConfirmation />
                    </Suspense>
                  </RouteErrorBoundary>
                }
              />

              {/* Orders group */}
              <Route
                path="/orders"
                element={
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <OrdersList />
                    </Suspense>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/orders/:orderId"
                element={
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <OrderDetails />
                    </Suspense>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/track/:orderId"
                element={
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <TrackOrder />
                    </Suspense>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/call/:orderId"
                element={
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <CallDriver />
                    </Suspense>
                  </RouteErrorBoundary>
                }
              />

              {/* Profile group */}
              <Route
                path="/profile"
                element={
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <Profile />
                    </Suspense>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/address"
                element={
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <Address />
                    </Suspense>
                  </RouteErrorBoundary>
                }
              />
            </Route>
          </Route>

          {/* Catch all — redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
};

export default UserRoutes;
