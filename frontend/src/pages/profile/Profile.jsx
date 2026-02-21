import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    postalCode: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // Add save functionality here
    console.log('Saving profile:', profileData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data
    setProfileData({
      displayName: user?.displayName || '',
      email: user?.email || '',
      phone: '',
      address: '',
      city: '',
      postalCode: ''
    });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="profile-container">
      <div className="profile-wrapper">
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                {getInitials(profileData.displayName)}
              </div>
            )}
          </div>
          <div className="profile-header-info">
            <h1>{profileData.displayName || 'User Profile'}</h1>
            <p className="profile-email">{profileData.email}</p>
          </div>
          <button 
            className="edit-profile-btn"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h2>Personal Information</h2>
            <div className="profile-grid">
              <div className="profile-field">
                <label>Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="displayName"
                    value={profileData.displayName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p>{profileData.displayName || 'Not provided'}</p>
                )}
              </div>

              <div className="profile-field">
                <label>Email Address</label>
                <p>{profileData.email}</p>
              </div>

              <div className="profile-field">
                <label>Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p>{profileData.phone || 'Not provided'}</p>
                )}
              </div>

              <div className="profile-field">
                <label>User ID</label>
                <p className="user-id">{user?.uid || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2>Address Information</h2>
            <div className="profile-grid">
              <div className="profile-field full-width">
                <label>Street Address</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="address"
                    value={profileData.address}
                    onChange={handleInputChange}
                    placeholder="Enter your street address"
                  />
                ) : (
                  <p>{profileData.address || 'Not provided'}</p>
                )}
              </div>

              <div className="profile-field">
                <label>City</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="city"
                    value={profileData.city}
                    onChange={handleInputChange}
                    placeholder="Enter your city"
                  />
                ) : (
                  <p>{profileData.city || 'Not provided'}</p>
                )}
              </div>

              <div className="profile-field">
                <label>Postal Code</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="postalCode"
                    value={profileData.postalCode}
                    onChange={handleInputChange}
                    placeholder="Enter postal code"
                  />
                ) : (
                  <p>{profileData.postalCode || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="profile-actions">
              <button className="save-btn" onClick={handleSave}>
                Save Changes
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="profile-stats">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <h3>0</h3>
              <p>Total Orders</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-info">
              <h3>0</h3>
              <p>Reviews</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❤️</div>
            <div className="stat-info">
              <h3>0</h3>
              <p>Favorites</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
