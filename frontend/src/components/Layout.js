import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errors';
import QuickCheckModal from './focus/QuickCheckModal';
import CommandPalette from './CommandPalette';
import { OPEN_EVENT, localDate, markPlanPrompted, shouldPromptPlan } from './focus/quickCheck';
import TimezoneBanner from './TimezoneBanner';

const NAV_GROUPS = [
  {
    group: 'Daily Actions',
    items: [
      { to: '/dashboard', icon: '◈', label: 'Dashboard', shortcut: 'D' },
      { to: '/log', icon: '✦', label: 'Daily Log', shortcut: 'L' },
      { to: '/todos', icon: '☑', label: 'To-Dos', shortcut: 'T' },
      { to: '/plan', icon: '☀️', label: 'Morning Plan', shortcut: 'A' },
      { to: '/focus', icon: '🧭', label: 'Should I Do This?', shortcut: 'S' },
      // `also`: pages without their own link that belong to this one, so it stays highlighted
      { to: '/decisions', icon: '⚖️', label: 'Decision Matrix', shortcut: 'N', also: ['/checkins'] },
    ]
  },
  {
    group: 'Mind & Reflection',
    items: [
      { to: '/thoughts', icon: '🪴', label: 'Mind Garden', shortcut: 'M' },
      { to: '/insights', icon: '🔬', label: 'Insight Lab', shortcut: 'I' },
      { to: '/temporal', icon: '🕰️', label: 'Temporal Space', shortcut: 'P', also: ['/snapshots', '/time-capsule'] },
      { to: '/reframes', icon: '🧠', label: 'Reframing', shortcut: 'R' },
      { to: '/lotus', icon: '🌸', label: 'Lotus Blossom', shortcut: 'B' },
      { to: '/reviews', icon: '📋', label: 'Reviews', shortcut: 'E' },
    ]
  },
  {
    group: 'Vision & Strategy',
    items: [
      { to: '/life-canvas', icon: '🎨', label: 'Life Canvas', shortcut: 'V' },
      { to: '/growth-hub', icon: '🚀', label: 'Growth Hub', shortcut: 'W' },
      { to: '/goals', icon: '◇', label: 'Goals', shortcut: 'G' },
      { to: '/manifestations', icon: '✧', label: 'Manifestations', shortcut: 'F' },
      { to: '/categories', icon: '🏷️', label: 'Categories', shortcut: 'C' },
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
      { to: '/knowledge', icon: '📚', label: 'Knowledge Vault', shortcut: 'K', also: ['/books'] },
    ]
  },
  {
    group: 'Analytics & History',
    items: [
      { to: '/growth', icon: '◎', label: 'Growth Analytics', shortcut: 'Y' },
      { to: '/history', icon: '⏳', label: 'History Hub', shortcut: 'H' },
    ]
  }
];

const NAV = NAV_GROUPS.flatMap(g => g.items);

const SHORTCUT_MAP = {};
NAV.forEach(item => {
  if (item.shortcut) SHORTCUT_MAP[item.shortcut.toLowerCase()] = item.to;
});

// Bottom nav items (the 4 most-used + a "More" drawer trigger)
const BOTTOM_NAV = [
  { to: '/dashboard', icon: '◈', label: 'Home' },
  { to: '/log', icon: '✦', label: 'Log' },
  { to: '/todos', icon: '☑', label: 'Todos' },
  { to: '/thoughts', icon: '🪴', label: 'Mind' },
];

// Matches the CSS `@media (max-width: 900px)` phone layout, so 900px itself is a phone
const MOBILE_BREAKPOINT = 900;
const SIDEBAR_PREF_KEY = 'growthlog_sidebar_visible';
const SIDEBAR_ID = 'app-sidebar';

// Whether the user left the sidebar shown on desktop (phones always start with the drawer closed)
const readSidebarPref = () => {
  try {
    return localStorage.getItem(SIDEBAR_PREF_KEY) !== 'false';
  } catch {
    return true;
  }
};

const isMobileWidth = () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;

const pathIsUnder = (pathname, base) => pathname === base || pathname.startsWith(`${base}/`);

// A nav item is current on its own page, its sub-pages, and the pages listed in `also`
const isNavItemActive = (item, pathname) =>
  [item.to, ...(item.also || [])].some(base => pathIsUnder(pathname, base));

export default function Layout() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(isMobileWidth);
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => !isMobileWidth() && readSidebarPref());
  const isMobileRef = useRef(isMobile);
  const sidebarRef = useRef(null);
  const closeBtnRef = useRef(null);
  const showBtnRef = useRef(null);
  const moreBtnRef = useRef(null);
  const navRef = useRef(null);
  const topBarRef = useRef(null);
  const mainRef = useRef(null);
  const fabRef = useRef(null);
  // Set when the user opens the sidebar, so focus moves into it (not on page load)
  const focusOnOpenRef = useRef(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // --- Notifications State & Logic ---
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      const stored = localStorage.getItem('growthlog_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(() => {
    try {
      const stored = localStorage.getItem('growthlog_dismissed_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const bellContainerRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    localStorage.setItem('growthlog_read_notifications', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    localStorage.setItem('growthlog_dismissed_notifications', JSON.stringify(dismissedNotificationIds));
  }, [dismissedNotificationIds]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (bellContainerRef.current && !bellContainerRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [showNotifications]);

  const activeNotifications = notifications.filter(n => !dismissedNotificationIds.includes(n.id));
  const unreadCount = activeNotifications.filter(n => !readNotificationIds.includes(n.id)).length;

  const handleMarkAllAsRead = () => {
    const allIds = activeNotifications.map(n => n.id);
    setReadNotificationIds(prev => {
      const next = [...prev];
      allIds.forEach(id => {
        if (!next.includes(id)) next.push(id);
      });
      return next;
    });
  };

  const handleDismissNotification = (e, id) => {
    e.stopPropagation();
    setDismissedNotificationIds(prev => [...prev, id]);
  };

  const handleNotificationClick = (notification) => {
    if (!readNotificationIds.includes(notification.id)) {
      setReadNotificationIds(prev => [...prev, notification.id]);
    }
    setShowNotifications(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

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

  // Refresh user data (streak, etc.) and notifications on every page navigation
  useEffect(() => {
    refreshUser().catch(() => { });
    if (user) {
      fetchNotifications();
    }
  }, [location.pathname, user?.id]);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) setIsSidebarVisible(false);
  }, [location.pathname, isMobile]);

  // Only reset visibility when the width crosses the breakpoint. Phones fire resize when the
  // browser bar collapses or the keyboard opens, which shouldn't close the drawer.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => {
      const nowMobile = isMobileWidth();
      if (nowMobile === isMobileRef.current) return;
      isMobileRef.current = nowMobile;
      setIsMobile(nowMobile);
      setIsSidebarVisible(!nowMobile && readSidebarPref());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Remember the desktop show/hide choice across reloads
  useEffect(() => {
    if (isMobile) return;
    try {
      localStorage.setItem(SIDEBAR_PREF_KEY, String(isSidebarVisible));
    } catch { /* storage unavailable */ }
  }, [isSidebarVisible, isMobile]);

  // A hidden sidebar is only slid off-screen, so make it inert to keep it out of the tab order
  // and away from screen readers. Keep focus on a control that's still on screen.
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    if (isSidebarVisible) {
      el.removeAttribute('inert');
      // The button that opened it is gone (desktop) or covered (phone), so focus the close button
      if (focusOnOpenRef.current) closeBtnRef.current?.focus();
      focusOnOpenRef.current = false;
      return;
    }
    const hadFocus = el.contains(document.activeElement);
    el.setAttribute('inert', '');
    if (hadFocus) (isMobile ? moreBtnRef : showBtnRef).current?.focus();
  }, [isSidebarVisible, isMobile]);

  // The open phone drawer is modal: the page behind it can't be focused, read or scrolled
  const isDrawerOpen = isMobile && isSidebarVisible;
  useEffect(() => {
    if (!isDrawerOpen) return undefined;
    const behind = [topBarRef.current, mainRef.current, fabRef.current].filter(Boolean);
    behind.forEach(node => node.setAttribute('inert', ''));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      behind.forEach(node => node.removeAttribute('inert'));
      document.body.style.overflow = prevOverflow;
    };
  }, [isDrawerOpen]);

  // Keep the current page's link in view: it can sit below the fold of a long nav
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector('.nav-item.active');
    if (!active) return;
    const navBox = nav.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    if (box.top < navBox.top) {
      nav.scrollTop += box.top - navBox.top;
    } else if (box.bottom > navBox.bottom) {
      nav.scrollTop += box.bottom - navBox.bottom;
    }
  }, [location.pathname, isSidebarVisible]);

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) {
          const closeBtn = overlay.querySelector('.modal-close');
          if (closeBtn) closeBtn.click();
        } else if (isMobile && isSidebarVisible) {
          setIsSidebarVisible(false);
          moreBtnRef.current?.focus();
        }
        setShowShortcutHelp(false);
        return;
      }

      if (document.querySelector('.modal-overlay') || document.querySelector('[role="dialog"]')) return;

      if (e.key === '?') {
        setShowShortcutHelp(prev => !prev);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'q') {
        e.preventDefault();
        setShowQuickCheck(true);
        return;
      }
      if (SHORTCUT_MAP[key]) {
        e.preventDefault();
        navigate(SHORTCUT_MAP[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, isMobile, isSidebarVisible]);

  // ⌘K / Ctrl+K opens global search from anywhere, even while typing in a field
  useEffect(() => {
    const handleSearchKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleSearchKey);
    return () => window.removeEventListener('keydown', handleSearchKey);
  }, []);
  // ────────────────────────────────────────────────────────────

  // Once a day (mornings), opening the app lands on the Morning Plan if today isn't planned yet
  useEffect(() => {
    if (!user || !shouldPromptPlan() || !['/', '/dashboard'].includes(location.pathname)) return;
    markPlanPrompted();
    API.get('/day-plan', { params: { date: localDate() } })
      .then(res => {
        if (res.data.items.length === 0 && res.data.candidates.length > 0) navigate('/plan');
      })
      .catch(() => { });
    // Only on first load: later navigation shouldn't redirect
  }, [user?.id]);

  // Pages open the quick check by dispatching OPEN_EVENT (see focus/quickCheck.js)
  useEffect(() => {
    const open = () => setShowQuickCheck(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const handleLogout = async () => {
    // Wait until the user is cleared, or the login page sends us straight back to the dashboard
    await logout();
    navigate('/login');
  };

  // Pages that aren't in the bottom bar live behind "More", so it lights up for them
  const onBottomNavPage = BOTTOM_NAV.some(({ to }) => pathIsUnder(location.pathname, to));

  const toggleSidebar = () => {
    focusOnOpenRef.current = !isSidebarVisible;
    setIsSidebarVisible(v => !v);
  };

  return (
    <div className={`app-shell ${!isSidebarVisible ? 'sidebar-hidden' : ''}`}>

      {/* First tab stop: jump past the sidebar and top bar (not while the phone drawer is open) */}
      {!isDrawerOpen && (
        <a
          href="#main-content"
          className="skip-link"
          onClick={(e) => {
            e.preventDefault();
            mainRef.current?.focus();
          }}
        >
          Skip to content
        </a>
      )}

      {/* Floating toggle — only when sidebar is hidden on desktop */}
      {!isSidebarVisible && !isMobile && (
        <button
          ref={showBtnRef}
          className="sidebar-toggle-floating"
          onClick={toggleSidebar}
          title="Show Sidebar"
          aria-label="Show sidebar"
          aria-expanded="false"
          aria-controls={SIDEBAR_ID}
        >
          <span aria-hidden="true">☰</span>
        </button>
      )}

      {/* Backdrop — mobile only */}
      {isMobile && isSidebarVisible && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarVisible(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id={SIDEBAR_ID}
        ref={sidebarRef}
        className={`sidebar ${isSidebarVisible ? 'visible' : 'hidden'}`}
        {...(isDrawerOpen ? { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu' } : {})}
      >
        <div className="sidebar-logo">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>GrowthLog</h1>
              <span>Personal Journal</span>
            </div>
            <button
              ref={closeBtnRef}
              className="sidebar-toggle-btn"
              onClick={toggleSidebar}
              title={isMobile ? 'Close menu' : 'Hide Sidebar'}
              aria-label={isMobile ? 'Close menu' : 'Hide sidebar'}
              aria-expanded={isSidebarVisible}
              aria-controls={SIDEBAR_ID}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>

        <nav
          ref={navRef}
          className="sidebar-nav"
          aria-label="Main navigation"
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="nav-group">
              <h2 className="nav-group-label">{group.group}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map((item) => {
                  const { to, icon, label, shortcut } = item;
                  const isActive = isNavItemActive(item, location.pathname);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      title={shortcut ? `${label} (${shortcut})` : label}
                    >
                      <span className="icon" aria-hidden="true">{icon}</span>
                      {label}
                      {shortcut && (
                        <span className="nav-shortcut" aria-hidden="true">{shortcut}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="streak-badge">
            <span className="streak-num">{user?.streak || 0}</span>
            <span className="streak-label">Day Streak</span>
            {user?.streak_shields > 0 && (
              <div className="streak-shields-indicator" title={`${user.streak_shields} Active Streak Shields`}>
                🛡️ {user.streak_shields} Active
              </div>
            )}
          </div>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-profile-link ${isActive ? 'active' : ''}`}
            title={user?.name ? `Profile: ${user.name}` : 'Profile'}
          >
            <span aria-hidden="true" style={{ fontSize: 18, flexShrink: 0 }}>{user?.avatar_emoji || '👤'}</span>
            <span className="nav-profile-name">{user?.name || 'Profile'}</span>
          </NavLink>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-ghost"
              onClick={handleLogout}
              style={{ color: 'rgba(245,240,232,0.6)', flex: 1, justifyContent: 'center', fontSize: 13 }}
            >
              Sign out
            </button>
            {/* Phones have no keyboard, so they don't get the shortcut help */}
            {!isMobile && (
            <button
              className="sidebar-shortcuts-btn"
              onClick={() => setShowShortcutHelp(true)}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              ?
            </button>
            )}
          </div>
        </div>
      </aside>

      {/* Top Navbar with Notification Bell */}
      <div className="top-navbar" ref={topBarRef}>
        <button
          className="nav-bell-btn nav-search-btn"
          onClick={() => setShowSearch(true)}
          title="Search (⌘K / Ctrl+K)"
          aria-label="Search"
        >
          ⌕
        </button>
        <div className="nav-bell-container" ref={bellContainerRef}>
          <button
            className="nav-bell-btn"
            onClick={() => setShowNotifications(prev => !prev)}
            title="Notifications"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            aria-expanded={showNotifications}
          >
            🔔
            {unreadCount > 0 && (
              <span className="nav-bell-badge pulse">{unreadCount}</span>
            )}
          </button>
          
          {/* Notifications Dropdown Tray */}
          {showNotifications && (
            <div className="activity-tray-dropdown">
              <div className="activity-tray-header">
                <h4>Notifications</h4>
                {unreadCount > 0 && (
                  <button className="activity-tray-clear-btn" onClick={handleMarkAllAsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="activity-tray-body">
                {activeNotifications.length === 0 ? (
                  <div className="activity-tray-empty">
                    No new notifications. You're all caught up! ✨
                  </div>
                ) : (
                  activeNotifications.map(notification => {
                    const isUnread = !readNotificationIds.includes(notification.id);
                    return (
                      <div
                        key={notification.id}
                        className={`notification-item ${isUnread ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={`notification-icon-wrapper ${notification.type}`}>
                          {notification.icon}
                        </div>
                        <div className="notification-content">
                          <div className="notification-title">{notification.title}</div>
                          <div className="notification-message">{notification.message}</div>
                        </div>
                        <button
                          className="notification-dismiss-btn"
                          onClick={(e) => handleDismissNotification(e, notification.id)}
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className={`main-content ${!isSidebarVisible ? 'expanded' : ''}`}
      >
        {!user?.is_verified && (
          <div style={{
            margin: 'clamp(16px, 4vw, 24px)',
            marginBottom: 0,
            padding: '16px 20px',
            background: 'var(--rust)',
            color: 'white',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 12px rgba(181, 91, 57, 0.2)',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                Verify your email address ✦
              </div>
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
        <TimezoneBanner />
        <Outlet />
      </main>

      {/* ── "Should I do this?" quick check ───────────────────── */}
      <button
        ref={fabRef}
        className="qc-fab"
        onClick={() => setShowQuickCheck(true)}
        title="Should I do this? (Q)"
        aria-label="Should I do this? Quick check"
      >
        🧭
      </button>
      {showQuickCheck && <QuickCheckModal onClose={() => setShowQuickCheck(false)} />}
      {showSearch && <CommandPalette pages={NAV} onClose={() => setShowSearch(false)} />}

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {BOTTOM_NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <span className="bn-icon" aria-hidden="true">{icon}</span>
            {label}
          </NavLink>
        ))}
        <button
          ref={moreBtnRef}
          onClick={toggleSidebar}
          className={isSidebarVisible || !onBottomNavPage ? 'active' : ''}
          aria-label="More pages"
          aria-expanded={isSidebarVisible}
          aria-controls={SIDEBAR_ID}
        >
          <span className="bn-icon" aria-hidden="true">☰</span>
          More
        </button>
      </nav>

      {/* ── Keyboard shortcut help modal ──────────────────────── */}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 24px' }}>
              {NAV.filter(n => n.shortcut).map(({ label, shortcut, icon }) => (
                <div key={shortcut} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1px solid rgba(13,13,13,0.04)'
                }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: 13,
                    background: 'var(--mist)', borderRadius: 6,
                    padding: '3px 8px', fontWeight: 700, color: 'var(--ink)',
                    border: '1px solid rgba(13,13,13,0.1)',
                  }}>{shortcut}</span>
                  <span style={{ fontSize: 14 }}>{icon} {label}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid rgba(13,13,13,0.04)'
              }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 13, background: 'var(--mist)',
                  borderRadius: 6, padding: '3px 8px', fontWeight: 700,
                  color: 'var(--ink)', border: '1px solid rgba(13,13,13,0.1)'
                }}>Esc</span>
                <span style={{ fontSize: 14 }}>Close modal / dialog</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid rgba(13,13,13,0.04)'
              }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 13, background: 'var(--mist)',
                  borderRadius: 6, padding: '3px 8px', fontWeight: 700,
                  color: 'var(--ink)', border: '1px solid rgba(13,13,13,0.1)'
                }}>Q</span>
                <span style={{ fontSize: 14 }}>🧭 Should I do this? (quick check)</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid rgba(13,13,13,0.04)'
              }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 13, background: 'var(--mist)',
                  borderRadius: 6, padding: '3px 8px', fontWeight: 700,
                  color: 'var(--ink)', border: '1px solid rgba(13,13,13,0.1)'
                }}>⌘K</span>
                <span style={{ fontSize: 14 }}>⌕ Search everything (Ctrl+K)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 13, background: 'var(--mist)',
                  borderRadius: 6, padding: '3px 8px', fontWeight: 700,
                  color: 'var(--ink)', border: '1px solid rgba(13,13,13,0.1)'
                }}>?</span>
                <span style={{ fontSize: 14 }}>Toggle this help</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}