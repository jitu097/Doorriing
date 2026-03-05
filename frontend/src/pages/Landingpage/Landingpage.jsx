import { useNavigate } from 'react-router-dom';
import './Landingpage.css';

const Landingpage = () => {
  const navigate = useNavigate();

  const handleExplore = () => {
    // Allow users to browse without authentication
    navigate('/home');
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="landing-content">
          <div className="landing-text">
            <div className="landing-title">
            </div>
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