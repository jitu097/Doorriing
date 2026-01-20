const Profile = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="profile-page">
      <h1>Profile</h1>
      <p>Welcome, {user.name || 'User'}</p>
    </div>
  );
};

export default Profile;
