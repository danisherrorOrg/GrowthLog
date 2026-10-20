import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { format, parseISO, subWeeks, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import PromptModal from '../components/ui/PromptModal';
import GrowthStats from '../components/profile/GrowthStats';
import ExportData from '../components/profile/ExportData';
import EditProfilePanel, { DEFAULT_CATEGORY_COLORS, DEFAULT_CATEGORY_ICONS } from '../components/profile/EditProfilePanel';
import { ChangePasswordModal, ChangeEmailModal } from '../components/profile/AccountModals';

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [sparklineData, setSparklineData] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [pwMode, setPwMode] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [form, setForm] = useState({
    name: '',
    bio: '',
    avatar_emoji: '🌱',
    timezone: 'UTC',
    email_notifications: true,
    category_colors: [],
    category_icons: []
  });
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
        email_notifications: user.email_notifications !== false,
        category_colors: user.category_colors || DEFAULT_CATEGORY_COLORS,
        category_icons: user.category_icons || DEFAULT_CATEGORY_ICONS
      });
    }
    API.get('/auth/stats').then(r => {
      setStats(r.data);
      // Build a sparkline: weekly log counts for the last 12 weeks from stats.log_dates or fallback
      if (r.data.log_dates && Array.isArray(r.data.log_dates)) {
        buildSparkline(r.data.log_dates);
      }
    }).catch(() => { });

    // Also try fetching dashboard data to get heatmap for sparkline
    API.get('/dashboard?days=84').then(r => {
      if (r.data?.heatmap) {
        const dates = Object.keys(r.data.heatmap);
        buildSparkline(dates);
      }
    }).catch(() => { });
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
        email_notifications: form.email_notifications,
        category_colors: form.category_colors,
        category_icons: form.category_icons
      });
      await refreshUser();
      toast.success('Profile updated!');
      setEditMode(false);
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to update profile')); }
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

  const handleDeleteData = () => {
    setPrompt({
      title: 'Delete All Data?',
      message: 'This will permanently erase everything you have logged — daily logs, goals, categories, to-dos, health, insights, and more — and reset your streak. Your account, login, and profile settings are kept. Consider exporting your data first. THIS CANNOT BE UNDONE.',
      expectedValue: 'DELETE',
      confirmLabel: 'Erase My Data',
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          await API.delete('/auth/me/data');
          toast.success('All your data has been deleted. Your account is still active.');
          await refreshUser(true);
        } catch (e) {
          toast.error(getErrorMessage(e, 'Failed to delete data.'));
        } finally {
          setLoading(false);
        }
      }
    });
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
          await logout();
          navigate('/login');
        } catch (e) {
          toast.error(getErrorMessage(e, 'Failed to delete account.'));
          setLoading(false);
        }
      }
    });
  };

  const memberSince = user?.created_at ? format(parseISO(user?.created_at), 'MMMM d, yyyy') : 'Recently';

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Your account & growth stats</p>
      </div>

      <div className="page-body">


        {/* Pending email verification banner */}
        {user?.pending_email && (
          <div className="profile-verify-banner" style={{
            marginBottom: 24,
            padding: '16px 20px',
            background: 'var(--gold)',
            color: 'var(--ink)',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(201, 168, 76, 0.2)'
          }}>
            <div style={{ flex: 1, marginRight: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Verify your new email address ✦</div>
              <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.8)', lineHeight: 1.4 }}>
                We've sent a link to <strong>{user?.pending_email}</strong>. Once verified, this will become your primary address.
              </div>
            </div>
            <button
              className="btn btn-sm"
              style={{ background: 'var(--ink)', color: 'white', border: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
              onClick={handleVerifyEmail}
              disabled={verifying}
            >
              {verifying ? 'Sending...' : 'Resend Link'}
            </button>
          </div>
        )}

        {/* Profile Identity Card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="profile-identity-inner" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
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
            <div className="profile-streak-block" style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'Fraunces', fontSize: 36, color: 'var(--gold)', lineHeight: 1 }}>{user?.streak || 0}</div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)' }}>Day Streak</div>
              <div style={{ fontFamily: 'Fraunces', fontSize: 20, color: 'var(--sage)', marginTop: 8, lineHeight: 1 }}>{user?.longest_streak || 0}</div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)' }}>Best Streak</div>
              {user?.streak_shields > 0 && (
                <div style={{
                  marginTop: 12,
                  fontSize: 10,
                  color: 'var(--gold)',
                  background: 'rgba(201, 168, 76, 0.08)',
                  padding: '3px 8px',
                  borderRadius: 12,
                  border: '1px solid rgba(201, 168, 76, 0.2)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap'
                }}>
                  🛡️ {user.streak_shields} Active
                </div>
              )}
            </div>
          </div>
        </div>

        {stats && <GrowthStats stats={stats} sparklineData={sparklineData} />}

        {/* Public Profile Link */}
        <div className="card" style={{ marginBottom: 20, padding: 24, borderLeft: '4px solid var(--sage)', background: 'var(--mist)' }}>
          <div className="profile-public-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
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

        <ExportData user={user} stats={stats} sparklineData={sparklineData} />

        {/* Danger Zone */}
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--rust)', background: 'var(--paper)' }}>
          <h3 style={{ fontSize: 18, color: 'var(--rust)', marginBottom: 8 }}>Danger Zone</h3>
          <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', marginBottom: 16 }}>
            Erase everything you've logged and start fresh, but keep your account, login, and profile settings. This action cannot be reversed.
          </p>
          <button className="btn btn-sm" onClick={handleDeleteData} disabled={loading} style={{ background: 'transparent', color: 'var(--rust)', border: '1px solid var(--rust)', marginBottom: 24 }}>
            Delete All Data (Keep Account)
          </button>
          <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', marginBottom: 16 }}>
            Permanently delete your account and all associated data (daily logs, categories, goals, and manifestations). This action cannot be reversed.
          </p>
          <button className="btn btn-sm" onClick={handleDeleteAccount} disabled={loading} style={{ background: 'var(--rust)', color: 'white', border: 'none' }}>
            Delete Account & All Data
          </button>
        </div>
      </div>

      {editMode && (
        <EditProfilePanel
          form={form}
          setForm={setForm}
          saving={loading}
          onSave={handleSaveProfile}
          onClose={() => setEditMode(false)}
        />
      )}
      {pwMode && <ChangePasswordModal onClose={() => setPwMode(false)} />}
      {emailMode && <ChangeEmailModal onClose={() => setEmailMode(false)} onChanged={refreshUser} />}
      <PromptModal config={prompt} onClose={() => setPrompt(null)} />
    </div>
  );
}
