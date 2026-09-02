import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Logo from '../components/Logo';

const NAV_ITEMS = [
  { to: '/student/dashboard', label: 'Dashboard', end: true },
  { to: '/student/survey', label: 'Survey' },
  { to: '/student/my-feedback', label: 'Completed surveys' },
  { to: '/student/settings', label: 'Settings' },
];

export default function StudentPortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== 'student') {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // Clear the local session even if the API is already signed out.
    }
    logout();
    navigate('/login');
  }

  return (
    <div className="portal-app">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <Logo size={40} showText={false} />
          <div>
            <strong>Student Portal</strong>
            <span>NexGen University</span>
          </div>
        </div>

        <nav className="portal-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `portal-nav-link ${isActive ? 'active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button type="button" className="portal-nav-link portal-logout" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <div>
            <p className="portal-eyebrow">Welcome back</p>
            <h1>{user.name}</h1>
          </div>
          <span className="portal-badge">Student</span>
        </header>

        <div className="portal-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
