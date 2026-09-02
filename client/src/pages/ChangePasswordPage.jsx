import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const account = await api.changePassword({
        role: user.role,
        loginId: user.loginId,
        currentPassword,
        newPassword,
      });
      login({ ...account, token: user.token });
      navigate(account.role === 'staff' ? '/staff/dashboard' : '/student/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to update password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-section">
      <div className="container narrow">
        <p className="eyebrow">Account security</p>
        <h1>Create a new password</h1>
        <p className="page-intro">
          Choose a password that only you know. You can also do this later from Settings.
        </p>

        <div className="password-notice">
          Signed in as <strong>{user.loginId}</strong>. Choose a password that only you know.
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save new password'}
          </button>
        </form>

        <p className="form-note">
          <button type="button" className="text-link" onClick={() => { logout(); navigate('/login'); }}>
            Sign in with a different account
          </button>
        </p>
      </div>
    </section>
  );
}
