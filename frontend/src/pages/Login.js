import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const HOW_IT_WORKS = [
  { icon: '✦', title: 'Log daily', desc: 'Spend 2 minutes at the end of each day reflecting on each area of your life.' },
  { icon: '◇', title: 'Set goals', desc: 'Define meaningful targets with deadlines, then reflect honestly when the time comes.' },
  { icon: '✧', title: 'Write your vision', desc: 'Use manifestations to describe your future self — then track how you\'re becoming them.' },
  { icon: '○', title: 'Take snapshots', desc: 'Capture who you are today. In 30 or 90 days, compare the two and see your growth.' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="auth-brand">GrowthLog</div>
          <div className="auth-tagline">Record who you are. Become who you want to be.</div>

          <div style={{ marginTop: 32, marginBottom: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(245,240,232,0.4)', marginBottom: 16 }}>
              How it works
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {HOW_IT_WORKS.map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, color: 'var(--gold)', flexShrink: 0, marginTop: 2 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(245,240,232,0.9)', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.5)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(245,240,232,0.06)', borderRadius: 12, borderLeft: '3px solid var(--gold)' }}>
            <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.6)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              "The longer you use GrowthLog, the more valuable it becomes. Every entry is a data point in your growth story."
            </p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-box">
          <h2>Welcome back</h2>
          <p>Your growth journal is waiting for you.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: '16px', background: 'rgba(107,140,107,0.08)', borderRadius: 12, border: '1px solid rgba(107,140,107,0.15)' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--sage)', marginBottom: 8 }}>💡 Getting the most from GrowthLog</div>
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
            <Link to="/register" style={{ color: 'var(--sage)', fontWeight: 500, textDecoration: 'none' }}>
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
