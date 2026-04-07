import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

const NAV = [
  { to: '/dashboard', icon: '◈', label: 'Dashboard' },
  { to: '/log', icon: '✦', label: 'Daily Log' },
  { to: '/history', icon: '📅', label: 'Log History' },
  { to: '/growth', icon: '◎', label: 'Growth' },
  { to: '/goals', icon: '◇', label: 'Goals' },
  { to: '/manifestations', icon: '✧', label: 'Manifestations' },
  { to: '/snapshots', icon: '○', label: 'Snapshots' },
  { to: '/categories', icon: '▦', label: 'Categories' },
  { to: '/timeline', icon: '🗓️', label: 'Timeline' },
];

export default function Layout() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Refresh user data (streak, etc.) on every page navigation
  useEffect(() => {
    refreshUser().catch(() => {});
  }, [location.pathname]);

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

      <aside className={`sidebar ${!isSidebarVisible ? 'hidden' : ''}`}>
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

        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="icon">{icon}</span>
              {label}
            </NavLink>
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
          <button className="btn btn-ghost" onClick={handleLogout} style={{ color: 'rgba(245,240,232,0.4)', width: '100%', justifyContent: 'center', fontSize: 13 }}>
            Sign out
          </button>
        </div>
      </aside>

      <main className={`main-content ${!isSidebarVisible ? 'expanded' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
