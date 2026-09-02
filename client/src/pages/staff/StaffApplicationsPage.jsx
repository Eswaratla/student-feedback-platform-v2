import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function StaffApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listApplications()
      .then((rows) => {
        setApplications(rows);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="portal-page">
      <section className="portal-card">
        <h2>Applications</h2>
        <p>Public Apply Now submissions. Create a student account if the applicant is accepted.</p>
      </section>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="portal-card"><p>Loading applications...</p></section>
      ) : applications.length === 0 ? (
        <section className="portal-card portal-empty">
          <p>No applications have been submitted yet.</p>
        </section>
      ) : (
        <div className="portal-list">
          {applications.map((application) => (
            <article key={application.id} className="portal-list-item">
              <div>
                <h4>{application.name}</h4>
                <p className="portal-meta">
                  {application.email}
                  {application.phone ? ` · ${application.phone}` : ''}
                  {application.departmentName ? ` · ${application.departmentName}` : ''}
                  {application.courseCode ? ` · ${application.courseCode}` : ''}
                  {application.createdAt ? ` · ${application.createdAt}` : ''}
                </p>
                {application.message && <p>{application.message}</p>}
              </div>
              <div className="portal-item-actions">
                <Link
                  to="/staff/students/new"
                  state={{ application }}
                  className="btn btn-primary"
                >
                  Create student
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
