import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

const EMPTY_FORM = {
  name: '',
  email: '',
  jobTitle: '',
  isAdmin: false,
};

export default function StaffAccountsPage() {
  const { isAdmin } = useAuth();
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [resetCredentials, setResetCredentials] = useState(null);

  async function loadStaff() {
    try {
      setStaff(await api.listStaffAccounts());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (isAdmin) loadStaff();
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      setCreated(await api.createStaffAccount(form));
      setResetCredentials(null);
      setForm(EMPTY_FORM);
      loadStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(member) {
    try {
      const result = await api.resetStaffPassword(member.staffId);
      setResetCredentials({
        name: member.name,
        loginId: result.staffId,
        initialPassword: result.initialPassword,
      });
      setCreated(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleStatus(member) {
    const nextStatus = member.accountStatus === 'inactive' ? 'active' : 'inactive';
    try {
      await api.setStaffAccountStatus(member.staffId, nextStatus);
      loadStaff();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="portal-page">
      <section className="portal-card">
        <h2>Staff accounts</h2>
        <p>Administrators can add and deactivate staff accounts. IDs and passwords are generated automatically.</p>
      </section>

      {error && <p className="form-error">{error}</p>}

      {created && (
        <section className="portal-card">
          <p className="form-success">Staff account created for {created.staff.name}.</p>
          <p className="password-notice">
            Staff ID: <strong>{created.staffId}</strong><br />
            Initial password: <strong>{created.initialPassword}</strong>
          </p>
          <p className="portal-meta">This password is temporary. Staff can change it in Profile settings.</p>
        </section>
      )}

      {resetCredentials && (
        <section className="portal-card">
          <p className="form-success">Password reset for {resetCredentials.name}.</p>
          <p className="password-notice">
            Staff ID: <strong>{resetCredentials.loginId}</strong><br />
            Temporary password: <strong>{resetCredentials.initialPassword}</strong>
          </p>
          <p className="portal-meta">Show this password once. Staff can change it in Profile settings.</p>
        </section>
      )}

      <section className="portal-card portal-form-card">
        <form className="portal-form" onSubmit={handleSubmit}>
          <h3>Add staff</h3>
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Job title
            <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </label>
          <label className="portal-checkbox">
            <input
              type="checkbox"
              checked={form.isAdmin}
              onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
            />
            Grant administrator access
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create staff account'}
          </button>
        </form>
      </section>

      <div className="portal-list">
        {staff.map((member) => (
          <article key={member.staffId} className="portal-list-item">
            <div>
              <h4>{member.name}</h4>
              <p className="portal-meta">
                {member.staffId}
                {member.email ? ` · ${member.email}` : ''}
                {member.jobTitle ? ` · ${member.jobTitle}` : ''}
                {member.isAdmin ? ' · Admin' : ''}
              </p>
              <span className={`portal-tag ${member.accountStatus === 'inactive' ? 'pending' : 'completed'}`}>
                {member.accountStatus === 'inactive' ? 'Deactivated' : 'Active'}
              </span>
            </div>
            <div className="portal-item-actions">
              <button type="button" className="btn btn-secondary" onClick={() => resetPassword(member)}>
                Reset password
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => toggleStatus(member)}>
                {member.accountStatus === 'inactive' ? 'Reactivate' : 'Deactivate'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
