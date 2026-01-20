
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import Modal from '../common/Modal';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [showAccount, setShowAccount] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [address, setAddress] = useState({
    type: 'Home',
    building: '',
    floor: '',
    area: '',
    landmark: '',
    name: user.name || '',
    phone: user.phone || ''
  });
  const [search, setSearch] = useState('');
  // TODO: Replace with real cart count and total
  const cartCount = 3;
  const cartTotal = 737;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleAccountClick = () => setShowAccount((v) => !v);
  const handleLocationClick = () => setShowLocation(true);
  const handleLocationClose = () => setShowLocation(false);
  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo">
          <span className="logo-blink">blink</span><span className="logo-it">it</span>
        </div>

        {/* Location */}
        <div className="navbar-location" onClick={handleLocationClick}>
          <div className="location-title">Delivery in 10 minutes</div>
          <div className="location-address">{address.area || 'Enter your address'}</div>
        </div>

        {/* Search */}
        <form className="navbar-searchbar" onSubmit={e => e.preventDefault()}>
          <input
            type="text"
            className="searchbar-input"
            placeholder="Search food..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="searchbar-btn" type="submit">
            <span className="searchbar-icon">🔍</span>
          </button>
        </form>

        {/* Account Dropdown */}
        <div className="navbar-account-wrapper">
          <div className="navbar-account" onClick={handleAccountClick} tabIndex={0}>
            Account <span className="account-caret">▼</span>
          </div>
          {showAccount && (
            <div className="account-dropdown">
              <div className="account-info">
                <div className="account-phone">{user.phone || '6205315518'}</div>
              </div>
              <ul>
                <li><Link to="/orders">My Orders</Link></li>
                <li><span>Saved Addresses</span></li>
                <li><span>My Prescriptions</span></li>
                <li><span>E-Gift Cards</span></li>
                <li><span>FAQ's</span></li>
                <li><span>Account Privacy</span></li>
                <li><button onClick={handleLogout} className="logout-btn">Log Out</button></li>
              </ul>
            </div>
          )}
        </div>

        {/* Cart Icon */}
        <Link to="/cart" className="navbar-cart-ui">
          <span className="cart-svg">
            {/* Bag icon SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="7" width="14" height="12" rx="3"/>
              <path d="M9 7V6a3 3 0 0 1 6 0v1"/>
            </svg>
          </span>
          <span className="cart-ui-label">Cart</span>
          <span className="cart-ui-badge">{cartCount}</span>
        </Link>
      </div>

      {/* Location Modal */}
      <Modal isOpen={showLocation} onClose={handleLocationClose}>
        <div className="location-modal">
          <h3>Enter complete address</h3>
          <div className="address-types">
            {['Home', 'Work', 'Hotel', 'Other'].map(type => (
              <button
                key={type}
                className={address.type === type ? 'active' : ''}
                onClick={() => setAddress({ ...address, type })}
                type="button"
              >
                {type}
              </button>
            ))}
          </div>
          <form className="address-form">
            <input name="building" placeholder="Flat / House no / Building name *" value={address.building} onChange={handleAddressChange} required />
            <input name="floor" placeholder="Floor (optional)" value={address.floor} onChange={handleAddressChange} />
            <input name="area" placeholder="Area / Sector / Locality *" value={address.area} onChange={handleAddressChange} required />
            <input name="landmark" placeholder="Nearby landmark (optional)" value={address.landmark} onChange={handleAddressChange} />
            <input name="name" placeholder="Your name *" value={address.name} onChange={handleAddressChange} required />
            <input name="phone" placeholder="Your phone number (optional)" value={address.phone} onChange={handleAddressChange} />
            <button type="submit" className="address-save-btn">Save</button>
          </form>
        </div>
      </Modal>
    </nav>
  );
};

export default Navbar;
