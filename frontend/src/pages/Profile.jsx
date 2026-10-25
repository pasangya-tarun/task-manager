import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';

const Profile = () => {
  const { user, updateUserInState } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const response = await userService.updateProfile({ name: name.trim() });
      updateUserInState(response.data);
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>User Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Manage your account information and view your role permissions
        </p>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          marginBottom: '1.5rem',
        }}>
          ✅ {message}
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          marginBottom: '1.5rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      <div className="table-container" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Account Information</h2>

        <form onSubmit={handleSubmit} id="profile-form">
          <div className="form-group">
            <label htmlFor="profile-name-input" className="form-label">
              Full Name (Permitted Update)
            </label>
            <input
              id="profile-name-input"
              type="text"
              className="form-control"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-email-readonly" className="form-label">
              Email Address (Protected Identifier)
            </label>
            <input
              id="profile-email-readonly"
              type="email"
              className="form-control"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <span className="form-label">Assigned Role</span>
              <div style={{ marginTop: '0.4rem' }}>
                <span className={`user-role-badge ${user?.role === 'admin' ? 'role-admin' : 'role-user'}`} id="profile-badge-role">
                  {user?.role}
                </span>
              </div>
            </div>

            <div>
              <span className="form-label">Account Status</span>
              <div style={{ marginTop: '0.4rem' }}>
                <span className={`status-indicator ${user?.isActive ? 'status-active' : 'status-inactive'}`} id="profile-badge-status">
                  <span className="status-dot" />
                  {user?.isActive ? 'Active' : 'Deactivated'}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}>
            🛡️ <strong>Security Notice:</strong> Role assignment, active status, and password hashes are strictly protected by server-side authorization controls and cannot be modified via standard profile updates.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            id="btn-save-profile"
          >
            {loading ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>

      <div className="table-container" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          Account Metadata
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Member since: <strong>{formatDate(user?.createdAt)}</strong>
        </p>
      </div>
    </div>
  );
};

export default Profile;
