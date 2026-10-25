import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve email from location.state, search params, or sessionStorage (for page refresh persistence)
  const initialEmail =
    location.state?.email ||
    new URLSearchParams(location.search).get('email') ||
    sessionStorage.getItem('pending_verification_email') ||
    '';

  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(location.state?.message || null);
  const [cooldown, setCooldown] = useState(60); // 60s cooldown consistent with server
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);

  const inputRefs = useRef([]);

  // Auto-focus first input on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Sync email to sessionStorage for persistence across page refreshes
  useEffect(() => {
    if (email) {
      sessionStorage.setItem('pending_verification_email', email.trim().toLowerCase());
    }
  }, [email]);

  // Resend cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index, value) => {
    // Only allow single digit
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...digits];

    if (cleaned.length > 1) {
      // Handle paste in single box
      const pastedChars = cleaned.slice(0, 6).split('');
      pastedChars.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(pastedChars.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = cleaned;
    setDigits(newDigits);

    // Auto-advance to next input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...digits];
    pasteData.split('').forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setDigits(newDigits);

    const nextFocusIndex = Math.min(pasteData.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const fullOtp = digits.join('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Please provide your registered email address.');
      setIsEditingEmail(true);
      return;
    }

    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.verifyEmail({
        email: targetEmail,
        otp: fullOtp,
      });

      // Clear pending verification state from non-sensitive storage
      sessionStorage.removeItem('pending_verification_email');

      setSuccess(response.message || 'Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Email verified successfully! You can now log in.' },
        });
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to verify code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resendLoading) return;

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Please provide an email address to resend the code.');
      setIsEditingEmail(true);
      return;
    }

    setError(null);
    setResendLoading(true);

    try {
      const response = await authService.resendOtp({ email: targetEmail });
      setSuccess(response.message || 'A new verification code has been dispatched to your email.');
      setCooldown(60); // Reset client cooldown to match server's 60s
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (err.remainingSeconds) {
        setCooldown(err.remainingSeconds);
      }
      setError(err.message || 'Failed to resend verification code. Please try again later.');
    } finally {
      setResendLoading(false);
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="22,6 12,13 2,6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Verify Your Email</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            We sent a 6-digit confirmation code to:
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.35rem',
            background: 'rgba(255,255,255,0.05)',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
          }}>
            <strong style={{ color: '#818cf8', fontSize: '0.92rem' }}>{email || 'No email specified'}</strong>
            <button
              type="button"
              onClick={() => setIsEditingEmail(!isEditingEmail)}
              style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.78rem', textDecoration: 'underline' }}
            >
              {isEditingEmail ? 'Done' : 'Change'}
            </button>
          </div>
        </div>

        {isEditingEmail && (
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="verify-email-input" className="form-label">
              Verification Email Address
            </label>
            <input
              id="verify-email-input"
              type="email"
              className="form-control"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}

        {success && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            fontSize: '0.9rem',
          }}>
            ✅ {success}
          </div>
        )}

        {error && (
          <div className="form-error" style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '0.9rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleVerify} id="verify-email-form">
          <div className="form-group" style={{ textAlign: 'center' }}>
            <label htmlFor="otp-digit-0" className="form-label" style={{ marginBottom: '0.75rem' }}>
              Enter 6-Digit Verification Code
            </label>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                margin: '0.5rem 0 1.5rem',
              }}
              onPaste={handlePaste}
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-digit-${index}`}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  aria-label={`Digit ${index + 1}`}
                  style={{
                    width: '46px',
                    height: '56px',
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    background: 'var(--bg-input)',
                    border: digit ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'all 150ms ease',
                    boxShadow: digit ? '0 0 10px rgba(99, 102, 241, 0.25)' : 'none',
                  }}
                />
              ))}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              ⏱️ The verification code is valid for <strong>10 minutes</strong>.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || fullOtp.length !== 6}
            className="btn btn-primary"
            id="btn-submit-verify"
            style={{ width: '100%', padding: '0.85rem' }}
          >
            {loading ? 'Verifying Code...' : 'Verify Email & Activate'}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '1.25rem'
        }}>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resendLoading}
            className="btn btn-secondary btn-sm"
            id="btn-resend-otp"
            style={{ minWidth: '180px' }}
          >
            {resendLoading
              ? 'Sending Code...'
              : cooldown > 0
              ? `Resend Code in ${cooldown}s`
              : 'Resend Verification Code'}
          </button>

          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Already verified?{' '}
            <Link to="/login" id="link-back-to-login" style={{ fontWeight: 600 }}>
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
