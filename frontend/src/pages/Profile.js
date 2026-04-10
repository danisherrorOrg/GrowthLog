import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { format, parseISO, subWeeks, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import {
  BarChart, Bar, ResponsiveContainer, Tooltip as RechartsTooltip, Cell
} from 'recharts';
import PromptModal from '../components/ui/PromptModal';

const AVATAR_OPTIONS = ['🌱', '🔥', '💎', '🦁', '🦋', '🌊', '⚡', '🎯', '🌙', '☀️', '🏔️', '🌿'];

// Badge definitions with progress metadata
const BADGES = [
  {
    label: 'First Step',
    desc: 'Log your first day',
    icon: '🌱',
    check: (s) => s.total_logs >= 1,
    progress: (s) => ({ current: Math.min(s.total_logs, 1), total: 1, unit: 'day logged' }),
  },
  {
    label: 'Consistency Builder',
    desc: 'Reach a 7-day streak',
    icon: '🔥',
    check: (s) => s.longest_streak >= 7,
    progress: (s) => ({ current: Math.min(s.longest_streak, 7), total: 7, unit: 'streak days' }),
  },
  {
    label: 'Habit Master',
    desc: 'Reach a 30-day streak',
    icon: '💎',
    check: (s) => s.longest_streak >= 30,
    progress: (s) => ({ current: Math.min(s.longest_streak, 30), total: 30, unit: 'streak days' }),
  },
  {
    label: 'Goal Getter',
    desc: 'Complete a single goal',
    icon: '🎯',
    check: (s) => s.completed_goals >= 1,
    progress: (s) => ({ current: Math.min(s.completed_goals, 1), total: 1, unit: 'goal' }),
  },
  {
    label: 'Architect',
    desc: 'Complete 10 goals',
    icon: '🏗️',
    check: (s) => s.completed_goals >= 10,
    progress: (s) => ({ current: Math.min(s.completed_goals, 10), total: 10, unit: 'goals' }),
  },
  {
    label: 'Visionary',
    desc: 'Manifest a vision',
    icon: '✨',
    check: (s) => s.completed_manifestations >= 1,
    progress: (s) => ({ current: Math.min(s.completed_manifestations, 1), total: 1, unit: 'vision' }),
  },
  {
    label: 'Reflector',
    desc: 'Take 3 snapshots',
    icon: '📸',
    check: (s) => s.total_snapshots >= 3,
    progress: (s) => ({ current: Math.min(s.total_snapshots, 3), total: 3, unit: 'snapshots' }),
  },
  {
    label: 'Dedicated',
    desc: 'Log 100 days total',
    icon: '🌟',
    check: (s) => s.total_logs >= 100,
    progress: (s) => ({ current: Math.min(s.total_logs, 100), total: 100, unit: 'days' }),
  },
];

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [sparklineData, setSparklineData] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [pwMode, setPwMode] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', avatar_emoji: '🌱', timezone: 'UTC', email_notifications: true });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        avatar_emoji: user.avatar_emoji || '🌱',
        timezone: user.timezone || 'UTC',
        email_notifications: user.email_notifications !== false
      });
    }
    API.get('/auth/stats').then(r => {
      setStats(r.data);
      // Build a sparkline: weekly log counts for the last 12 weeks from stats.log_dates or fallback
      if (r.data.log_dates && Array.isArray(r.data.log_dates)) {
        buildSparkline(r.data.log_dates);
      }
    }).catch(() => {});

    // Also try fetching dashboard data to get heatmap for sparkline
    API.get('/dashboard?days=84').then(r => {
      if (r.data?.heatmap) {
        const dates = Object.keys(r.data.heatmap);
        buildSparkline(dates);
      }
    }).catch(() => {});
  }, [user]);

  const buildSparkline = (dates) => {
    const dateSet = new Set(dates);
    const now = new Date();
    const weeks = eachWeekOfInterval({ start: subWeeks(now, 11), end: now });
    const data = weeks.map(weekStart => {
      const start = startOfWeek(weekStart);
      const end = endOfWeek(weekStart);
      let count = 0;
      // iterate days in the week
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = format(d, 'yyyy-MM-dd');
        if (dateSet.has(key)) count++;
      }
      return { week: format(weekStart, 'MMM d'), count };
    });
    setSparklineData(data);
  };

  const handleSaveProfile = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      await API.put('/auth/profile', {
        name: form.name,
        bio: form.bio,
        avatar_emoji: form.avatar_emoji,
        timezone: form.timezone,
        email_notifications: form.email_notifications
      });
      await refreshUser();
      toast.success('Profile updated!');
      setEditMode(false);
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to update profile')); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm) {
      return toast.error('Please fill in all password fields');
    }
    if (pwForm.new_password.length < 6) {
      return toast.error('New password must be at least 6 characters long');
    }
    if (pwForm.new_password !== pwForm.confirm) {
      return toast.error('New passwords do not match');
    }
    setLoading(true);
    try {
      await API.put('/auth/password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed successfully!');
      setPwMode(false);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to change password')); }
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
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to update email')); }
    finally { setLoading(false); }
  };

  const handleTogglePublic = async () => {
    setLoading(true);
    try {
      await API.put('/auth/public', { is_public: !user?.is_public });
      await refreshUser();
      toast.success(user?.is_public ? 'Profile is now Private' : 'Profile is now Public!');
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to change privacy settings')); }
    finally { setLoading(false); }
  };

  const handleVerifyEmail = async () => {
    setVerifying(true);
    try {
      await API.post('/auth/verify/send');
      toast.success('Verification link sent! Check your email (and console for this demo).');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to send verification link.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleDeleteAccount = () => {
    setPrompt({
      title: 'Delete Account?',
      message: 'This will permanently delete your account and all associated daily logs, categories, goals, and snapshots. THIS CANNOT BE UNDONE.',
      expectedValue: 'DELETE',
      confirmLabel: 'Delete Forever',
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          await API.delete('/auth/me');
          toast.success('Account and all data successfully deleted.');
          logout();
          navigate('/login');
        } catch (e) {
          toast.error(getErrorMessage(e, 'Failed to delete account.'));
          setLoading(false);
        }
      }
    });
  };

  const memberSince = user?.created_at ? format(parseISO(user?.created_at), 'MMMM d, yyyy') : 'Recently';
  const completionRate = stats?.total_goals > 0
    ? Math.round((stats.completed_goals / stats.total_goals) * 100)
    : 0;

  const maxBarCount = Math.max(...sparklineData.map(d => d.count), 1);

  return (
    <div>
      <div className="page-header">
        <h2>Profile</h2>
        <p>Your account & growth stats</p>
      </div>

      <div className="page-body">
        {/* Email verification banner */}
        {!user?.is_verified && (
          <div style={{
            marginBottom: 24,
            padding: '16px 20px',
            background: 'var(--rust)',
            color: 'white',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(181, 91, 57, 0.2)'
          }}>
            <div style={{ flex: 1, marginRight: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Verify your email address ✦</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                We've sent a link to <strong>{user?.email}</strong>. Please verify your account to unlock all features and secure your growth data.
              </div>
            </div>
            <button
              className="btn btn-sm"
              style={{ background: 'white', color: 'var(--rust)', border: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
              onClick={handleVerifyEmail}
              disabled={verifying}
            >
              {verifying ? 'Sending...' : 'Resend Link'}
            </button>
          </div>
        )}

        {/* Profile Identity Card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 64, lineHeight: 1, flexShrink: 0 }}>{user?.avatar_emoji || '🌱'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h2 style={{ fontSize: 24 }}>{user?.name}</h2>
                {user?.is_verified && (
                  <span className="tag tag-green" style={{ fontSize: 10, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                    Verified ✦
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.45)', marginBottom: 4 }}>{user?.email}</p>
              <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.45)', marginBottom: 12 }}>Member since {memberSince}</p>
              {user?.bio && (
                <div className="markdown-body" style={{ fontSize: 14, color: 'rgba(13,13,13,0.65)', lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' }}>
                  <MarkdownRenderer content={user.bio} />
                </div>
              )}
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
        </div>

        {/* Stats Grid with Sparkline */}
        {stats && (
          <div>
            <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 16 }}>Your Growth in Numbers</h3>

            {/* Sparkline activity chart */}
            {sparklineData.length > 0 && (
              <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'Fraunces', fontSize: 17, color: 'var(--ink)' }}>Log Consistency</div>
                    <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginTop: 2 }}>Days logged per week · last 12 weeks</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Fraunces', fontSize: 28, color: 'var(--sage)', lineHeight: 1 }}>{stats.total_logs}</div>
                    <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Total days logged</div>
                  </div>
                </div>
                <div style={{ height: 72 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sparklineData} barSize={14} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <RechartsTooltip
                        cursor={{ fill: 'rgba(13,13,13,0.03)' }}
                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }}
                        formatter={(val) => [`${val} day${val !== 1 ? 's' : ''}`, 'Logged']}
                        labelFormatter={(label) => `Week of ${label}`}
                      />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                        {sparklineData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.count === 0
                              ? 'var(--mist)'
                              : entry.count >= 5
                              ? 'var(--sage)'
                              : `rgba(107,140,107,${0.3 + (entry.count / maxBarCount) * 0.7})`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <span>{sparklineData[0]?.week}</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>↔</span>
                  <span>{sparklineData[sparklineData.length - 1]?.week}</span>
                </div>
              </div>
            )}

            <div className="grid-4" style={{ marginBottom: 24 }}>
              {[
                { label: 'Days Logged', value: stats.total_logs, icon: '✦', color: 'var(--sage)' },
                { label: 'Goals Created', value: stats.total_goals, icon: '◇', color: 'var(--ink)' },
                { label: 'Goals Completed', value: stats.completed_goals, icon: '✅', color: '#c9a84c' },
                { label: 'Days Journaling', value: stats.days_since_join, icon: '📅', color: 'var(--ink)' },
                { label: 'Manifestations', value: stats.total_manifestations, icon: '✧', color: 'var(--ink)' },
                { label: 'Visions Achieved', value: stats.completed_manifestations, icon: '⭐', color: '#c9a84c' },
                { label: 'Snapshots Taken', value: stats.total_snapshots, icon: '○', color: 'var(--ink)' },
                { label: 'Categories Active', value: stats.total_categories, icon: '▦', color: 'var(--sage)' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-label">{s.icon} {s.label}</div>
                </div>
              ))}
            </div>

            {/* Goal rate banner */}
            <div className="card" style={{ background: 'var(--ink)', color: 'var(--paper)', marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, color: 'var(--gold)', marginBottom: 4 }}>
                    {completionRate}% Goal Completion Rate
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
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ width: `${completionRate}%`, height: '100%', background: 'var(--gold)', borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
            </div>

            {/* Badges */}
            <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 16 }}>Your Milestones & Badges</h3>
            <div className="grid-4" style={{ marginBottom: 24 }}>
              {BADGES.map(b => {
                const unlocked = b.check(stats);
                const prog = b.progress(stats);
                const pct = Math.round((prog.current / prog.total) * 100);
                const remaining = prog.total - prog.current;
                return (
                  <div key={b.label} className="card" style={{
                    textAlign: 'center',
                    position: 'relative',
                    background: unlocked ? 'var(--mist)' : 'white',
                    border: unlocked ? '1px solid rgba(107,140,107,0.2)' : '1px dashed rgba(13,13,13,0.15)',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                  }}>
                    {unlocked && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'var(--sage)', color: 'white',
                        borderRadius: '50%', width: 20, height: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700
                      }}>✓</div>
                    )}
                    <div style={{
                      fontSize: 32, marginBottom: 8,
                      filter: unlocked ? 'none' : 'grayscale(80%)',
                      opacity: unlocked ? 1 : 0.6,
                      transition: 'all 0.2s',
                    }}>{b.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: unlocked ? 'var(--ink)' : 'rgba(13,13,13,0.5)', marginBottom: 4 }}>{b.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginBottom: unlocked ? 0 : 10 }}>{b.desc}</div>

                    {/* Progress bar for locked badges */}
                    {!unlocked && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ background: 'rgba(13,13,13,0.07)', borderRadius: 3, height: 4, overflow: 'hidden', marginBottom: 5 }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: pct > 60 ? 'var(--gold)' : pct > 30 ? 'var(--sage-light)' : 'rgba(107,140,107,0.4)',
                            borderRadius: 3,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.4)', fontStyle: 'italic' }}>
                          {remaining > 0
                            ? `${remaining} more ${prog.unit} to go`
                            : 'Almost there!'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Public Profile Link */}
        <div className="card" style={{ marginBottom: 20, padding: 24, borderLeft: '4px solid var(--sage)', background: 'var(--mist)' }}>
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

        {/* Danger Zone */}
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--rust)', background: 'var(--paper)' }}>
          <h3 style={{ fontSize: 18, color: 'var(--rust)', marginBottom: 8 }}>Danger Zone</h3>
          <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', marginBottom: 16 }}>
            Permanently delete your account and all associated data (daily logs, categories, goals, and manifestations). This action cannot be reversed.
          </p>
          <button className="btn btn-sm" onClick={handleDeleteAccount} disabled={loading} style={{ background: 'var(--rust)', color: 'white', border: 'none' }}>
            Delete Account & All Data
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          SLIDE-IN EDIT PANEL
      ═══════════════════════════════════════════════════════════ */}
      {editMode && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(13,13,13,0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={e => { if (e.target === e.currentTarget) setEditMode(false); }}
        >
          <div style={{
            width: '100%', maxWidth: 480,
            height: '100%',
            background: 'white',
            boxShadow: '-8px 0 48px rgba(13,13,13,0.15)',
            overflowY: 'auto',
            animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Panel header */}
            <div style={{
              padding: '28px 32px 20px',
              borderBottom: '1px solid rgba(13,13,13,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'sticky', top: 0, background: 'white', zIndex: 1,
            }}>
              <div>
                <h3 style={{ fontSize: 22, marginBottom: 2 }}>Edit Profile</h3>
                <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.45)' }}>Update your identity & preferences</p>
              </div>
              <button
                onClick={() => setEditMode(false)}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  background: 'var(--mist)', cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(13,13,13,0.5)', transition: 'all 0.2s',
                }}
              >✕</button>
            </div>

            {/* Panel body */}
            <div style={{ padding: '28px 32px', flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Choose Avatar</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                  {AVATAR_OPTIONS.map(a => (
                    <button key={a} onClick={() => setForm({ ...form, avatar_emoji: a })}
                      style={{
                        width: 48, height: 48, borderRadius: 12, fontSize: 26, cursor: 'pointer',
                        border: `2px solid ${form.avatar_emoji === a ? 'var(--sage)' : 'rgba(13,13,13,0.1)'}`,
                        background: form.avatar_emoji === a ? 'rgba(107,140,107,0.1)' : 'white',
                        transition: 'all 0.15s',
                        transform: form.avatar_emoji === a ? 'scale(1.1)' : 'scale(1)',
                      }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
              </div>

              <div className="form-group">
                <label className="form-label">Bio (optional)</label>
                <textarea className="form-textarea" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                  placeholder="A short note about yourself or your growth intentions..." style={{ minHeight: 90 }} />
                <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.email_notifications}
                    onChange={e => setForm({ ...form, email_notifications: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--sage)' }} />
                  <span>Enable daily email nudges & reminders</span>
                </label>
                <p style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4, marginLeft: 26 }}>
                  If enabled, we'll send a gentle nudge if you haven't logged your growth by evening.
                </p>
              </div>
            </div>

            {/* Panel footer */}
            <div style={{
              padding: '20px 32px',
              borderTop: '1px solid rgba(13,13,13,0.07)',
              display: 'flex', gap: 12,
              position: 'sticky', bottom: 0, background: 'white',
            }}>
              <button className="btn btn-outline" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
      <PromptModal config={prompt} onClose={() => setPrompt(null)} />
    </div>
  );
}
