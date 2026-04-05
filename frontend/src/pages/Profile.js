import { useEffect, useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';

const AVATAR_OPTIONS = ['🌱', '🔥', '💎', '🦁', '🦋', '🌊', '⚡', '🎯', '🌙', '☀️', '🏔️', '🌿'];

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [pwMode, setPwMode] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', avatar_emoji: '🌱', timezone: 'UTC' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);


  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', bio: user.bio || '', avatar_emoji: user.avatar_emoji || '🌱', timezone: user.timezone || 'UTC' });
    }
    API.get('/auth/stats').then(r => setStats(r.data)).catch(() => {});
  }, [user]);

  const handleSaveProfile = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      await API.put('/auth/profile', { name: form.name, bio: form.bio, avatar_emoji: form.avatar_emoji, timezone: form.timezone });
      await refreshUser();
      toast.success('Profile updated!');
      setEditMode(false);
    } catch { toast.error('Failed to update profile'); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current_password || !pwForm.new_password) return toast.error('Fill all fields');
    if (pwForm.new_password.length < 6) return toast.error('New password must be at least 6 characters');
    if (pwForm.new_password !== pwForm.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await API.put('/auth/password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed!');
      setPwMode(false);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to change password'); }
    finally { setLoading(false); }
  };

  const handleChangeEmail = async () => {
    if (!emailForm.new_email || !emailForm.password) return toast.error('Fill all fields');
    setLoading(true);
    try {
      await API.put('/auth/email', { new_email: emailForm.new_email, password: emailForm.password });
      await refreshUser();
      toast.success('Email updated successfully!');
      setEmailMode(false);
      setEmailForm({ new_email: '', password: '' });
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to update email'); }
    finally { setLoading(false); }
  };

  const handleTogglePublic = async () => {
    setLoading(true);
    try {
      await API.put('/auth/public', { is_public: !user?.is_public });
      await refreshUser();
      toast.success(user?.is_public ? 'Profile is now Private' : 'Profile is now Public!');
    } catch { toast.error('Failed to change privacy settings'); }
    finally { setLoading(false); }
  };

  const handleVerifyEmail = async () => {
    setVerifying(true);
    try {
      await API.post('/auth/verify/send');
      toast.success('Verification link sent! Check your email (and console for this demo).');
    } catch {
      toast.error('Failed to send verification link.');
    } finally {
      setVerifying(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt('WARNING: This will permanently delete your account, all daily logs, categories, goals, and snapshots. This CANNOT be undone.\n\nType "DELETE" to confirm:');
    if (confirmation !== 'DELETE') return;
    setLoading(true);
    try {
      await API.delete('/auth/me');
      toast.success('Account and all data successfully deleted.');
      logout();
      navigate('/login');
    } catch {
      toast.error('Failed to delete account.');
      setLoading(false);
    }
  };

  const memberSince = user?.created_at ? format(parseISO(user?.created_at), 'MMMM d, yyyy') : 'Recently';

  return (
    <div>
      <div className="page-header">
        <h2>Profile</h2>
        <p>Your account & growth stats</p>
      </div>

      <div className="page-body">
        {!user?.is_verified && (

          <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(201,168,76,0.1)', borderRadius: 10, border: '1px solid rgba(201,168,76,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--rust)', marginBottom: 2 }}>Verify your email address</div>
              <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)' }}>We need to verify <strong>{user?.email}</strong> to secure your account and send reminders.</div>
            </div>
            <button className="btn btn-sm btn-outline" style={{ borderColor: 'var(--rust)', color: 'var(--rust)' }} onClick={handleVerifyEmail} disabled={verifying}>
              {verifying ? 'Sending...' : 'Send Link'}
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Profile Card */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            {!editMode ? (
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 64, lineHeight: 1, flexShrink: 0 }}>{user?.avatar_emoji || '🌱'}</div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 24, marginBottom: 4 }}>{user?.name}</h2>
                  <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.45)', marginBottom: 4 }}>{user?.email}</p>
                  <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.45)', marginBottom: 12 }}>Member since {memberSince}</p>
                  {user?.bio && <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.65)', lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' }}>"{user.bio}"</p>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditMode(true)}>✎ Edit Profile</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setPwMode(true)}>🔒 Change Password</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEmailMode(true)}>✉️ Change Email</button>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Fraunces', fontSize: 36, color: 'var(--gold)', lineHeight: 1 }}>{user?.streak || 0}</div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)' }}>Day Streak</div>
                  <div style={{ fontFamily: 'Fraunces', fontSize: 20, color: 'var(--sage)', marginTop: 8, lineHeight: 1 }}>{user?.longest_streak || 0}</div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)' }}>Best Streak</div>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ marginBottom: 20 }}>Edit Profile</h3>
                <div className="form-group">
                  <label className="form-label">Choose Avatar</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                    {AVATAR_OPTIONS.map(a => (
                      <button key={a} onClick={() => setForm({ ...form, avatar_emoji: a })}
                        style={{ width: 44, height: 44, borderRadius: 10, fontSize: 24, cursor: 'pointer',
                          border: `2px solid ${form.avatar_emoji === a ? 'var(--sage)' : 'rgba(13,13,13,0.1)'}`,
                          background: form.avatar_emoji === a ? 'rgba(107,140,107,0.1)' : 'white' }}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bio (optional)</label>
                  <textarea className="form-textarea" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                    placeholder="A short note about yourself or your growth intentions..." style={{ minHeight: 80 }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-outline" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveProfile} disabled={loading} style={{ flex: 1 }}>
                    {loading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div>
            <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 16 }}>Your Growth in Numbers</h3>
            <div className="grid-4" style={{ marginBottom: 24 }}>
              {[
                { label: 'Days Logged', value: stats.total_logs, icon: '✦' },
                { label: 'Goals Created', value: stats.total_goals, icon: '◇' },
                { label: 'Goals Completed', value: stats.completed_goals, icon: '✅' },
                { label: 'Days Journaling', value: stats.days_since_join, icon: '📅' },
                { label: 'Manifestations', value: stats.total_manifestations, icon: '✧' },
                { label: 'Visions Completed', value: stats.completed_manifestations, icon: '⭐' },
                { label: 'Snapshots Taken', value: stats.total_snapshots, icon: '○' },
                { label: 'Categories Active', value: stats.total_categories, icon: '▦' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.icon} {s.label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, color: 'var(--gold)', marginBottom: 4 }}>
                    {stats.total_goals > 0 ? Math.round((stats.completed_goals / stats.total_goals) * 100) : 0}% Goal Completion
                  </h3>
                  <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.5)' }}>
                    {stats.completed_goals} of {stats.total_goals} goals achieved
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Fraunces', fontSize: 36, color: 'var(--sage)' }}>{stats.longest_streak}</div>
                  <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Best Streak</div>
                </div>
              </div>
            </div>

            <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginTop: 32, marginBottom: 16 }}>Your Milestones & Badges</h3>
            <div className="grid-4" style={{ marginBottom: 24 }}>
              {[
                { label: 'First Step', desc: 'Log your first day', condition: stats.total_logs >= 1, icon: '🌱' },
                { label: 'Consistency Builder', desc: 'Reach a 7-day streak', condition: stats.longest_streak >= 7, icon: '🔥' },
                { label: 'Habit Master', desc: 'Reach a 30-day streak', condition: stats.longest_streak >= 30, icon: '💎' },
                { label: 'Goal Getter', desc: 'Complete a single goal', condition: stats.completed_goals >= 1, icon: '🎯' },
                { label: 'Architect', desc: 'Complete 10 goals', condition: stats.completed_goals >= 10, icon: '🏗️' },
                { label: 'Visionary', desc: 'Manifest a vision', condition: stats.completed_manifestations >= 1, icon: '✨' },
                { label: 'Reflector', desc: 'Take 3 snapshots', condition: stats.total_snapshots >= 3, icon: '📸' },
                { label: 'Dedicated', desc: 'Log 100 days total', condition: stats.total_logs >= 100, icon: '🌟' }
              ].map(b => (
                <div key={b.label} className="card" style={{ textAlign: 'center', opacity: b.condition ? 1 : 0.4, filter: b.condition ? 'none' : 'grayscale(100%)', background: b.condition ? 'var(--mist)' : 'transparent', border: b.condition ? '1px solid rgba(13,13,13,0.05)' : '1px dashed rgba(13,13,13,0.15)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{b.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social / Sharing */}
        {!editMode && !pwMode && (
          <div className="card" style={{ marginTop: 24, padding: 24, borderLeft: '4px solid var(--sage)', background: 'var(--mist)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, color: 'var(--sage)', marginBottom: 8 }}>Public Profile Link</h3>
                <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)', maxWidth: 600 }}>
                  Make your aggregated stats, badges, and streaks public so you can share your progress with friends. 
                  (Don't worry, your private daily logs, notes, and specific journal entries remain 100% hidden).
                </p>
              </div>
              <button className={`btn btn-sm ${user?.is_public ? 'btn-primary' : 'btn-outline'}`} onClick={handleTogglePublic} disabled={loading}>
                {loading ? '...' : user?.is_public ? '✓ Profile is Public' : 'Make Public'}
              </button>
            </div>
            
            {user?.is_public && (
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(13,13,13,0.1)', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>🔗</span>
                <a href={`/u/${user?.id}`} target="_blank" rel="noreferrer" style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: 'var(--sage)', textDecoration: 'none' }}>
                  {window.location.origin}/u/{user?.id}
                </a>
                <button className="btn btn-ghost btn-sm" style={{ background: 'white', border: '1px solid rgba(13,13,13,0.1)' }} 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/u/${user?.id}`);
                    toast.success('Link copied to clipboard!');
                  }}>Copy Link</button>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone */}
        {!editMode && !pwMode && (
          <div className="card" style={{ marginTop: 24, padding: 24, borderLeft: '4px solid var(--rust)', background: 'var(--paper)' }}>
            <h3 style={{ fontSize: 18, color: 'var(--rust)', marginBottom: 8 }}>Danger Zone</h3>
            <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', marginBottom: 16 }}>
              Permanently delete your account and all associated data (daily logs, categories, goals, and manifestations). This action cannot be reversed.
            </p>
            <button className="btn btn-sm" onClick={handleDeleteAccount} disabled={loading} style={{ background: 'var(--rust)', color: 'white', border: 'none' }}>
              Delete Account & All Data
            </button>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {pwMode && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPwMode(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close" onClick={() => setPwMode(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" value={pwForm.current_password}
                onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" value={pwForm.new_password}
                onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} placeholder="At least 6 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-input" value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Repeat new password" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setPwMode(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleChangePassword} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Change Email Modal */}
      {emailMode && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEmailMode(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Change Email</h3>
              <button className="modal-close" onClick={() => setEmailMode(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">New Email Address</label>
              <input type="email" className="form-input" value={emailForm.new_email}
                onChange={e => setEmailForm({ ...emailForm, new_email: e.target.value })} placeholder="new@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" value={emailForm.password}
                onChange={e => setEmailForm({ ...emailForm, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setEmailMode(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleChangeEmail} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Changing...' : 'Change Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
