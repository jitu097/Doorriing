
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import api from '../../services/api';
import './DeleteAccount.css';

const DeleteAccount = () => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleDelete = async (e) => {
    e.preventDefault();
    if (confirmText !== 'DELETE') return;

    setLoading(true);
    setError(null);

    try {
      // 1. Call backend to delete data and Firebase user (via Admin SDK)
      await api.delete('/auth/account');

      // 2. Clear local Firebase session
      await auth.signOut();

      // 3. Clear any local storage
      localStorage.clear();
      sessionStorage.clear();

      // 4. Redirect with success
      alert('Your account has been permanently deleted.');
      window.location.href = '/';
    } catch (err) {
      console.error('Account deletion failed:', err);
      setError(err.message || 'Failed to delete account. Please try again later.');
      setLoading(false);
    }
  };

  return (
    <div className="delete-account-page">
      <div className="delete-account-container">
        <h1>Delete Account</h1>
        <p className="warning-text">
          <strong>Warning:</strong> This action is irreversible. All your orders, 
          addresses, and personal information will be permanently removed.
        </p>

        <form onSubmit={handleDelete} className="delete-confirm-form">
          <label htmlFor="confirm">
            To confirm, please type <strong>DELETE</strong> in the box below:
          </label>
          <input
            id="confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE here"
            disabled={loading}
            autoComplete="off"
          />

          {error && <div className="error-msg">{error}</div>}

          <div className="action-buttons">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/profile')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="confirm-delete-btn"
              disabled={loading || confirmText !== 'DELETE'}
            >
              {loading ? 'Deleting...' : 'Permanently Delete My Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccount;
