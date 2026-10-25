import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const [unverifiedEmail, setUnverifiedEmail] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(null);
    setLoading(true);

    try {
      await login({ email: email.toLowerCase().trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED' || (err.message && err.message.toLowerCase().includes('verify your email'))) {
        setUnverifiedEmail(err.email || email.toLowerCase().trim());
        setError('Your email address is not yet verified. Please enter the verification code sent to your email.');
      } else {
        setError(err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
    }}>
      <div className="modal-card" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-gradient)',
            marginBottom: '1rem',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M7 12.5L10.5 16L17 8.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Sign in to manage your tasks securely with TaskFlow Pro
          </p>
        </div>

        {error && (
          <div className="form-error" style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            lineHeight: 1.5,
          }}>
            <div style={{ marginBottom: unverifiedEmail ? '0.75rem' : 0 }}>
              ⚠️ {error}
            </div>
            {unverifiedEmail && (
              <Link
                to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                className="btn btn-primary btn-sm"
                id="link-verify-unverified"
                style={{ width: '100%', textAlign: 'center', display: 'inline-block' }}
              >
                Verify Email Now →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label htmlFor="login-email-input" className="form-label">
              Email Address
            </label>
            <input
              id="login-email-input"
              type="email"
              className="form-control"
              placeholder="name@company.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password-input" className="form-label">
              Password
            </label>
            <input
              id="login-password-input"
              type="password"
              className="form-control"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            id="btn-login-submit"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem',
          textAlign: 'center',
          fontSize: '0.88rem',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '1.25rem'
        }}>
          Don't have an account?{' '}
          <Link to="/register" id="link-to-register" style={{ fontWeight: 600 }}>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
