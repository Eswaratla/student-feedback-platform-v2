import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function StudentSettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [departmentId, setDepartmentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {});
    api.getCourses().then(setCourses).catch(() => {});
  }, []);

  useEffect(() => {
    api.getStudentProfile(user.email)
      .then((profile) => {
        if (profile.name) setName(profile.name);
        setDepartmentId(profile.departmentId ? String(profile.departmentId) : '');
        setCourseId(profile.courseId ? String(profile.courseId) : '');
      })
      .catch(() => {});
  }, [user.email]);

  const filteredCourses = departmentId
    ? courses.filter((course) => course.departmentId === Number(departmentId))
    : courses;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('');

    try {
      await api.saveStudentProfile(user.email, {
        name,
        departmentId: departmentId ? Number(departmentId) : null,
        courseId: courseId ? Number(courseId) : null,
      });
      setStatus('Settings saved. Your survey list now matches your program.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="portal-page">
      <section className="portal-card">
        <h2>Settings</h2>
        <p>Manage your student portal profile and preferences.</p>
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
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Department
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setCourseId('');
              }}
            >
              <option value="">Not set</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>

          <label>
            Program
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Not set</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </label>

          <p className="portal-meta">
            Your department and program decide which surveys you see. University-wide surveys are
            always shown.
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
    </div>
  );
}
