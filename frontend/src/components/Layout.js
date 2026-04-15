import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errors';

const NAV_GROUPS = [
  {
    group: 'Daily Actions',
    items: [
      { to: '/dashboard', icon: '◈', label: 'Dashboard', shortcut: 'D' },
      { to: '/log', icon: '✦', label: 'Daily Log', shortcut: 'L' },
      { to: '/todos', icon: '☑', label: 'To-Dos', shortcut: 'T' },
    ]
  },
  {
    group: 'Mind & Reflection',
    items: [
      { to: '/thoughts', icon: '🪴', label: 'Mind Garden', shortcut: 'M' },
      { to: '/insights', icon: '🔬', label: 'Insight Lab', shortcut: 'I' },
      { to: '/temporal', icon: '🕰️', label: 'Temporal Space', shortcut: 'P' },
      { to: '/reframes', icon: '🧠', label: 'Reframing', shortcut: 'R' },
    ]
  },
  {
    group: 'Vision & Strategy',
    items: [
      { to: '/life-canvas', icon: '🎨', label: 'Life Canvas', shortcut: 'V' },
      { to: '/growth-hub', icon: '🚀', label: 'Growth Hub', shortcut: 'W' },
      { to: '/goals', icon: '◇', label: 'Goals', shortcut: 'G' },
      { to: '/manifestations', icon: '✧', label: 'Manifestations', shortcut: 'F' },
    ]
  },
  {
    group: 'Health & Body',
    items: [
      { to: '/health', icon: '🧬', label: 'Health & Body', shortcut: 'U' },
    ]
  },
  {
    group: 'Learning & Career',
    items: [
      { to: '/knowledge', icon: '📚', label: 'Knowledge Vault', shortcut: 'K' },
    ]
  },
  {
    group: 'Analytics & History',
    items: [
      { to: '/growth', icon: '◎', label: 'Growth Analytics', shortcut: null },
      { to: '/history', icon: '⏳', label: 'History Hub', shortcut: 'H' },
    ]
  }
];

const NAV = NAV_GROUPS.flatMap(g => g.items);

// Shortcut map for keyboard navigation
const SHORTCUT_MAP = {};
NAV.forEach(item => {
  if (item.shortcut) SHORTCUT_MAP[item.shortcut.toLowerCase()] = item.to;
});

const MOBILE_BREAKPOINT = 900;

export default function Layout() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= MOBILE_BREAKPOINT;
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleVerifyEmail = async () => {
    setVerifying(true);
    try {
      await API.post('/auth/verify/send');
      toast.success('Verification link sent! Check your email.');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to send verification link.'));
    } finally {
      setVerifying(false);
    }
  };

  // Refresh user data (streak, etc.) on every page navigation
  useEffect(() => {
    refreshUser().catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => {
      const nowMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(nowMobile);
      if (!nowMobile) {
        setIsSidebarVisible(true);
      } else {
        setIsSidebarVisible(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts when typing in an input, textarea, or select
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      // Ignore if modifier keys are held (Ctrl/Cmd/Alt)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Escape: close any open modal-overlay
      if (e.key === 'Escape') {
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) {
          const closeBtn = overlay.querySelector('.modal-close');
          if (closeBtn) closeBtn.click();
        }
        setShowShortcutHelp(false);
        return;
      }

      // Check if any modal is open. Bail out early if so.
      if (document.querySelector('.modal-overlay') || document.querySelector('[role="dialog"]')) {
        return;
      }

      // ? — show shortcut help overlay
      if (e.key === '?') {
        setShowShortcutHelp(prev => !prev);
        return;
      }

      // Nav shortcuts
      if (SHORTCUT_MAP[key]) {
        e.preventDefault();
        navigate(SHORTCUT_MAP[key]);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
  // ────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);

  return (
    <div className={`app-shell ${!isSidebarVisible ? 'sidebar-hidden' : ''}`}>
      {/* Floating Toggle Button (Only visible when sidebar is hidden) */}
      {!isSidebarVisible && (
        <button
          className="sidebar-toggle-floating"
          onClick={toggleSidebar}
          title="Show Sidebar"
        >
          ☰
        </button>
      )}

      {isMobile && isSidebarVisible && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarVisible(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isSidebarVisible ? 'visible' : 'hidden'}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>GrowthLog</h1>
              <span>Personal Journal</span>
            </div>
            <button
              className="sidebar-toggle-btn"
              onClick={toggleSidebar}
              title="Hide Sidebar"
            >
              ✕
            </button>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="nav-group">
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(245,240,232,0.4)', fontWeight: 700, padding: '0 16px', marginBottom: 8 }}>
                {group.group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map(({ to, icon, label, shortcut }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={shortcut ? `${label} (${shortcut})` : label}
                  >
                    <span className="icon">{icon}</span>
                    {label}
                    {shortcut && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 10,
                        color: 'rgba(245,240,232,0.2)',
                        background: 'rgba(245,240,232,0.06)',
                        borderRadius: 4,
                        padding: '2px 5px',
                        fontFamily: 'monospace',
                        letterSpacing: 0,
                      }}>
                        {shortcut}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="streak-badge">
            <span className="streak-num">{user?.streak || 0}</span>
            <span className="streak-label">Day Streak</span>
          </div>
          <button
            onClick={() => navigate('/profile')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.6)', fontSize: 13, marginBottom: 10, padding: '6px 8px', borderRadius: 8, width: '100%' }}
          >
            <span style={{ fontSize: 18 }}>{user?.avatar_emoji || '👤'}</span>
            {user?.name}
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-ghost"
              onClick={handleLogout}
              style={{ color: 'rgba(245,240,232,0.4)', flex: 1, justifyContent: 'center', fontSize: 13 }}
            >
              Sign out
            </button>
            <button
              onClick={() => setShowShortcutHelp(true)}
              title="Keyboard shortcuts (?)"
              style={{
                background: 'rgba(245,240,232,0.06)',
                border: '1px solid rgba(245,240,232,0.1)',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'rgba(245,240,232,0.3)',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontFamily: 'monospace',
                flexShrink: 0,
              }}
            >
              ?
            </button>
          </div>
        </div>
      </aside>

      <main className={`main-content ${!isSidebarVisible ? 'expanded' : ''}`}>
        {!user?.is_verified && (
          <div style={{
            margin: '24px 32px 0 32px',
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
                We've sent a link to <strong>{user?.email}</strong>. Please verify your account to secure your growth data.
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
        <Outlet />
      </main>

      {/* Keyboard Shortcut Help Modal */}
      {showShortcutHelp && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowShortcutHelp(false)}
          style={{ zIndex: 2000 }}
        >
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Keyboard Shortcuts</h3>
              <button className="modal-close" onClick={() => setShowShortcutHelp(false)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', marginBottom: 20 }}>
              Press these keys from anywhere in the app (not while typing in a field).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              {NAV.filter(n => n.shortcut).map(({ label, shortcut, icon }) => (
                <div key={shortcut} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(13,13,13,0.04)' }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: 13,
                    background: 'var(--mist)', borderRadius: 6,
                    padding: '3px 8px', fontWeight: 700, color: 'var(--ink)',
                    border: '1px solid rgba(13,13,13,0.1)',
                  }}>{shortcut}</span>
                  <span style={{ fontSize: 14 }}>{icon} {label}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(13,13,13,0.04)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--mist)', borderRadius: 6, padding: '3px 8px', fontWeight: 700, color: 'var(--ink)', border: '1px solid rgba(13,13,13,0.1)' }}>Esc</span>
                <span style={{ fontSize: 14 }}>Close modal / dialog</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--mist)', borderRadius: 6, padding: '3px 8px', fontWeight: 700, color: 'var(--ink)', border: '1px solid rgba(13,13,13,0.1)' }}>?</span>
                <span style={{ fontSize: 14 }}>Toggle this help</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
