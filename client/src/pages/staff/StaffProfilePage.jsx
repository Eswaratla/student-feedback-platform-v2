import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import PasswordChangeForm from '../../components/PasswordChangeForm';

export default function StaffProfilePage() {
  const { user, updateProfile } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    jobTitle: user?.jobTitle || 'Feedback Administrator',
    phone: user?.phone || '',
    emailAlerts: user?.emailAlerts ?? true,
    surveyClosingAlerts: user?.surveyClosingAlerts ?? true,
    weeklySummary: user?.weeklySummary ?? false,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {});
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    updateProfile(form);
    setMessage('Profile settings saved.');
  }

  return (
    <div className="portal-page">
      <section className="portal-card">
        <h2>Profile settings</h2>
        <p>Manage your staff account details, department, and notification preferences.</p>
      </section>

      <section className="portal-card portal-form-card">
        {message && <p className="portal-success">{message}</p>}

        <form onSubmit={handleSubmit} className="portal-form">
          <h3>Account details</h3>

          <label>
            Staff ID
            <input type="text" value={user?.staffId || user?.loginId || ''} readOnly />
          </label>

          <label>
            Full name
            <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
          </label>

          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          </label>

          <label>
            Department
            <select value={form.department} onChange={(e) => updateField('department', e.target.value)}>
              <option value="">All departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Job title
            <input
              value={form.jobTitle}
              onChange={(e) => updateField('jobTitle', e.target.value)}
              placeholder="e.g. Academic Advisor"
            />
          </label>

          <label>
            Phone
            <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+61 ..." />
          </label>

          <h3>Notifications</h3>

          <label className="portal-checkbox">
            <input
              type="checkbox"
              checked={form.emailAlerts}
              onChange={(e) => updateField('emailAlerts', e.target.checked)}
            />
            Email me when new student responses are submitted
          </label>

          <label className="portal-checkbox">
            <input
              type="checkbox"
              checked={form.surveyClosingAlerts}
              onChange={(e) => updateField('surveyClosingAlerts', e.target.checked)}
            />
            Remind me before survey closing dates
          </label>

          <label className="portal-checkbox">
            <input
              type="checkbox"
              checked={form.weeklySummary}
              onChange={(e) => updateField('weeklySummary', e.target.checked)}
            />
            Send a weekly feedback summary report
          </label>

          <button type="submit" className="btn btn-primary">Save settings</button>
        </form>
      </section>

      <section className="portal-card portal-form-card">
        <PasswordChangeForm />
      </section>
    </div>
  );
}
