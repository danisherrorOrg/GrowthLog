import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STEPS = [
  { num: '01', title: 'Create your account', desc: 'Takes 30 seconds. No credit card, no fluff.' },
  { num: '02', title: 'Add life categories', desc: 'We create 5 default ones for you — Mind, Body, Career, Finance, Spirit. Customize anytime.' },
  { num: '03', title: 'Log your first day', desc: 'Write what happened in each category. Rate your mood and energy. 2 minutes max.' },
  { num: '04', title: 'Watch patterns emerge', desc: 'After 7+ days, your Growth page shows charts of your mood, energy, and habits over time.' },
];

const BENEFITS = [
  { icon: '🌱', label: 'Daily journaling across all life areas' },
  { icon: '◎', label: 'Mood & energy trend charts (Recharts)' },
  { icon: '✧', label: 'Vision boards & manifestation tracking' },
  { icon: '◇', label: 'Goals with built-in reflection prompts' },
  { icon: '○', label: 'Before & after snapshots of yourself' },
  { icon: '▦', label: 'Fully custom category system' },
  { icon: '📅', label: 'Full log history — edit any past day' },
  { icon: '🔒', label: 'Completely private — only you see it' },
];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Welcome to GrowthLog! 🌱');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
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
            <div className="auth-tagline">The compound effect of daily reflection.</div>
          </div>

          {/* Step by step */}
          <div style={{ marginTop: 32, marginBottom: 28 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(245,240,232,0.35)', marginBottom: 18 }}>
              Your first 4 steps
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {STEPS.map(({ num, title, desc }) => (
                <div key={num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'Fraunces', fontSize: 22, color: 'var(--gold)', flexShrink: 0, lineHeight: 1.1, minWidth: 26 }}>{num}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(245,240,232,0.9)', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)', lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits grid */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(245,240,232,0.35)', marginBottom: 14 }}>
              What you get
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              {BENEFITS.map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)', lineHeight: 1.4 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom pull quote */}
          <div style={{ marginTop: 28, padding: '14px 18px', background: 'rgba(245,240,232,0.06)', borderRadius: 12, borderLeft: '3px solid var(--gold)' }}>
            <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.55)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              "Small daily inputs → massive long-term outputs. GrowthLog makes the invisible, visible."
            </p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-box">
          <h2>Begin your journey</h2>
          <p style={{ marginBottom: 20 }}>Track, reflect, and become who you want to be.</p>

          <div style={{ padding: '12px 16px', background: 'rgba(201,168,76,0.08)', borderRadius: 10, border: '1px solid rgba(201,168,76,0.2)', marginBottom: 24, fontSize: 13, color: 'rgba(13,13,13,0.6)', lineHeight: 1.6 }}>
            💡 <strong>Tip:</strong> After signing up, 5 default life categories are created for you instantly. Start logging on day one.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                required
              />
            </div>
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
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Start Growing →'}
            </button>
          </form>

          <div className="divider" />
          <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(13,13,13,0.5)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--sage)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
