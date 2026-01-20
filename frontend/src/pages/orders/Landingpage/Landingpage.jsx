import { useNavigate } from 'react-router-dom';
import './Landingpage.css';

const Landingpage = () => {
  const navigate = useNavigate();

  const handleExplore = () => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/shops');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="landing-content">
          <div className="landing-text">
            <div className="landing-title">
              <img src="/fresh.png.png" alt="Fresh" className="title-fresh-img" />
              <img src="/small.png" alt="Small Badge" className="title-small-img" />
            </div>
            <p className="landing-description">
              Save time and energy.<br />
              Shop from your local shops and restaurants and get fast<br />
              delivery to your home.
            </p>
            <div className="landing-btn-group">
              <button className="explore-btn" onClick={handleExplore}>
                Explore Now
              </button>
              <button className="signup-btn" onClick={() => navigate('/signup')}>
                Signup
              </button>
              <button className="signin-btn" onClick={() => navigate('/login')}>
                Signin
              </button>
            </div>
            <img src="/Arrow.png" alt="Arrow" className="arrow-decoration" />
          </div>
          
          <div className="landing-image">
            <img src="/large.png" alt="Large Badge" className="large-image-above" />
            <img src="/landing.png" alt="Food Delivery" className="main-image" />
            {/* Mobile view: buttons above, image covers whole view */}
            <div className="mobile-image-btns">
              <div className="mobile-signin-top">
                <button className="signin-btn" onClick={() => navigate('/login')}>
                  Signin
                </button>
              </div>
              <img src="/mobile.png" alt="Mobile View" className="mobile-image-full" />
              <div className="mobile-btn-group">
                <button className="signup-btn" onClick={() => navigate('/signup')}>
                  Signup
                </button>
              </div>
              <div className="mobile-explore-bottom">
                <button className="explore-btn" onClick={handleExplore}>
                  Explore Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landingpage;