import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    setLoading(true);
    try {
      await API.post('/auth/password/forgot', { email });
      setSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not send reset email'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-right" style={{ minHeight: '100vh' }}>
      <div className="auth-form-box">
        {sent ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <h1>Check your inbox</h1>
            <p style={{ marginBottom: 28 }}>
              If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
              It expires in 1 hour. Don't forget to check your spam folder.
            </p>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <h1>Forgot your password?</h1>
            <p style={{ marginBottom: 28 }}>Enter your email and we'll send you a link to choose a new one.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', opacity: isValidEmail(email) ? 1 : 0.6 }}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link →'}
              </button>
            </form>
            <div className="divider" />
            <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(13,13,13,0.5)' }}>
              Remembered it?{' '}
              <Link to="/login" style={{ color: 'var(--sage)', fontWeight: 600, textDecoration: 'none' }}>
                Sign in →
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
