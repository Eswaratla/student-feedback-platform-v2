import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  phone: '',
  departmentId: '',
  courseId: '',
  message: '',
};

export default function ApplyPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {});
    api.getCourses().then(setCourses).catch(() => {});
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const filteredCourses = form.departmentId
    ? courses.filter((course) => course.departmentId === Number(form.departmentId))
    : courses;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const created = await api.apply({
        name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        courseId: form.courseId ? Number(form.courseId) : null,
        message: form.message.trim(),
      });
      setResult(created);
    } catch (err) {
      setError(err.message || 'Unable to submit application.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <section className="page-section">
        <div className="container narrow">
          <p className="eyebrow">Admissions</p>
          <h1>Application received</h1>
          <p className="page-intro">
            Thank you, {result.name}. An authorized staff member will create your student account
            if your application is accepted.
          </p>
          <p className="form-note">
            Already a student? <Link to="/login">Login here</Link>.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="container narrow">
        <p className="eyebrow">Admissions</p>
        <h1>Apply Now</h1>
        <p className="page-intro">
          Take the first step toward joining NexGen University. Fill in your details
          below and our admissions team will be in touch.
        </p>

        <form className="form-card" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          <label>
            Full name
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              placeholder="Your full name"
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="you@email.com"
              required
            />
          </label>

          <label>
            Phone
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+61 ..."
            />
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
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Program
            <select
              value={form.courseId}
              onChange={(e) => updateField('courseId', e.target.value)}
            >
              <option value="">Select a program</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Why do you want to join NexGen University?
            <textarea
              rows={4}
              value={form.message}
              onChange={(e) => updateField('message', e.target.value)}
              placeholder="Tell us about your goals..."
            />
          </label>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit application'}
          </button>
        </form>

        <p className="form-note">
          Already a student? <Link to="/login">Login here</Link>.
        </p>
      </div>
    </section>
  );
}
