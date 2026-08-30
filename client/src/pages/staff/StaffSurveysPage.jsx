import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

function getSurveyScopeLabel(survey) {
  if (survey.courseCode && survey.courseName) {
    return `${survey.courseCode} — ${survey.courseName}`;
  }
  if (survey.courseCode) return survey.courseCode;
  if (survey.departmentName) return survey.departmentName;
  return 'University-wide';
}

function SurveyRow({ survey, onToggleActive, onDelete }) {
  return (
    <article className="portal-list-item">
      <div>
        <h4>{survey.title}</h4>
        {survey.description && <p>{survey.description}</p>}
        <p className="portal-meta">
          {getSurveyScopeLabel(survey)}
          {` · ${survey.responseCount} responses`}
          {survey.openingDate ? ` · Opens ${survey.openingDate}` : ''}
          {survey.closingDate ? ` · Closes ${survey.closingDate}` : ''}
        </p>
        <span className={`portal-tag ${survey.isActive ? 'completed' : 'pending'}`}>
          {survey.isActive ? 'Active' : 'Draft'}
        </span>
      </div>
      <div className="portal-item-actions">
        <Link to={`/staff/reports/survey/${survey.id}`} className="btn btn-secondary">
          View report
        </Link>
        <button type="button" className="btn btn-secondary" onClick={() => onToggleActive(survey)}>
          {survey.isActive ? 'Deactivate' : 'Activate'}
        </button>
        <Link to={`/staff/surveys/${survey.id}`} className="btn btn-secondary">
          Edit
        </Link>
        <button type="button" className="btn btn-outline danger-btn" onClick={() => onDelete(survey.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}

export default function StaffSurveysPage() {
  const [surveys, setSurveys] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const [surveyList, departmentList, courseList] = await Promise.all([
        api.getSurveys(),
        api.getDepartments(),
        api.getCourses(),
      ]);
      setSurveys(surveyList);
      setDepartments(departmentList);
      setCourses(courseList);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleActive(survey) {
    try {
      await api.updateSurvey(survey.id, { isActive: !survey.isActive });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this survey and all responses?')) return;
    try {
      await api.deleteSurvey(id);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredCourses = departmentId
    ? courses.filter((course) => course.departmentId === Number(departmentId))
    : courses;

  const studentSurveys = surveys.filter((survey) => !survey.staffOnly);

  const visibleSurveys = useMemo(() => {
    const courseDepartment = new Map(courses.map((course) => [course.id, course.departmentId]));

    return studentSurveys.filter((survey) => {
      if (courseId || departmentId) {
        if (!survey.isActive) return false;
      }

      if (courseId) {
        return survey.courseId === Number(courseId);
      }

      if (departmentId) {
        if (survey.departmentId === Number(departmentId)) return true;
        if (survey.courseId && courseDepartment.get(survey.courseId) === Number(departmentId)) {
          return true;
        }
        return false;
      }

      return true;
    });
  }, [studentSurveys, courses, departmentId, courseId]);

  const hasFilters = Boolean(departmentId || courseId);
  const emptyMessage = hasFilters
    ? 'No active surveys match this department and course.'
    : 'No surveys yet.';

  return (
    <div className="portal-page">
      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <h2>Surveys &amp; forms</h2>
            <p>Create, edit, and publish student feedback surveys. Department summaries live in Reports.</p>
          </div>
          <Link to="/staff/surveys/new" className="btn btn-primary">
            Create survey
          </Link>
        </div>

        <div className="survey-filters">
          <label>
            Department
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setCourseId('');
              }}
            >
              <option value="">All departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>

          <label>
            Course
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">All courses</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="portal-card"><p>Loading surveys...</p></section>
      ) : visibleSurveys.length === 0 ? (
        <section className="portal-card portal-empty">
          <h3>Active surveys</h3>
          <p>{emptyMessage}</p>
        </section>
      ) : (
        <section className="portal-card">
          <h3>Active surveys</h3>
          <div className="portal-list">
            {visibleSurveys.map((survey) => (
              <SurveyRow
                key={survey.id}
                survey={survey}
                onToggleActive={toggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
