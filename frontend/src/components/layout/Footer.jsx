const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-main-row">
        <div className="footer-copyright">
          &copy; Doorriing Technologies Pvt. Ltd., 2026
        </div>
        <div className="footer-download-app">
          <span className="footer-download-label">Download App</span>
          <a href="#" className="footer-app-btn appstore" style={{padding: 0, background: 'none'}}>
            <img src="/play.png" alt="Play Store" style={{height: '38px', width: 'auto', display: 'block'}} />
          </a>
          <a href="#" className="footer-app-btn playstore" style={{padding: 0, background: 'none'}}>
            <img src="/apple.png" alt="App Store" style={{height: '38px', width: 'auto', display: 'block'}} />
          </a>
        </div>
        <div className="footer-socials">
          <a href="#" className="footer-social-icon"><img src="/F.png" alt="Facebook" style={{height: '36px', width: '36px', borderRadius: '50%'}} /></a>
          <a href="#" className="footer-social-icon"><img src="/i.png" alt="Instagram" style={{height: '36px', width: '36px', borderRadius: '50%'}} /></a>
          <a href="#" className="footer-social-icon"><img src="/L.png" alt="LinkedIn" style={{height: '36px', width: '36px', borderRadius: '50%'}} /></a>
        </div>
      </div>
      <div className="footer-disclaimer">
        “Doorriing” is owned & managed by "Doorriing Technologies Pvt. Ltd." and is not related, linked or interconnected in whatsoever manner or nature, to any other business or entity.
      </div>
    </footer>
  );
};

export default Footer;
