import { Link } from 'react-router-dom';
import { COMPANY_DETAILS, COMPANY_MANAGED_NOTE } from '../../config/companyInfo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-punchline-desktop">
        <div className="footer-punchline-main">Shop Local</div>
        <div className="footer-punchline-sub">Doorriing Delivers <span role="img" aria-label="heart">❤️</span></div>
        <div className="footer-punchline-brand">DOORRIING</div>
      </div>
      <div className="footer-topline">© {currentYear} Doorriing. All rights reserved.</div>
      <div className="footer-main-row">
        <div className="footer-download-app">
          <span className="footer-download-label">Download App</span>
          <a href="#" className="footer-app-btn appstore" style={{ padding: 0, background: 'none' }}>
            <img src="/play.webp" alt="Play Store" style={{ height: '38px', width: 'auto', display: 'block' }} loading="lazy" />
          </a>
          <a href="#" className="footer-app-btn playstore" style={{ padding: 0, background: 'none' }}>
            <img src="/apple.webp" alt="App Store" style={{ height: '38px', width: 'auto', display: 'block' }} loading="lazy" />
          </a>
        </div>
        <div className="footer-socials">
          <a href="#" className="footer-social-icon"><img src="/F.webp" alt="Facebook" style={{ height: '36px', width: '36px', borderRadius: '50%' }} loading="lazy" /></a>
          <a href="#" className="footer-social-icon"><img src="/i.webp" alt="Instagram" style={{ height: '36px', width: '36px', borderRadius: '50%' }} loading="lazy" /></a>
          <a href="#" className="footer-social-icon"><img src="/L.webp" alt="LinkedIn" style={{ height: '36px', width: '36px', borderRadius: '50%' }} loading="lazy" /></a>
        </div>
      </div>
      <div className="footer-disclaimer">
        {COMPANY_DETAILS.name} {COMPANY_MANAGED_NOTE} — Registered Office: {COMPANY_DETAILS.addressLine1}, {COMPANY_DETAILS.addressLine2}, {COMPANY_DETAILS.country}.
      </div>
      <div className="footer-links">
        <span className="footer-links-title">Company</span>
        <nav className="footer-links-list">
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact Us</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/refund-policy">Refund / Cancellation</Link>
          <Link to="/settings/delete-account" style={{ color: '#d32f2f' }}>Delete Account</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
