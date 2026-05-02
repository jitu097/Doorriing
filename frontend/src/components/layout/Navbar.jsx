import { Link, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal';
import AddressForm from '../common/AddressForm';
import { useAddress } from '../../context/AddressContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../hooks/useAuth';
import './Navbar.css';

const Navbar = ({ onCartClick }) => {
  const searchPlaceholders = ['Search products...', 'Search by shop...', 'Find your favorite food...'];
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartCount } = useCart();
  const { user, logout } = useAuth();
  const [showAccount, setShowAccount] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const accountWrapperRef = useRef(null);

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

  // Handle click outside account dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountWrapperRef.current && !accountWrapperRef.current.contains(event.target)) {
        setShowAccount(false);
      }
    };

    if (showAccount) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAccount]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % searchPlaceholders.length);
    }, 1800);

    return () => clearInterval(intervalId);
  }, [searchPlaceholders.length]);

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

  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (search.trim()) {
        setShowSearch(false);
        const encodedSearch = encodeURIComponent(search.trim());

        if (location.pathname.startsWith('/restaurant')) {
          navigate(`/restaurant/browse?search=${encodedSearch}`);
          return;
        }

        if (location.pathname.startsWith('/grocery')) {
          navigate(`/grocery/browse?search=${encodedSearch}`);
          return;
        }

        navigate(`/home?search=${encodedSearch}`);
      }
    }
  };

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
        {/* Doorriing logo removed as per request */}

        {/* Location */}
        {user && (
          <div className="navbar-location" onClick={handleLocationClick} title="Manage delivery addresses" style={{ cursor: 'pointer' }}>
            <div className="location-address-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 0 }}>
              <span className="location-address" style={{ display: 'flex', alignItems: 'center', padding: 0 }}>
                {activeAddress?.area || 'Select Location'}
                <span className="account-caret">
                  <img src="/location.webp" alt="Location" className="location-caret-img" style={{ width: '1em', height: '1em', marginLeft: '0.2em', verticalAlign: 'middle' }} />
                </span>
              </span>
            </div>
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
            placeholder={searchPlaceholders[placeholderIndex]}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyPress={handleSearch}
          />
        </div>

        {/* Search - Mobile Icon */}
        <button
          className={`searchbar-icon-btn searchbar-mobile-icon ${showSearch ? 'hidden' : ''}`}
          type="button"
          onClick={() => setShowSearch(true)}
          aria-label="Open search"
        >
          <img src="/search.webp" alt="Search" className="searchbar-icon" loading="lazy" />
        </button>

        {/* Search - Mobile Dropdown */}
        {showSearch && (
          <div className="navbar-searchbar-dropdown">
            <div className="searchbar-dropdown-content">
              <div className="searchbar-input-wrapper">
                <input
                  type="text"
                  className="searchbar-input-dropdown"
                  placeholder={searchPlaceholders[placeholderIndex]}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyPress={handleSearch}
                  autoFocus
                />
                <button
                  className="searchbar-search-btn-inside"
                  type="button"
                  onClick={handleSearch}
                  aria-label="Search"
                >
                  <img src="/search.webp" alt="Search" className="searchbar-inside-icon" loading="lazy" />
                </button>
              </div>
              <button
                className="searchbar-close-btn-dropdown"
                type="button"
                onClick={() => setShowSearch(false)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Account Dropdown - Only show when logged in */}
        {user && (
          <div className="navbar-account-wrapper" ref={accountWrapperRef}>
            <div className="navbar-account" onClick={handleAccountClick} tabIndex={0}>
              <img src="/account.webp" alt="Account" className="account-icon" loading="lazy" />
            </div>
            {showAccount && (
              <div className="account-dropdown">
                <ul>
                  <li><Link to="/home">Home</Link></li>
                  <li><Link to="/orders">My Orders</Link></li>
                  <li><Link to="/address">Address</Link></li>
                  <li><Link to="/profile">Profile</Link></li>
                  <li><Link to="/about">About Us</Link></li>
                  <li><Link to="/settings/delete-account" style={{ color: '#d32f2f' }}>Delete Account</Link></li>
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
//jitu