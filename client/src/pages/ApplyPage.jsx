import { useState } from 'react';
import { Link } from 'react-router-dom';

const PROGRAMS = [
  'Undergraduate',
  'Postgraduate',
  'Research / PhD',
  'Short course',
];

export default function ApplyPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    program: PROGRAMS[0],
    message: '',
  });

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    alert('Application submitted! We will connect this to the backend in a later step.');
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
            Program of interest
            <select
              value={form.program}
              onChange={(e) => updateField('program', e.target.value)}
            >
              {PROGRAMS.map((program) => (
                <option key={program} value={program}>
                  {program}
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

          <button type="submit" className="btn btn-primary btn-full">
            Submit application
          </button>
        </form>

        <p className="form-note">
          Already a student? <Link to="/login">Login here</Link>.
        </p>
      </div>
    </section>
  );
}
