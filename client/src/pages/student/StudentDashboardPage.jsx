import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ active: 0, completed: 0, pending: 0 });

  useEffect(() => {
    api.getStudentSurveys(user.email)
      .then((surveys) => {
        const completed = surveys.filter((s) => s.status === 'completed').length;
        setStats({
          active: surveys.length,
          completed,
          pending: surveys.length - completed,
        });
      })
      .catch(() => {});
  }, [user.email]);

  return (
    <div className="portal-page">
      <section className="portal-card portal-welcome">
        <h2>Dashboard</h2>
        <p>
          Hello {user.name}, this is your NexGen University student portal. Use the menu
          to complete surveys, review your feedback, and manage your account.
        </p>
      </section>

      <div className="portal-stats">
        <Link to="/student/survey" className="portal-stat">
          <strong>{stats.active}</strong>
          <span>Active surveys</span>
        </Link>
        <Link to="/student/my-feedback" className="portal-stat">
          <strong>{stats.completed}</strong>
          <span>Completed</span>
        </Link>
        <Link to="/student/survey?status=pending" className="portal-stat">
          <strong>{stats.pending}</strong>
          <span>Pending</span>
        </Link>
      </div>
    </div>
  );
}
