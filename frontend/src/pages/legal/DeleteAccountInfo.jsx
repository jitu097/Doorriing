import React from 'react';
import './DeleteAccountInfo.css';

const DeleteAccountInfo = () => {
  return (
    <div className="delete-info-page">
      <div className="delete-info-container">
        <h1>Delete Your Doorriing Account</h1>
        
        <section className="info-section">
          <h2>How to Delete Your Account</h2>
          <p>You can delete your account directly through the Doorriing mobile app or website:</p>
          <ol className="steps-list">
            <li>Open the <strong>Doorriing</strong> app or visit the website.</li>
            <li>Go to your <strong>Profile</strong> or <strong>Settings</strong> section.</li>
            <li>Select the <strong>Delete Account</strong> option at the bottom.</li>
            <li>Follow the on-screen instructions and confirm by typing "DELETE".</li>
          </ol>
        </section>

        <section className="info-section">
          <h2>What Happens to Your Data?</h2>
          <p>When you delete your account:</p>
          <ul className="info-list">
            <li>Your profile information (name, email, phone) will be permanently removed.</li>
            <li>Your saved addresses and payment methods will be deleted.</li>
            <li>Your order history and notifications will be purged.</li>
            <li>This action is <strong>irreversible</strong> and cannot be undone.</li>
          </ul>
        </section>

        <section className="info-section">
          <h2>Need Help?</h2>
          <p>
            If you are unable to access your account or need assistance with deletion, 
            please contact our support team:
          </p>
          <div className="support-box">
            <p><strong>Email:</strong> <a href="mailto:support@doorriing.com">support@doorriing.com</a></p>
            <p><strong>Timeline:</strong> Account deletion requests are typically processed within 24–48 hours.</p>
          </div>
        </section>
        
        <div className="footer-note">
          <p>© {new Date().getFullYear()} Doorriing. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountInfo;
