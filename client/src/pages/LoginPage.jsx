import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TEMP_LOGINS, checkTempLogin } from '../config/tempCredentials';

const TABS = [
  { id: 'student', label: 'Student' },
  { id: 'staff', label: 'Staff' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loginStudent, loginStaff } = useAuth();
  const [activeTab, setActiveTab] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }

  if (user?.role === 'staff') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  function switchTab(tabId) {
    setActiveTab(tabId);
    setEmail('');
    setPassword('');
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const role = activeTab;

    if (!checkTempLogin(role, email, password)) {
      setError('Invalid email or password. Use the temporary login details below.');
      return;
    }

    if (role === 'student') {
      loginStudent({
        email,
        name: TEMP_LOGINS.student.name,
      });
      navigate('/student/dashboard');
      return;
    }

    loginStaff({
      email,
      name: TEMP_LOGINS.staff.name,
    });
    navigate('/staff/dashboard');
  }

  const isStudent = activeTab === 'student';
  const demoAccount = TEMP_LOGINS[activeTab];

  return (
    <section className="page-section">
      <div className="container narrow">
        <p className="eyebrow">Portal access</p>
        <h1>Log in</h1>
        <p className="page-intro">
          Sign in as a student or staff member to access your NexGen University account.
        </p>

        <div className="demo-login-box">
          <strong>Temporary login (for testing)</strong>
          <p>
            <span>Email:</span> {demoAccount.email}
          </p>
          <p>
            <span>Password:</span> {demoAccount.password}
          </p>
        </div>

        <div className="login-tabs" role="tablist" aria-label="Login type">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`login-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => switchTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          <label>
            {isStudent ? 'Student email' : 'Staff email'}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={demoAccount.email}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          <button type="submit" className="btn btn-primary btn-full">
            {isStudent ? 'Log in as student' : 'Log in as staff'}
          </button>
        </form>

        <p className="form-note">
          {isStudent ? (
            <>
              New student? <Link to="/apply">Apply now</Link> to create your account after
              admission.
            </>
          ) : (
            <>Staff access is provided by the university IT department.</>
          )}
        </p>
      </div>
    </section>
  );
}
