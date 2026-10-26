import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import authService from '../services/authService';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();

  // Capture token in React memory ONLY; never persist to localStorage or sessionStorage
  const [token, setToken] = useState(() => searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Clear token from visible URL query string after capturing in memory
  useEffect(() => {
    if (searchParams.get('token')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  // Password policy check
  const passwordCriteria = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'At least one number (0-9)', met: /\d/.test(password) },
  ];

  const isPasswordValid = passwordCriteria.every((c) => c.met);
  const doPasswordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Password reset link is invalid or missing. Please request a new link.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please ensure your new password satisfies all security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your confirmation password.');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword({
        token,
        password,
        confirmPassword,
      });

      setSuccess(true);
      // Clear token and password state in memory
      setToken('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(
        err.message || 'Password reset link is invalid or has expired. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  // If no token was found and reset has not succeeded
  if (!token && !success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        <div className="modal-card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              marginBottom: '1rem',
            }}
          >
            <span style={{ fontSize: '1.75rem', color: '#f87171' }}>⚠️</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Invalid Reset Link</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            This password reset link is invalid, incomplete, or has expired. For your security, reset links are single-use and expire in 15 minutes.
          </p>
          <Link
            to="/forgot-password"
            className="btn btn-primary"
            id="btn-request-new-link"
            style={{ width: '100%', display: 'inline-block', padding: '0.85rem' }}
          >
            Request a New Reset Link
          </Link>
          <div style={{ marginTop: '1.25rem' }}>
            <Link to="/login" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              ← Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}
    >
      <div className="modal-card" style={{ maxWidth: '460px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-md)',
              background: success ? 'rgba(16, 185, 129, 0.2)' : 'var(--primary-gradient)',
              border: success ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
              marginBottom: '1rem',
              boxShadow: success ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            {success ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>
            {success ? 'Password Reset Complete' : 'Set New Password'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {success
              ? 'Your password has been successfully updated. You can now sign in using your new credentials.'
              : 'Choose a strong, unique password to secure your TaskFlow Pro account.'}
          </p>
        </div>

        {error && (
          <div
            className="form-error"
            id="reset-password-error"
            style={{
              marginBottom: '1.5rem',
              padding: '0.85rem 1rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <div>⚠️ {error}</div>
            <div style={{ marginTop: '0.6rem' }}>
              <Link
                to="/forgot-password"
                style={{ color: '#93c5fd', fontSize: '0.82rem', fontWeight: 600 }}
              >
                Request a fresh reset link →
              </Link>
            </div>
          </div>
        )}

        {success ? (
          <div>
            <div
              id="reset-password-success-box"
              style={{
                marginBottom: '1.75rem',
                padding: '1rem',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#6ee7b7',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
            >
              ✓ Password updated successfully. For security reasons, you must log in with your new password.
            </div>

            <Link
              to="/login"
              className="btn btn-primary"
              id="btn-goto-login"
              style={{ width: '100%', display: 'inline-block', textAlign: 'center', padding: '0.85rem' }}
            >
              Sign In with New Password
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} id="reset-password-form">
            <div className="form-group">
              <label htmlFor="reset-new-password" className="form-label">
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '1rem',
                    padding: 0,
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reset-confirm-password" className="form-label">
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '1rem',
                    padding: 0,
                  }}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Password Security Criteria checklist */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 0.85rem',
                marginBottom: '1.25rem',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Password Requirements:
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {passwordCriteria.map((c, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: c.met ? '#34d399' : 'var(--text-secondary)',
                      marginBottom: '0.2rem',
                    }}
                  >
                    <span>{c.met ? '✓' : '•'}</span>
                    <span>{c.label}</span>
                  </li>
                ))}
                {confirmPassword && (
                  <li
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: doPasswordsMatch ? '#34d399' : '#f87171',
                      marginTop: '0.3rem',
                      paddingTop: '0.3rem',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span>{doPasswordsMatch ? '✓' : '✗'}</span>
                    <span>{doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                  </li>
                )}
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid || !doPasswordsMatch}
              className="btn btn-primary"
              id="btn-reset-password-submit"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: '1.75rem',
            textAlign: 'center',
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.25rem',
          }}
        >
          <Link to="/login" id="link-reset-to-login" style={{ fontWeight: 600 }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
