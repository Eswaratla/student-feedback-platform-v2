import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../../api';

const YEAR_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgraduate'];
const SEMESTERS = ['Semester 1', 'Semester 2'];

function currentAcademicYear() {
  return String(new Date().getFullYear());
}

const EMPTY_FORM = {
  name: '',
  email: '',
  departmentId: '',
  courseId: '',
  academicYear: currentAcademicYear(),
  yearLevel: 'Year 1',
  semester: 'Semester 1',
};

export default function StaffStudentFormPage() {
  const { studentId } = useParams();
  const location = useLocation();
  const isNew = !studentId || studentId === 'new';
  const [form, setForm] = useState(EMPTY_FORM);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {});
    api.getCourses().then(setCourses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNew) return;
    const incoming = location.state?.application;
    if (!incoming) return;
    setForm({
      ...EMPTY_FORM,
      name: incoming.name || '',
      email: incoming.email || '',
      departmentId: incoming.departmentId ? String(incoming.departmentId) : '',
      courseId: incoming.courseId ? String(incoming.courseId) : '',
    });
  }, [isNew, location.state]);

  useEffect(() => {
    if (isNew) return;
    api.getManagedStudent(studentId)
      .then((student) => {
        setForm({
          name: student.name || '',
          email: student.email || '',
          departmentId: student.departmentId ? String(student.departmentId) : '',
          courseId: student.courseId ? String(student.courseId) : '',
          academicYear: student.academicYear || currentAcademicYear(),
          yearLevel: student.yearLevel || 'Year 1',
          semester: student.semester || 'Semester 1',
        });
      })
      .catch((err) => setError(err.message));
  }, [isNew, studentId]);

  const filteredCourses = form.departmentId
    ? courses.filter((course) => course.departmentId === Number(form.departmentId))
    : courses;

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      courseId: form.courseId ? Number(form.courseId) : null,
      academicYear: form.academicYear,
      yearLevel: form.yearLevel,
      semester: form.semester,
    };

    try {
      if (isNew) {
        setCreated(await api.createStudentAccount(payload));
      } else {
        await api.updateManagedStudent(studentId, payload);
        setStatus('Student details saved.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div className="portal-page">
        <section className="portal-card">
          <h2>Student created</h2>
          <p>Show these temporary credentials to the student once. They can change the password later in Settings.</p>
        </section>
        <section className="portal-card">
          <p className="form-success">Account created for {created.student.name}.</p>
          <p className="password-notice">
            Student ID: <strong>{created.studentId}</strong><br />
            Initial password: <strong>{created.initialPassword}</strong>
          </p>
          <p className="portal-meta">This password is temporary.</p>
          <div className="portal-form-actions">
            <Link to="/staff/students" className="btn btn-secondary">Back to students</Link>
            <Link to="/staff/students/new" className="btn btn-primary" onClick={() => setCreated(null)}>
              Add another
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <h2>{isNew ? 'Add student' : 'Edit student'}</h2>
            <p>
              {isNew
                ? 'The student ID and initial password are generated automatically.'
                : `Student ID ${studentId} cannot be changed.`}
            </p>
          </div>
          <Link to="/staff/students" className="card-link">← Back to students</Link>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}
      {status && <p className="portal-success">{status}</p>}

      <section className="portal-card portal-form-card">
        <form className="portal-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          </label>
          <label>
            Department
            <select
              value={form.departmentId}
              onChange={(e) => {
                updateField('departmentId', e.target.value);
                updateField('courseId', '');
              }}
            >
              <option value="">Select a department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>
          <label>
            Program / Course
            <select value={form.courseId} onChange={(e) => updateField('courseId', e.target.value)}>
              <option value="">Select a program</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Academic year / Batch
            <input
              value={form.academicYear}
              onChange={(e) => updateField('academicYear', e.target.value)}
              placeholder={currentAcademicYear()}
              required
            />
          </label>
          <label>
            Year level
            <select value={form.yearLevel} onChange={(e) => updateField('yearLevel', e.target.value)} required>
              {YEAR_LEVELS.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            Semester
            <select value={form.semester} onChange={(e) => updateField('semester', e.target.value)} required>
              {SEMESTERS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <div className="portal-form-actions">
            <Link to="/staff/students" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isNew ? 'Create student' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
