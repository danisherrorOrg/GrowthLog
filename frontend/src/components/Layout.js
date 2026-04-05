import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', icon: '◈', label: 'Dashboard' },
  { to: '/log', icon: '✦', label: 'Daily Log' },
  { to: '/history', icon: '📅', label: 'Log History' },
  { to: '/growth', icon: '◎', label: 'Growth' },
  { to: '/goals', icon: '◇', label: 'Goals' },
  { to: '/manifestations', icon: '✧', label: 'Manifestations' },
  { to: '/snapshots', icon: '○', label: 'Snapshots' },
  { to: '/categories', icon: '▦', label: 'Categories' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>GrowthLog</h1>
          <span>Personal Journal</span>
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

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
