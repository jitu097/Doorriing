import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { useAddress } from '../../context/AddressContext';
import { useAppAvailability } from '../../context/AppAvailabilityContext';

import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuth();
  const { activeAddress } = useAddress();
  const { isOpen: appIsOpen, isLoading: appAvailabilityLoading, reason: appReason, blockedBy } = useAppAvailability();

  const accountRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const [search, setSearch] = useState('');
  const [showAccount, setShowAccount] =
    useState(false);

  const [scrolled, setScrolled] =
    useState(false);

  const placeholders = useMemo(
    () => [
      'Search groceries...',
      'Search restaurants...',
      'Search snacks...',
      'Search cold drinks...',
    ],
    []
  );

  const [placeholderIndex, setPlaceholderIndex] =
    useState(0);

  const isRestaurantPage = location.pathname.startsWith('/restaurant');
  const isGroceryPage = location.pathname.startsWith('/grocery');
  const isAddressPage = location.pathname.startsWith('/address');
  const isOrdersPage = location.pathname.startsWith('/orders');
  const isTrackPage = location.pathname.startsWith('/track');
  const isCheckoutPage = location.pathname.startsWith('/checkout');
  const isOrderConfirmationPage = location.pathname.startsWith('/order-confirmation');
  const isBrowsePage = isRestaurantPage || isGroceryPage || isAddressPage || isOrdersPage || isTrackPage || isCheckoutPage || isOrderConfirmationPage;
  const freezeNavbar = isBrowsePage;
  const isHomePage = location.pathname === '/' || location.pathname === '/home';
  const showUnavailableBanner = isHomePage && !appAvailabilityLoading && !appIsOpen;
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // SCROLL EFFECT

useEffect(() => {
  const handleScroll = () => {
    const scrollTop =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    
    setScrolled(scrollTop > 50);
  };

  document.addEventListener(
    "scroll",
    handleScroll,
    true
  );

  return () => {
    document.removeEventListener(
      "scroll",
      handleScroll,
      true
    );
  };
}, []);
  // PLACEHOLDER ROTATION

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) =>
        prev === placeholders.length - 1
          ? 0
          : prev + 1
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [placeholders.length]);

  // OUTSIDE CLICK

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        console.debug('[Navbar] outside click detected, target:', e.target);
        setShowAccount(false);
      }

      if (
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(e.target) &&
        !e.target.closest('.page-search-btn')
      ) {
        setMobileSearchOpen(false);
      }
    };

    // Listen for both mouse and touch so mobile taps are detected
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  // SEARCH

  const handleSearch = (e) => {
    if (
      e.key === 'Enter' ||
      e.type === 'click'
    ) {
      if (!search.trim()) return;

      const encoded = encodeURIComponent(
        search.trim()
      );

      if (
        location.pathname.startsWith(
          '/restaurant'
        )
      ) {
        navigate(
          `/restaurant/browse?search=${encoded}`
        );
        return;
      }

      if (
        location.pathname.startsWith(
          '/grocery'
        )
      ) {
        navigate(
          `/grocery/browse?search=${encoded}`
        );
        return;
      }

      navigate(`/home?search=${encoded}`);
      // close mobile search after performing search on mobile restaurant page
      if (mobileSearchOpen) setMobileSearchOpen(false);
    }
  };

  const MobileQuickIcons = ({ onClick }) => {
    const icons = [
      { id: 'all', src: '/ek.webp', alt: 'All', label: 'All' },
      { id: 'mart', src: '/tin.webp', alt: 'Mart', label: 'Kirana' },
      { id: 'food', src: '/do.webp', alt: 'Food', label: 'Food' },
      { id: 'beauty-essential', src: '/pach.webp', alt: 'Beauty Essential', label: 'Electronics' },
      { id: 'pharmacy', src: '/char.webp', alt: 'Pharmacy', label: 'Pharmacy' },
    ];

    return (
      <div className="mobile-quick-icons" role="list">
        {icons.map((icon) => (
          <button key={icon.id} type="button" className="mobile-quick-icon" onClick={() => onClick?.(icon.id)} aria-label={icon.label} title={icon.label}>
            <img src={icon.src} alt={icon.alt} />
            <span className="mobile-quick-icon-label">{icon.label}</span>
          </button>
        ))}
      </div>
    );
  };

  const handleQuickIconClick = (id) => {
    try {
      const tab =
        id === 'all' ? 'all' :
        id === 'food' ? 'food' :
        id === 'mart' ? 'mart' :
        id === 'beauty-essential' ? 'beauty-essential' :
        id === 'pharmacy' ? 'pharmacy' :
        null;

      if (!tab) return;

      const nextUrl = tab === 'all'
        ? '/home'
        : `/home?tab=${tab}`;

      navigate(nextUrl);
    } catch (e) {
      // ignore navigation issues
    }
  };

  // LOGOUT

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {Quick

      console.error(error);
    }
  };

  return (
    <nav
      className={`navbar ${
        !freezeNavbar && scrolled
          ? 'navbar-scrolled'
          : 'navbar-top'
      }`}
    >
        <div
  className={`navbar-container ${
    !freezeNavbar && scrolled ? "navbar-container-hidden" : ""
  }`}
>
  

        {/* LEFT */}

        <div className="navbar-left">

          <div
            className="navbar-location"
            onClick={() =>
              navigate('/address')
            }
          >
            <span className="location-label">
              Deliver to
            </span>

            <div className="location-main">
              {activeAddress?.area ||
                'Select Location'}

              <span className="location-arrow">
                ▼
              </span>
            </div>

          </div>

        </div>

        {/* CENTER */}

        <div className="navbar-search">

          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
              stroke="currentColor"
              strokeWidth="2"
            />

            <path
              d="m21 21-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>

          <input
            type="text"
            placeholder={
              placeholders[placeholderIndex]
            }
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            onKeyDown={handleSearch}
          />

          <button
            className="search-btn"
            onClick={handleSearch}
          >
            Search
          </button>

        </div>
        
         

        {/* RIGHT */}

        <div className="navbar-right">

          {/* ACCOUNT */}

          {isBrowsePage && (
                <button
                  className="page-search-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileSearchOpen((s) => !s);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <img src="/search.webp" alt="search" />
                </button>
              )}

          {user ? (
            <div
              className="account-wrapper"
              ref={accountRef}
            >
              <button
                className="account-btn"
                onClick={() => {
                  console.debug('[Navbar] account-btn clicked. showAccount before:', showAccount);
                  setShowAccount(!showAccount);
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <img
                  src="/account.webp"
                  alt="account"
                />
              </button>

              {showAccount && (
                <div className="account-dropdown">

                  <Link to="/orders">
                    Orders
                  </Link>

                  <Link to="/profile">
                    Profile
                  </Link>

                  <Link to="/address">
                    Address
                  </Link>

                  <Link to="/contact">
                    Contact Us
                  </Link>

                  <button
                    className="logout-btn"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>

                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="login-btn"
            >
              Login
            </Link>
          )}
        </div>

      </div>

      {showUnavailableBanner && (
        <div className="navbar-unavailability-banner" role="alert">
          <span className="navbar-unavailability-icon">
            {blockedBy === 'time_window' ? '🕐' : '🔒'}
          </span>
          <div className="navbar-unavailability-text">
            <strong className="navbar-unavailability-title">
              {blockedBy === 'time_window'
                ? 'Outside Delivery Hours'
                : 'Currently Unavailable for Orders'}
            </strong>
            <span className="navbar-unavailability-sub">
              {appReason || 'We are currently not accepting orders. You can still browse available shops.'}
            </span>
          </div>
        </div>
      )}

        {/* MOBILE SEARCH */}

      {(!isBrowsePage || mobileSearchOpen) && (
        <div className={`mobile-search-wrapper ${mobileSearchOpen ? 'expanded' : ''}`} ref={mobileSearchRef}>

          <div className="mobile-search">

            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
                stroke="currentColor"
                strokeWidth="2"
              />

              <path
                d="m21 21-4.35-4.35"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>

            <input
              type="text"
              placeholder={
                placeholders[placeholderIndex]
              }
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              onKeyDown={handleSearch}
            />

          </div>

                {/* MOBILE QUICK ICONS (under navbar container) */}
                {!isBrowsePage && <MobileQuickIcons onClick={handleQuickIconClick} />}

        </div>
      )}
    </nav>
  );
};

export default Navbar;