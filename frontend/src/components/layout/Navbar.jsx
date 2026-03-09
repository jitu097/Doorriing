
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import Modal from '../common/Modal';
import AddressForm from '../common/AddressForm';
import { useAddress } from '../../context/AddressContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../hooks/useAuth';
import './Navbar.css';

const Navbar = ({ onCartClick }) => {
  const navigate = useNavigate();
  const { getCartCount } = useCart();
  const { user, logout } = useAuth();
  const [showAccount, setShowAccount] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const { activeAddress, addAddress, updateAddress } = useAddress();

  const [navFormData, setNavFormData] = useState({
    type: 'Home',
    name: user?.displayName || '',
    phone: '',
    building: '',
    area: '',
    landmark: '',
    city: 'Latehar',
    state: 'Jharkhand',
    postalCode: '829206',
    isDefault: true
  });

  React.useEffect(() => {
    if (activeAddress) {
      setNavFormData(activeAddress);
    }
  }, [activeAddress, showLocation]);

  const cartCount = getCartCount();


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleAccountClick = () => setShowAccount((v) => !v);
  const handleLocationClick = () => navigate('/address');
  const handleLocationClose = () => setShowLocation(false);

  const handleNavAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeAddress && activeAddress.id) {
        await updateAddress(activeAddress.id, navFormData);
      } else {
        await addAddress({ ...navFormData, isDefault: true });
      }
      setShowLocation(false);
    } catch (error) {
      alert(error.message || 'Error saving address from Navbar');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/home" className="navbar-logo">
          <img src="/Doorriing.png" alt="DoorRing" className="logo-image" />
        </Link>

        {/* Location */}
        {user && (
          <div className="navbar-location" onClick={handleLocationClick} title="Manage delivery addresses" style={{ cursor: 'pointer' }}>
            <div className="location-address">{activeAddress?.area || 'Select Location'} <span className="account-caret">▼</span></div>
          </div>
        )}

        {/* Search - Desktop */}
        <div className="navbar-searchbar navbar-searchbar-desktop">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            className="searchbar-input"
            placeholder='Search "chocolate"'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Search - Mobile Icon */}
        <button
          className="searchbar-icon-btn searchbar-mobile-icon"
          type="button"
          onClick={() => setShowSearch(true)}
        >
          <img src="/search.png" alt="Search" className="searchbar-icon" />
        </button>

        {/* Search - Mobile Overlay */}
        {showSearch && (
          <div className="navbar-searchbar-overlay">
            <input
              type="text"
              className="searchbar-input-overlay"
              placeholder="Search food..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <button
              className="searchbar-close-btn"
              type="button"
              onClick={() => setShowSearch(false)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Account Dropdown - Only show when logged in */}
        {user && (
          <div className="navbar-account-wrapper">
            <div className="navbar-account" onClick={handleAccountClick} tabIndex={0}>
              <img src="/account.png" alt="Account" className="account-icon" />
            </div>
            {showAccount && (
              <div className="account-dropdown">
                <ul>
                  <li><Link to="/orders">My Orders</Link></li>
                  <li><Link to="/address">Address</Link></li>
                  <li><Link to="/profile">Profile</Link></li>
                  <li><Link to="/about">About Us</Link></li>
                  <li><button onClick={handleLogout} className="logout-btn">Logout</button></li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Login Button - Show when not logged in */}
        {!user && (
          <Link to="/login" className="navbar-login-btn">
            Login
          </Link>
        )}

        {/* Cart Icon */}
        <button onClick={onCartClick} className="navbar-cart-ui">
          <span className="cart-svg">
            {/* Bag icon SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="7" width="14" height="12" rx="3" />
              <path d="M9 7V6a3 3 0 0 1 6 0v1" />
            </svg>
          </span>
          <span className="cart-ui-label">Cart</span>
          <span className="cart-ui-badge">{cartCount}</span>
        </button>
      </div>

      {/* Location Modal */}
      {showLocation && (
        <AddressForm
          formData={navFormData}
          setFormData={setNavFormData}
          onSubmit={handleNavAddressSubmit}
          onCancel={handleLocationClose}
          isEditing={!!activeAddress}
        />
      )}
    </nav>
  );
};

export default Navbar;
