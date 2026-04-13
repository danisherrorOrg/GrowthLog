import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DIMENSIONS = [
  { icon: '🧠', title: 'Mind', desc: 'Intellectual growth, learning, and mental clarity.', color: 'var(--sage)' },
  { icon: '💪', title: 'Body', desc: 'Physical health, energy levels, and vital habits.', color: 'var(--rust)' },
  { icon: '💼', title: 'Career', desc: 'Professional wins, productivity, and financial health.', color: '#8b6bc4' },
  { icon: '🤝', title: 'Social', desc: 'Deepening connections and finding community.', color: 'var(--gold)' },
  { icon: '✨', title: 'Soul', desc: 'Spirituality, peace, and internal alignment.', color: '#c4623a' },
];

const STATS = [
  { value: '365', label: 'days of insight per year' },
  { value: '5', label: 'life categories by default' },
  { value: '100%', label: 'private — only you see it' },
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('expired') === 'true';

  const emailError = touched.email && email && !isValidEmail(email) ? 'Enter a valid email address' : null;
  const passwordError = touched.password && password && password.length < 8 ? 'Password must be at least 8 characters' : null;
  const canSubmit = email && password && !emailError && !passwordError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Brand */}
          <div>
            <div className="auth-brand">GrowthLog</div>
            <div className="auth-tagline">Record who you are. Become who you want to be.</div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 20, margin: '28px 0 32px' }}>
            {STATS.map(({ value, label }) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Fraunces', fontSize: 26, color: 'var(--gold)', lineHeight: 1, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', lineHeight: 1.4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Dimensions list */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(245,240,232,0.3)', marginBottom: 20 }}>
              The 5 Dimensions of Growth
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {DIMENSIONS.map(({ icon, title, desc, color }) => (
                <div key={title} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'rgba(245,240,232,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    border: `1px solid ${color + '33'}`
                  }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(245,240,232,0.9)', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', lineHeight: 1.4 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <div style={{ marginTop: 32, padding: '16px 18px', background: 'rgba(245,240,232,0.06)', borderRadius: 12, borderLeft: '3px solid var(--gold)' }}>
            <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.55)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              "The longer you use GrowthLog, the more valuable it becomes. Every entry is a data point in your growth story."
            </p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-box">
          <h2>Welcome back</h2>
          <p style={{ marginBottom: isExpired ? 16 : 28 }}>Your growth journal is waiting for you.</p>

          {isExpired && (
            <div style={{ padding: '12px 16px', background: 'rgba(201,168,76,0.08)', borderRadius: 10, border: '1px solid rgba(201,168,76,0.2)', marginBottom: 24, fontSize: 13, color: 'rgba(13,13,13,0.6)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--rust)' }}>⚠ Session Expired:</strong> For your security, you have been logged out. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="text"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                placeholder="you@example.com"
                style={{ borderColor: emailError ? 'var(--rust)' : undefined }}
                required
              />
              {emailError && (
                <div style={{ fontSize: 12, color: 'var(--rust)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>⚠</span> {emailError}
                </div>
              )}
              {touched.email && email && !emailError && (
                <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>✓</span> Looks good
                </div>
              )}
            </div>

            {/* Password with show/hide */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="••••••••"
                  style={{ paddingRight: 44, borderColor: passwordError ? 'var(--rust)' : undefined }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 16, color: 'rgba(13,13,13,0.35)', transition: 'color 0.2s',
                    padding: 4,
                  }}
                  title={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              {passwordError && (
                <div style={{ fontSize: 12, color: 'var(--rust)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>⚠</span> {passwordError}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', opacity: !canSubmit ? 0.6 : 1, transition: 'opacity 0.2s' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: '14px 16px', background: 'rgba(107,140,107,0.07)', borderRadius: 12, border: '1px solid rgba(107,140,107,0.15)' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--sage)', marginBottom: 8, fontWeight: 600 }}>💡 Getting the most out of GrowthLog</div>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: 'rgba(13,13,13,0.55)', lineHeight: 2 }}>
              <li>Log every day — even a single sentence counts</li>
              <li>Create categories for each life area you care about</li>
              <li>Take a snapshot today, then again in 30 days</li>
              <li>Write goals with clear deadlines, then actually reflect</li>
            </ul>
          </div>

          <div className="divider" />
          <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(13,13,13,0.5)' }}>
            New to GrowthLog?{' '}
            <Link to="/register" style={{ color: 'var(--sage)', fontWeight: 600, textDecoration: 'none' }}>
              Create a free account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
