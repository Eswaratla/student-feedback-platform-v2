import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function StaffDepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDepartments()
      .then(setDepartments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="portal-page">
      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <h2>Departments</h2>
            <p>NexGen University departments and their degree programs.</p>
          </div>
          <Link to="/staff/dashboard" className="card-link">← Back to dashboard</Link>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="portal-card"><p>Loading departments...</p></section>
      ) : (
        departments.map((dept) => (
          <section key={dept.id} className="portal-card">
            <div className="portal-section-header">
              <div>
                <h3>{dept.name}</h3>
                <p className="portal-meta">{dept.description}</p>
              </div>
              <Link to={`/staff/reports/area/${dept.id}`} className="card-link">
                View reports →
              </Link>
            </div>

            <div className="portal-stats portal-stats-3">
              <article className="portal-stat">
                <strong>{dept.programs?.length || 0}</strong>
                <span>Programs</span>
              </article>
              <article className="portal-stat">
                <strong>{dept.surveyCount || 0}</strong>
                <span>Surveys</span>
              </article>
              <article className="portal-stat">
                <strong>{dept.responseCount || 0}</strong>
                <span>Responses</span>
              </article>
            </div>

            <ul className="dept-tree-programs">
              {(dept.programs || []).map((program) => (
                <li key={program.id}>
                  {program.code} — {program.name}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
