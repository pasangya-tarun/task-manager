import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const res = await register({ name, email: normalizedEmail, password, confirmPassword });
      sessionStorage.setItem('pending_verification_email', normalizedEmail);
      navigate('/verify-email', {
        replace: true,
        state: {
          email: normalizedEmail,
          message: res.message || 'Please enter the 6-digit code sent to your email to activate your account.',
        },
      });
    } catch (err) {
      setError(err.message || 'Registration failed');
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
      <div className="modal-card" style={{ maxWidth: '480px', width: '100%' }}>
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="7" r="4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="20" y1="8" x2="20" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="23" y1="11" x2="17" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Register your secure profile to start tracking and organizing tasks
          </p>
        </div>

        {error && (
          <div className="form-error" style={{
            marginBottom: '1.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="register-form">
          <div className="form-group">
            <label htmlFor="register-name-input" className="form-label">
              Full Name
            </label>
            <input
              id="register-name-input"
              type="text"
              className="form-control"
              placeholder="e.g. Alex Morgan"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-email-input" className="form-label">
              Email Address
            </label>
            <input
              id="register-email-input"
              type="email"
              className="form-control"
              placeholder="alex@company.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-password-input" className="form-label">
              Password
            </label>
            <input
              id="register-password-input"
              type="password"
              className="form-control"
              placeholder="At least 8 chars, 1 uppercase, 1 number"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-confirm-password-input" className="form-label">
              Confirm Password
            </label>
            <input
              id="register-confirm-password-input"
              type="password"
              className="form-control"
              placeholder="Re-enter password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            id="btn-register-submit"
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.85rem' }}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
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
          Already have an account?{' '}
          <Link to="/login" id="link-to-login" style={{ fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
