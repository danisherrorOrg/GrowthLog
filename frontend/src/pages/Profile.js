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
import { generateGrowthLogPDF } from '../utils/pdfExport';

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
  const [form, setForm] = useState({
    name: '',
    bio: '',
    avatar_emoji: '🌱',
    timezone: 'UTC',
    email_notifications: true,
    category_colors: [],
    category_icons: []
  });
  const [newColorInput, setNewColorInput] = useState('#6b8c6b');
  const [newIconInput, setNewIconInput] = useState('');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [exportLoading, setExportLoading] = useState(null); // 'json' | 'zip' | 'pdf' | 'md' | null


  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        avatar_emoji: user.avatar_emoji || '🌱',
        timezone: user.timezone || 'UTC',
        email_notifications: user.email_notifications !== false,
        category_colors: user.category_colors || ['#6b8c6b', '#c9a84c', '#c4623a', '#5b8ba8', '#8b6bc4', '#c46b8b', '#6bc4b8', '#a8895b'],
        category_icons: user.category_icons || ['🧠', '💼', '❤️', '🤝', '💪', '🎯', '📚', '🌿', '💰', '🎨', '🙏', '⚡']
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

  // ---- Export handlers ----
  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
  };

  const handleExportJSON = async () => {
    setExportLoading('json');
    try {
      const res = await API.get('/export/all', { responseType: 'blob' });
      triggerDownload(res.data, 'growthlog_export.json');
      toast.success('JSON export downloaded!');
    } catch (e) {
      toast.error('Export failed. Please try again.');
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportZip = async () => {
    setExportLoading('zip');
    try {
      const res = await API.get('/export/all/zip', { responseType: 'blob' });
      triggerDownload(res.data, 'growthlog_export.zip');
      toast.success('ZIP export downloaded! Contains JSON + CSV files.');
    } catch (e) {
      toast.error('Export failed. Please try again.');
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading('pdf');
    const toastId = toast.loading('Building your PDF report…');
    try {
      const [goalsRes, logsRes, catsRes] = await Promise.all([
        API.get('/goals'),
        API.get('/logs?days=90&limit=50'),
        API.get('/categories'),
      ]);
      await generateGrowthLogPDF({
        user,
        stats,
        sparklineData,
        goals: goalsRes.data || [],
        logs: logsRes.data || [],
        categories: catsRes.data || [],
      });
      toast.success('PDF downloaded!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('PDF generation failed. Please try again.', { id: toastId });
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportMD = async () => {
    setExportLoading('md');
    try {
      const res = await API.get('/export/all');
      const data = res.data || {};
      const formatSafeDate = (dateStr, fmt) => {
        if (!dateStr) return 'N/A';
        try {
          return format(parseISO(dateStr), fmt);
        } catch {
          return dateStr;
        }
      };

      const categories = data.categories || [];
      const categoryMap = {};
      categories.forEach(c => {
        categoryMap[c.id || c._id] = c;
      });

      const getCatName = (catId) => {
        const cat = categoryMap[catId];
        return cat ? `${cat.icon} ${cat.name}` : 'General';
      };

      let md = '';

      // Header & Profile Section
      const profile = data.profile || {};
      md += `# GrowthLog Journal: ${profile.name || 'User'}\n\n`;
      md += `- **Email:** ${profile.email || 'N/A'}\n`;
      md += `- **Current Streak:** ${profile.streak || 0} days (Best: ${profile.longest_streak || 0} days)\n`;
      md += `- **Timezone:** ${profile.timezone || 'UTC'}\n`;
      md += `- **Bio:** ${profile.bio || 'No bio set.'}\n`;
      if (profile.created_at) {
        md += `- **Member Since:** ${formatSafeDate(profile.created_at, 'MMMM d, yyyy')}\n`;
      }
      md += `- **Export Date:** ${format(new Date(), 'MMMM d, yyyy')}\n\n`;
      md += `---\n\n`;

      // Goals Section
      md += `## 🎯 Goals Tracker\n\n`;
      const goals = data.goals || [];
      if (goals.length === 0) {
        md += `*No goals recorded yet.*\n\n`;
      } else {
        const activeGoals = goals.filter(g => ['active', 'extended'].includes(g.status));
        const completedGoals = goals.filter(g => g.status === 'completed');
        const otherGoals = goals.filter(g => !['active', 'extended', 'completed'].includes(g.status));

        if (activeGoals.length > 0) {
          md += `### 🟢 Active Goals\n\n`;
          activeGoals.forEach(g => {
            md += `- [ ] **${g.title}** (Category: ${getCatName(g.category_id)} · Due: ${formatSafeDate(g.current_deadline, 'MMM d, yyyy')})\n`;
            if (g.description) {
              md += `  > ${g.description.split('\n').join('\n  > ')}\n`;
            }
            if (g.micro_goals && g.micro_goals.length > 0) {
              md += `  * **Steps:**\n`;
              g.micro_goals.forEach(mg => {
                const estTime = mg.time_spent ? ` (${mg.time_spent} min)` : '';
                md += `    - [${mg.completed ? 'x' : ' '}] ${mg.text}${estTime}\n`;
              });
            }
            if (g.notes && g.notes.length > 0) {
              md += `  * **Field Notes:**\n`;
              g.notes.forEach(n => {
                md += `    - *${formatSafeDate(n.date, 'MMM d, yyyy · p')}:* ${n.text}\n`;
              });
            }
            if (g.reflections && g.reflections.length > 0) {
              md += `  * **Evolution Track:**\n`;
              g.reflections.forEach(r => {
                const statusChange = r.status_change ? ` [${r.status_change}]` : '';
                md += `    - *${formatSafeDate(r.date, 'MMM d, yyyy')}${statusChange}:* ${r.text}\n`;
              });
            }
            md += `\n`;
          });
        }

        if (completedGoals.length > 0) {
          md += `### ✅ Completed Goals\n\n`;
          completedGoals.forEach(g => {
            md += `- [x] **${g.title}** (Category: ${getCatName(g.category_id)} · Completed: ${formatSafeDate(g.current_deadline, 'MMM d, yyyy')})\n`;
            if (g.reflection) {
              md += `  > *Reflection:* ${g.reflection}\n`;
            }
            md += `\n`;
          });
        }

        if (otherGoals.length > 0) {
          md += `### 🔘 Other Goals\n\n`;
          otherGoals.forEach(g => {
            md += `- [ ] ~~**${g.title}**~~ (${g.status})\n`;
            if (g.reflection) {
              md += `  > *Outcome:* ${g.reflection}\n`;
            }
            md += `\n`;
          });
        }
      }
      md += `---\n\n`;

      // Daily Journal Logs Section
      md += `## ✦ Daily Journal Logs\n\n`;
      const logs = data.daily_logs || [];
      if (logs.length === 0) {
        md += `*No daily logs recorded yet.*\n\n`;
      } else {
        const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
        sortedLogs.forEach(log => {
          md += `### ${formatSafeDate(log.date, 'EEEE, MMMM d, yyyy')}\n\n`;
          md += `- **Overall Rating:** ${log.overall_rating ? `${log.overall_rating}/10` : 'N/A'}\n`;
          if (log.highlight) {
            md += `- **The Day's Peak:** ${log.highlight}\n`;
          }
          if (log.gratitude && log.gratitude.some(g => g && g.trim())) {
            md += `- **Gratitude:**\n`;
            log.gratitude.filter(g => g && g.trim()).forEach((g, idx) => {
              md += `  ${idx + 1}. ${g}\n`;
            });
          }
          if (log.regret) {
            md += `- **Regret & Insight:** ${log.regret}\n`;
          }

          const entries = log.entries || [];
          if (entries.length > 0) {
            md += `\n#### Dimensions:\n`;
            entries.forEach(e => {
              md += `- **${getCatName(e.category_id)}**\n`;
              md += `  - Mood: ${e.mood || 'N/A'}/10 · Energy: ${e.energy || 'N/A'}/10 · Time Spent: ${e.time_spent || 0}m\n`;
              if (e.emotions && e.emotions.length > 0) {
                md += `  - Emotions: *${e.emotions.join(', ')}*\n`;
              }
              if (e.text) {
                md += `  - Notes: ${e.text.split('\n').join('\n    ')}\n`;
              }
            });
          }
          md += `\n---\n\n`;
        });
      }

      // Todos Section
      md += `## ☑ To-Dos Checklist\n\n`;
      const todos = data.todos || [];
      if (todos.length === 0) {
        md += `*No to-dos recorded yet.*\n\n`;
      } else {
        const activeTodos = todos.filter(t => t.status === 'pending');
        const completedTodos = todos.filter(t => t.status === 'done');

        if (activeTodos.length > 0) {
          md += `### 🔴 Pending To-Dos\n\n`;
          activeTodos.forEach(t => {
            const dueStr = t.due_date ? ` · Due: ${formatSafeDate(t.due_date, 'MMM d, yyyy')}` : '';
            const estStr = t.estimated_minutes ? ` (Est: ${t.estimated_minutes}m)` : '';
            const prioStr = t.priority ? ` [Priority: ${t.priority.toUpperCase()}]` : '';
            md += `- [ ] **${t.title}**${prioStr}${estStr}${dueStr}\n`;
            if (t.description) {
              md += `  > ${t.description.split('\n').join('\n  > ')}\n`;
            }
          });
          md += `\n`;
        }

        if (completedTodos.length > 0) {
          md += `### ✅ Completed To-Dos\n\n`;
          completedTodos.forEach(t => {
            const compStr = t.completed_at ? ` · Completed: ${formatSafeDate(t.completed_at, 'MMM d, yyyy')}` : '';
            const actStr = t.actual_minutes ? ` (Took: ${t.actual_minutes}m)` : '';
            md += `- [x] **${t.title}**${actStr}${compStr}\n`;
          });
          md += `\n`;
        }
      }

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
      triggerDownload(blob, 'growthlog_journal.md');
      toast.success('Markdown export downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('Export failed. Please try again.');
    } finally {
      setExportLoading(null);
    }
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
                <div className="profile-sparkline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
              <div className="profile-goal-banner-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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

        {/* ── Export Data ── */}
        <div className="card" style={{ marginBottom: 20, padding: 24, borderLeft: '4px solid var(--sage)', background: 'var(--mist)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 18, color: 'var(--sage)', marginBottom: 6 }}>📦 Export Your Data</h3>
              <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)', maxWidth: 560, lineHeight: 1.6 }}>
                Download a complete copy of your GrowthLog data in JSON, ZIP (JSON + CSV), or a
                beautifully formatted <strong>PDF report</strong> with charts, stats, and goals.
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}>
            {/* JSON card */}
            <div style={{
              background: 'white',
              border: '1px solid rgba(107,140,107,0.2)',
              borderRadius: 12,
              padding: '20px 20px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(107,140,107,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, fontWeight: 700, color: 'var(--sage)', fontFamily: 'monospace',
                }}>{'{ }'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>JSON Export</div>
                  <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.45)' }}>Single structured file</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', lineHeight: 1.5, margin: 0 }}>
                Perfect for developers or importing into other tools. Contains all your data in one JSON file.
              </p>
              <button
                id="btn-export-json"
                className="btn btn-outline btn-sm"
                onClick={handleExportJSON}
                disabled={exportLoading !== null}
                style={{ marginTop: 4, borderColor: 'var(--sage)', color: 'var(--sage)', fontWeight: 600 }}
              >
                {exportLoading === 'json' ? '⏳ Preparing…' : '⬇ Download JSON'}
              </button>
            </div>

            {/* ZIP card */}
            <div style={{
              background: 'white',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: 12,
              padding: '20px 20px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(201,168,76,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>🗜</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Full ZIP Export</div>
                  <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.45)' }}>JSON + CSV per section</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', lineHeight: 1.5, margin: 0 }}>
                Includes a master JSON and individual CSVs for every section — great for spreadsheets.
              </p>
              <button
                id="btn-export-zip"
                className="btn btn-sm"
                onClick={handleExportZip}
                disabled={exportLoading !== null}
                style={{ marginTop: 4, background: 'var(--gold)', color: 'white', border: 'none', fontWeight: 600 }}
              >
                {exportLoading === 'zip' ? '⏳ Preparing…' : '⬇ Download ZIP'}
              </button>
            </div>

            {/* PDF card */}
            <div style={{
              background: 'white',
              border: '1px solid rgba(13,13,13,0.12)',
              borderRadius: 12,
              padding: '20px 20px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(180,80,60,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>📄</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>PDF Report</div>
                  <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.45)' }}>4-page visual report</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', lineHeight: 1.5, margin: 0 }}>
                A polished multi-page PDF with charts, goal tables, activity graphs, and key insights.
              </p>
              <button
                id="btn-export-pdf"
                className="btn btn-sm"
                onClick={handleExportPDF}
                disabled={exportLoading !== null}
                style={{ marginTop: 4, background: 'var(--ink)', color: 'white', border: 'none', fontWeight: 600 }}
              >
                {exportLoading === 'pdf' ? '⏳ Generating…' : '⬇ Download PDF'}
              </button>
            </div>

            {/* Markdown card */}
            <div style={{
              background: 'white',
              border: '1px solid rgba(107,140,107,0.2)',
              borderRadius: 12,
              padding: '20px 20px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(107,140,107,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>📝</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Markdown Journal</div>
                  <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.45)' }}>Obsidian & Notion ready</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', lineHeight: 1.5, margin: 0 }}>
                A beautifully structured markdown journal of all your logs, goals, and daily reflections.
              </p>
              <button
                id="btn-export-md"
                className="btn btn-outline btn-sm"
                onClick={handleExportMD}
                disabled={exportLoading !== null}
                style={{ marginTop: 4, borderColor: 'var(--sage)', color: 'var(--sage)', fontWeight: 600 }}
              >
                {exportLoading === 'md' ? '⏳ Preparing…' : '⬇ Download MD'}
              </button>
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'rgba(13,13,13,0.35)', marginTop: 14, fontStyle: 'italic' }}>
            ✦ Large exports may take a few seconds to prepare. Your data is streamed directly — nothing is stored on our servers.
          </p>
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
            <div className="profile-edit-panel-header" style={{
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
            <div className="profile-edit-panel-body" style={{ padding: '28px 32px', flex: 1 }}>
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
                <input maxLength={200} className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" maxLength={100} />
                <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textAlign: 'right', marginTop: 4 }}>{form.name.length}/100</div>
              </div>

              <div className="form-group">
                <label className="form-label">Bio (optional)</label>
                <textarea maxLength={2000} className="form-textarea" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                  placeholder="A short note about yourself or your growth intentions..." style={{ minHeight: 90 }} maxLength={500} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>
                  <span>Markdown supported</span>
                  <span>{form.bio.length}/500</span>
                </div>
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

              {/* Design Tokens & Theme Customization */}
              <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(13,13,13,0.07)' }}>
                <h4 style={{ fontFamily: 'Fraunces', fontSize: 18, marginBottom: 4, color: 'var(--sage)' }}>Design Tokens & Theme</h4>
                <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', marginBottom: 20 }}>
                  Customize the colors and emoji icons available across your category choices.
                </p>

                {/* Color Palette Builder */}
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'block' }}>
                    Color Palette ({form.category_colors?.length || 0})
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {form.category_colors?.map((color, index) => (
                      <div
                        key={`${color}-${index}`}
                        style={{
                          position: 'relative',
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: color,
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease',
                        }}
                        title="Click to remove color"
                        onClick={() => {
                          const updated = form.category_colors.filter((_, i) => i !== index);
                          setForm({ ...form, category_colors: updated });
                        }}
                      >
                        <span style={{
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 'bold',
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                          opacity: 0,
                          transition: 'opacity 0.15s ease',
                        }}
                        className="color-chip-delete"
                        >✕</span>
                        {/* CSS to show '✕' on hover inside the chip */}
                        <style dangerouslySetInnerHTML={{__html: `
                          div:hover > .color-chip-delete { opacity: 1 !important; }
                          div:hover { transform: scale(1.1); }
                        `}} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Add Color Selector row */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid rgba(13,13,13,0.15)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'white',
                      flexShrink: 0
                    }}>
                      <input
                        type="color"
                        value={newColorInput}
                        onChange={e => setNewColorInput(e.target.value)}
                        style={{
                          position: 'absolute',
                          width: '150%',
                          height: '150%',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, margin: 0, fontSize: 13, textTransform: 'uppercase', fontFamily: 'monospace' }}
                      value={newColorInput}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.startsWith('#') && val.length <= 7) {
                          setNewColorInput(val);
                        } else if (!val.startsWith('#') && val.length <= 6) {
                          setNewColorInput('#' + val);
                        }
                      }}
                      placeholder="#HEXCODE"
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ height: 38, whiteSpace: 'nowrap', borderColor: 'var(--sage)', color: 'var(--sage)', fontWeight: 600 }}
                      onClick={() => {
                        if (!/^#[0-9A-Fa-f]{6}$/.test(newColorInput)) {
                          return toast.error('Please enter a valid 6-character hex color (e.g. #FF00FF)');
                        }
                        if (form.category_colors.includes(newColorInput)) {
                          return toast.error('This color is already in your palette');
                        }
                        setForm({
                          ...form,
                          category_colors: [...form.category_colors, newColorInput]
                        });
                        toast.success(`Color ${newColorInput} added!`);
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Category Icon Manager */}
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'block' }}>
                    Emoji Icons ({form.category_icons?.length || 0})
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 8,
                    marginBottom: 12,
                    background: 'var(--mist)',
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid rgba(13,13,13,0.05)'
                  }}>
                    {form.category_icons?.map((icon, index) => (
                      <div
                        key={`${icon}-${index}`}
                        style={{
                          position: 'relative',
                          height: 38,
                          background: 'white',
                          border: '1px solid rgba(13,13,13,0.06)',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Click to remove icon"
                        onClick={() => {
                          const updated = form.category_icons.filter((_, i) => i !== index);
                          setForm({ ...form, category_icons: updated });
                        }}
                      >
                        {icon}
                        <span style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: 'var(--rust)',
                          color: 'white',
                          fontSize: 9,
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.15s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                        }}
                        className="icon-delete-badge"
                        >✕</span>
                        <style dangerouslySetInnerHTML={{__html: `
                          div:hover > .icon-delete-badge { opacity: 1 !important; }
                          div:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
                        `}} />
                      </div>
                    ))}
                  </div>

                  {/* Add Icon Row */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, margin: 0, fontSize: 13 }}
                      value={newIconInput}
                      onChange={e => setNewIconInput(e.target.value)}
                      placeholder="Paste an emoji here..."
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ height: 38, whiteSpace: 'nowrap', borderColor: 'var(--sage)', color: 'var(--sage)', fontWeight: 600 }}
                      onClick={() => {
                        const emoji = newIconInput.trim();
                        if (!emoji) return toast.error('Please input a valid emoji or character');
                        if (emoji.length > 8) {
                          return toast.error('Icon should be a single emoji or short symbol');
                        }
                        if (form.category_icons.includes(emoji)) {
                          return toast.error('This icon is already in your list');
                        }
                        setForm({
                          ...form,
                          category_icons: [...form.category_icons, emoji]
                        });
                        setNewIconInput('');
                        toast.success(`Icon ${emoji} added!`);
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Reset to Defaults */}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{
                    width: '100%',
                    borderColor: 'var(--gold)',
                    color: 'var(--gold)',
                    background: 'rgba(201, 168, 76, 0.05)',
                    fontWeight: 600,
                    height: 38,
                    borderRadius: 10,
                    marginTop: 8
                  }}
                  onClick={() => {
                    setForm({
                      ...form,
                      category_colors: ['#6b8c6b', '#c9a84c', '#c4623a', '#5b8ba8', '#8b6bc4', '#c46b8b', '#6bc4b8', '#a8895b'],
                      category_icons: ['🧠', '💼', '❤️', '🤝', '💪', '🎯', '📚', '🌿', '💰', '🎨', '🙏', '⚡']
                    });
                    toast.success('Reset colors and icons to default sets! Save changes to persist.');
                  }}
                >
                  ↺ Reset Theme Defaults
                </button>
              </div>
            </div>

            {/* Panel footer */}
            <div className="profile-edit-panel-footer" style={{
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
              <input maxLength={200} type="password" className="form-input" value={pwForm.current_password}
                onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} placeholder="••••••••" maxLength={128} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input maxLength={200} type="password" className="form-input" value={pwForm.new_password}
                onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} placeholder="At least 6 characters" maxLength={128} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input maxLength={200} type="password" className="form-input" value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Repeat new password" maxLength={128} />
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
              <input maxLength={200} type="email" className="form-input" value={emailForm.new_email}
                onChange={e => setEmailForm({ ...emailForm, new_email: e.target.value })} placeholder="new@example.com" maxLength={200} />
            </div>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input maxLength={200} type="password" className="form-input" value={emailForm.password}
                onChange={e => setEmailForm({ ...emailForm, password: e.target.value })} placeholder="••••••••" maxLength={128} />
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
