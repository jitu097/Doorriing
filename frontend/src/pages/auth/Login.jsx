import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { loginWithEmail, loginWithGoogle } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setServerError('');

    try {
      await loginWithEmail(formData.email, formData.password);
      navigate('/home');
    } catch (error) {
      console.error("Login error:", error);
      let msg = "Failed to login.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = "Invalid email or password.";
      } else if (error.code === 'auth/too-many-requests') {
        msg = "Too many failed attempts. Please try again later.";
      }
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setServerError('');
    try {
      await loginWithGoogle();
      navigate('/home');
    } catch (error) {
      console.error("Google login error:", error);
      setServerError("Failed to login with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left Side - Image (Desktop Only) */}
        <div className="login-image-section">
          <div className="login-image-content">
            <h2>Welcome to BazarSe</h2>
            <p>Your one-stop destination for local shopping.</p>
          </div>
          <img src="/formimage.png" alt="Shopping" className="login-side-image" />
        </div>

        {/* Right Side - Form */}
        <div className="login-card">
          <div className="login-header">
            <h1>Welcome Back</h1>
            <p>Login to your BazarSe account</p>
          </div>

          {serverError && <div className="error-message" style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>{serverError}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="Enter your email"
                disabled={loading}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="Enter your password"
                disabled={loading}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <button
              type="button"
              className="google-login-button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px', height: '20px' }} />
              Sign in with Google
            </button>
          </form>

          <div className="login-footer">
            <p>
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
