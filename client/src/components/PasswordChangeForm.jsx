import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function PasswordChangeForm() {
  const { user, login } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const account = await api.changePassword({ currentPassword, newPassword });
      login({ ...account, token: user.token });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatus('Password updated.');
    } catch (err) {
      setError(err.message || 'Unable to update password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="portal-form" onSubmit={handleSubmit}>
      <h3>Change password</h3>
      {error && <p className="form-error">{error}</p>}
      {status && <p className="form-success">{status}</p>}
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
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Saving...' : 'Update password'}
      </button>
    </form>
  );
}
