import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import DepartmentPieChart from '../../components/DepartmentPieChart';
import ResponseTrendChart from '../../components/ResponseTrendChart';

export default function StaffDashboardPage() {
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getDepartments()])
      .then(([dashboard, depts]) => {
        setStats(dashboard);
        setDepartments(depts);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="portal-card"><p className="form-error">{error}</p></div>;
  if (!stats) return <div className="portal-card"><p>Loading dashboard...</p></div>;

  return (
    <div className="portal-page">
      <section className="portal-card portal-welcome">
        <h2>Staff dashboard</h2>
        <p>Overview of feedback across departments, surveys, responses, and reports.</p>
      </section>

      <div className="portal-stats portal-stats-3">
        <Link to="/staff/departments" className="portal-stat">
          <strong>{stats.totalDepartments}</strong>
          <span>Departments</span>
        </Link>
        <Link to="/staff/departments" className="portal-stat">
          <strong>{stats.totalCourses}</strong>
          <span>Programs</span>
        </Link>
        <Link to="/staff/responses" className="portal-stat">
          <strong>{stats.totalResponses}</strong>
          <span>Responses</span>
        </Link>
      </div>

      <div className="portal-stats-insights">
        <article className="portal-stat portal-stat-chart">
          <DepartmentPieChart
            departments={departments}
            centerLabel={stats.averageRating || '—'}
          />
          <span>Average rating</span>
        </article>

        <article className="portal-stat portal-stat-trend">
          <div className="portal-stat-trend-header">
            <span>Response trend</span>
            <p className="portal-meta">Last 7 days</p>
          </div>
          <ResponseTrendChart data={stats.responseTrend || []} />
        </article>
      </div>

      <section className="portal-card">
        <div className="portal-section-header">
          <h3>Department reports</h3>
          <Link to="/staff/reports" className="card-link">View all →</Link>
        </div>
        <ul className="dept-tree">
          {departments.map((dept) => (
            <li key={dept.id} className="dept-tree-item">
              <Link to={`/staff/reports/area/${dept.id}`} className="dept-tree-toggle">
                <span>{dept.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="portal-card">
        <h3>Quick access</h3>
        <div className="portal-actions-grid">
          <Link to="/staff/surveys" className="portal-action-card"><strong>Surveys</strong><p>Manage feedback surveys and forms.</p></Link>
          <Link to="/staff/reports" className="portal-action-card"><strong>Reports</strong><p>View student feedback by department and export summaries.</p></Link>
        </div>
      </section>
    </div>
  );
}
