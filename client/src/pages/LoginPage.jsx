import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const TABS = [
  { id: 'student', label: 'Student' },
  { id: 'staff', label: 'Staff' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('student');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }

  if (user?.role === 'staff') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  function switchTab(tabId) {
    setActiveTab(tabId);
    setLoginId('');
    setPassword('');
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const account = await api.login({
        role: activeTab,
        loginId: loginId.trim().toUpperCase(),
        password,
      });
      login(account);
      navigate(account.role === 'staff' ? '/staff/dashboard' : '/student/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid ID or password.');
    } finally {
      setSubmitting(false);
    }
  }

  const isStudent = activeTab === 'student';
  const idPlaceholder = isStudent ? 'NGUXXXXXXS' : 'NGUXXXXXXF';

  return (
    <section className="page-section">
      <div className="container narrow">
        <p className="eyebrow">Portal access</p>
        <h1>Log in</h1>
        <p className="page-intro">
          Sign in with your NexGen University ID. Students and staff use separate portals.
        </p>

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
            {isStudent ? 'Student ID' : 'Staff ID'}
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value.toUpperCase())}
              placeholder={idPlaceholder}
              autoComplete="username"
              spellCheck="false"
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
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting
              ? 'Signing in...'
              : isStudent
                ? 'Log in as student'
                : 'Log in as staff'}
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
