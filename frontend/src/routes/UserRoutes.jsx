import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import Landingpage from '../pages/Landingpage/Landingpage';
import Home from '../pages/home/Home';
import Checkout from '../pages/cart/Checkout';
import OrderSuccess from '../pages/cart/OrderSuccess';
import OrderConfirmation from '../pages/orders/OrderConfirmation';
import OrdersList from '../pages/orders/OrdersList';
import OrderDetails from '../pages/orders/OrderDetails';
import Profile from '../pages/profile/Profile';
import Address from '../pages/Address/Address';
import AboutUs from '../pages/Aboutus/aboutus';

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

const UserRoutes = () => {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<Landingpage />} />

      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes with Layout */}
      <Route element={<ProtectedRoute />}>
        {/* Landing pages without navbar */}
        <Route path="/grocery" element={<GroceryLanding />} />
        <Route path="/restaurant" element={<RestaurantLanding />} />

        {/* Routes with Layout (includes navbar) */}
        <Route element={<PageLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/grocery/browse" element={<Grocery />} />
          <Route path="/grocery/shop/:shopId" element={<ItemCategory />} />
          <Route path="/grocery/shop/:shopId/category/:categoryId" element={<SubCategoryItem />} />
          <Route path="/restaurant/browse" element={<Restaurant />} />
          <Route path="/restaurant/shop/:restaurantId" element={<CategoryItem />} />
          <Route path="/restaurant/shop/:restaurantId/category/:categoryId" element={<SubCategory />} />
          <Route path="/shops" element={<ShopsList />} />
          <Route path="/shop/:shopId" element={<ShopDetails />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/orders/:orderId" element={<OrderDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/address" element={<Address />} />
          <Route path="/about" element={<AboutUs />} />
        </Route>
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default UserRoutes;
