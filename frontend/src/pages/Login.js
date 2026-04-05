import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const FEATURES = [
  {
    icon: '✦',
    title: 'Daily Log — 2 minutes a day',
    desc: 'Rate your mood, energy, and write what happened across each life category. Simple. Consistent. Powerful over time.',
  },
  {
    icon: '◇',
    title: 'Goals with real reflection',
    desc: 'Set goals with deadlines, break them into micro-steps, and reflect honestly when the time comes. Not just a list.',
  },
  {
    icon: '✧',
    title: 'Manifestations — become the vision',
    desc: 'Write your future self in vivid detail. Track every win and challenge as you close the gap between now and then.',
  },
  {
    icon: '○',
    title: 'Snapshots — see how far you\'ve come',
    desc: 'Capture who you are today. In 30 or 90 days, compare the two entries side by side and see tangible growth.',
  },
];

const STATS = [
  { value: '365', label: 'days of insight per year' },
  { value: '5', label: 'life categories by default' },
  { value: '100%', label: 'private — only you see it' },
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

          {/* Feature list */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(245,240,232,0.35)', marginBottom: 18 }}>
              Everything you get
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {FEATURES.map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20, color: 'var(--gold)', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(245,240,232,0.9)', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)', lineHeight: 1.6 }}>{desc}</div>
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
          <p style={{ marginBottom: 28 }}>Your growth journal is waiting for you.</p>

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
