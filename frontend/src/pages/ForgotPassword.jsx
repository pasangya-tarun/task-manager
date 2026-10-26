import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const validateEmail = (val) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(val).toLowerCase().trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before submitting another request.`);
      return;
    }

    setLoading(true);

    try {
      const response = await authService.forgotPassword({ email: trimmedEmail });
      // Always show generic success response to prevent account enumeration
      setSuccessMessage(
        response?.message ||
          'If an account exists for this email address, you will receive instructions to reset your password.'
      );
      setCooldown(60); // 60s request cooldown
    } catch (err) {
      // In case of operational or network error
      setError(
        err.message || 'Unable to process your request at this time. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

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
              background: 'var(--primary-gradient)',
              marginBottom: '1rem',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M16 10V7a4 4 0 00-8 0v3m-2 0h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>Forgot Password</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Enter your email address and we'll send you secure instructions to reset your password.
          </p>
        </div>

        {error && (
          <div
            className="form-error"
            id="forgot-password-error"
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
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div
            id="forgot-password-success"
            style={{
              marginBottom: '1.5rem',
              padding: '1rem 1.15rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#6ee7b7',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.15rem' }}>✓</span>
              <div>
                <strong>Check your inbox:</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#a7f3d0' }}>
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} id="forgot-password-form">
          <div className="form-group">
            <label htmlFor="forgot-email-input" className="form-label">
              Email Address
            </label>
            <input
              id="forgot-email-input"
              type="email"
              className="form-control"
              placeholder="name@company.com"
              autoComplete="email"
              required
              disabled={loading || cooldown > 0}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="btn btn-primary"
            id="btn-forgot-submit"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }}
          >
            {loading
              ? 'Sending Instructions...'
              : cooldown > 0
              ? `Resend Available in ${cooldown}s`
              : 'Send Reset Link'}
          </button>
        </form>

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
          Remember your password?{' '}
          <Link to="/login" id="link-return-to-login" style={{ fontWeight: 600 }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
