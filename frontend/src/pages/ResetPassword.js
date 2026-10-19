import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const tooShort = password && password.length < 8;
  const mismatch = confirm && confirm !== password;
  const canSubmit = password.length >= 8 && confirm === password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await API.post('/auth/password/reset', { token, new_password: password });
      // Every session was signed out server-side, so drop any stale local token too
      localStorage.removeItem('token');
      setDone(true);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not reset password'));
    } finally {
      setLoading(false);
    }
  };

  const errorStyle = { fontSize: 12, color: 'var(--rust)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 };

  return (
    <div className="auth-right" style={{ minHeight: '100vh' }}>
      <div className="auth-form-box">
        {done ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2>Password updated</h2>
            <p style={{ marginBottom: 28 }}>You've been signed out everywhere. Sign in with your new password.</p>
            {/* Full reload so AuthContext forgets any user loaded from the old token */}
            <a href="/login" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
              Sign In →
            </a>
          </>
        ) : (
          <>
            <h2>Choose a new password</h2>
            <p style={{ marginBottom: 28 }}>Make it at least 8 characters.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    autoFocus
                    style={{ paddingRight: 44, borderColor: tooShort ? 'var(--rust)' : undefined }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 16, color: 'rgba(13,13,13,0.35)', padding: 4,
                    }}
                    title={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
                {tooShort && <div style={errorStyle}><span>⚠</span> Password must be at least 8 characters</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{ borderColor: mismatch ? 'var(--rust)' : undefined }}
                  required
                />
                {mismatch && <div style={errorStyle}><span>⚠</span> Passwords don't match</div>}
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', opacity: canSubmit ? 1 : 0.6 }}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Reset Password →'}
              </button>
            </form>
            <div className="divider" />
            <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(13,13,13,0.5)' }}>
              Link expired?{' '}
              <Link to="/forgot-password" style={{ color: 'var(--sage)', fontWeight: 600, textDecoration: 'none' }}>
                Request a new one →
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
