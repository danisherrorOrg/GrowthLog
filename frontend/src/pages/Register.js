import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errors';

const STEPS = [
  { num: '01', title: 'Create your account', desc: 'Takes 30 seconds. No credit card, no fluff.' },
  { num: '02', title: 'Add life categories', desc: 'We create 5 default ones for you — Mind, Body, Career, Finance, Spirit. Customize anytime.' },
  { num: '03', title: 'Log your first day', desc: 'Write what happened in each category. Rate your mood and energy. 2 minutes max.' },
  { num: '04', title: 'Watch patterns emerge', desc: 'After 7+ days, your Growth page shows charts of your mood, energy, and habits over time.' },
];

const DIMENSIONS = [
  { icon: '🧠', title: 'Mind', desc: 'Intellectual growth and mental clarity.', color: 'var(--sage)' },
  { icon: '💪', title: 'Body', desc: 'Physical health and vital energy.', color: 'var(--rust)' },
  { icon: '💼', title: 'Career', desc: 'Productivity and financial health.', color: '#8b6bc4' },
  { icon: '🤝', title: 'Social', desc: 'Deepening human connections.', color: 'var(--gold)' },
  { icon: '✨', title: 'Soul', desc: 'Spirituality and internal alignment.', color: '#c4623a' },
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(pw) {
  if (!pw) return null;
  if (pw.length < 8) return { level: 'weak', label: 'Too short (min 8 chars)', color: 'var(--rust)', pct: 25 };
  if (pw.length < 10) return { level: 'fair', label: 'Fair — add numbers or symbols', color: 'var(--gold)', pct: 55 };
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { level: 'strong', label: 'Strong password ✓', color: 'var(--sage)', pct: 100 };
  return { level: 'good', label: 'Good — capitalize or add numbers for stronger', color: '#6ba87b', pct: 78 };
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const nameError = touched.name && !name.trim() ? 'Name is required' : null;
  const emailError = touched.email && email && !isValidEmail(email) ? 'Enter a valid email address' : null;
  const passwordStrength = getPasswordStrength(password);
  const passwordError = touched.password && password && password.length < 8 ? 'Password must be at least 8 characters' : null;
  const canSubmit = name.trim() && email && isValidEmail(email) && password.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Welcome to GrowthLog! 🌱');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Registration failed'));
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

          {/* Steps */}
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

          {/* Dimensions grid */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(245,240,232,0.3)', marginBottom: 18 }}>
              The 5 Dimensions of Growth
            </div>
            <div className="stack-grid-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
              {DIMENSIONS.map(({ icon, title, desc, color }) => (
                <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: 'rgba(245,240,232,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    border: `1px solid ${color + '33'}`, flexShrink: 0
                  }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(245,240,232,0.9)', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', lineHeight: 1.4 }}>{desc}</div>
                  </div>
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
            {/* Name */}
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, name: true }))}
                placeholder="What should we call you?"
                maxLength={100}
                style={{ borderColor: nameError ? 'var(--rust)' : undefined }}
                required
              />
              <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textAlign: 'right', marginTop: 4 }}>{name.length}/100</div>
              {nameError && (
                <div style={{ fontSize: 12, color: 'var(--rust)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>⚠</span> {nameError}
                </div>
              )}
            </div>

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
                maxLength={200}
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

            {/* Password with show/hide + strength meter */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="At least 8 characters"
                  maxLength={128}
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

              {/* Strength meter */}
              {password && passwordStrength && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ background: 'var(--mist)', borderRadius: 3, height: 4, overflow: 'hidden', marginBottom: 5 }}>
                    <div style={{
                      width: `${passwordStrength.pct}%`, height: '100%',
                      background: passwordStrength.color,
                      borderRadius: 3,
                      transition: 'width 0.4s ease, background 0.3s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: passwordStrength.color, fontWeight: 500 }}>
                    {passwordStrength.label}
                  </div>
                </div>
              )}
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
