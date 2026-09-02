import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import PasswordChangeForm from '../../components/PasswordChangeForm';

export default function StudentSettingsPage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStudentProfile(user.email)
      .then((nextProfile) => {
        setProfile(nextProfile);
        if (nextProfile.name) setName(nextProfile.name);
      })
      .catch(() => {});
  }, [user.email]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('');

    try {
      const saved = await api.saveStudentProfile(user.email, { name });
      setProfile(saved);
      updateProfile({ name: saved.name });
      setStatus('Settings saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="portal-page">
      <section className="portal-card">
        <h2>Settings</h2>
        <p>Manage your student portal profile and password.</p>
      </section>

      {error && <p className="form-error">{error}</p>}
      {status && <p className="portal-meta">{status}</p>}

      <section className="portal-card portal-form-card">
        <form onSubmit={handleSubmit} className="portal-form">
          <label>
            Student ID
            <input type="text" value={user.studentId || user.loginId || ''} readOnly />
          </label>

          <label>
            Display name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label>
            Email
            <input type="email" value={user.email || ''} readOnly />
          </label>

          <label>
            Department
            <input type="text" value={profile?.departmentName || 'Assigned by staff'} readOnly />
          </label>

          <label>
            Program
            <input
              type="text"
              value={
                profile?.courseCode
                  ? `${profile.courseCode} — ${profile.courseName}`
                  : profile?.courseName || 'Assigned by staff'
              }
              readOnly
            />
          </label>

          <p className="portal-meta">
            Department and program are set by staff. They decide which surveys you see.
            University-wide surveys are always shown.
          </p>

          <label className="portal-checkbox">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
            />
            Email me when new surveys are available
          </label>

          <button type="submit" className="btn btn-primary">
            Save settings
          </button>
        </form>
      </section>

      <section className="portal-card portal-form-card">
        <PasswordChangeForm />
      </section>
    </div>
  );
}
