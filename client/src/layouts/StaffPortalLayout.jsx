import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const MAIN_NAV = [
  { to: '/staff/dashboard', label: 'Dashboard', end: true },
  { to: '/staff/surveys', label: 'Surveys' },
  { to: '/staff/reports', label: 'Reports' },
  { to: '/staff/profile', label: 'Profile settings' },
];

export default function StaffPortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== 'staff') {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="portal-app staff-portal">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <Logo size={40} showText={false} />
          <div>
            <strong>Staff Portal</strong>
            <span>Feedback management</span>
          </div>
        </div>

        <nav className="portal-nav">
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `portal-nav-link ${isActive ? 'active' : ''}`}
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
            <p className="portal-eyebrow">Staff administration</p>
            <h1>{user.name}</h1>
          </div>
          <span className="portal-badge staff-badge">Staff</span>
        </header>

        <div className="portal-content portal-content-wide">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
