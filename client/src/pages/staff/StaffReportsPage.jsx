import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import DownloadButton from '../../components/DownloadButton';
import AiInsightsPanel from '../../components/AiInsightsPanel';

const UNIVERSITY_KEY = 'university';

function formatRating(value) {
  return value ? Math.round(value * 10) / 10 : '—';
}

function getSurveyScopeLabel(survey) {
  if (survey.courseCode && survey.courseName) {
    return `${survey.courseCode} — ${survey.courseName}`;
  }
  if (survey.courseCode) return survey.courseCode;
  return 'Department-wide';
}

function buildInsightBoards(surveys, departments, courses) {
  const courseDepartment = new Map(courses.map((course) => [course.id, course.departmentId]));

  const resolveKey = (survey) => {
    if (survey.departmentId) return survey.departmentId;
    if (survey.courseId && courseDepartment.has(survey.courseId)) {
      return courseDepartment.get(survey.courseId);
    }
    return UNIVERSITY_KEY;
  };

  const boards = departments.map((dept) => ({
    key: dept.id,
    name: dept.name,
    description: dept.description,
    reportSurvey: null,
    surveys: [],
  }));

  boards.push({
    key: UNIVERSITY_KEY,
    name: 'University-wide',
    description: 'Feedback that is not tied to a single department or program.',
    reportSurvey: null,
    surveys: [],
  });

  const boardByKey = new Map(boards.map((board) => [board.key, board]));

  surveys.forEach((survey) => {
    const board = boardByKey.get(resolveKey(survey));
    if (!board) return;

    if (survey.staffOnly) {
      board.reportSurvey = survey;
    } else {
      board.surveys.push(survey);
    }
  });

  return boards.map((board) => {
    const contributing = board.reportSurvey ? [...board.surveys, board.reportSurvey] : board.surveys;
    const responseCount = contributing.reduce((sum, item) => sum + (item.responseCount || 0), 0);
    const rated = contributing.filter((item) => item.averageRating > 0);
    const averageRating = rated.length
      ? rated.reduce((sum, item) => sum + item.averageRating, 0) / rated.length
      : 0;

    return {
      ...board,
      surveys: [...board.surveys].sort((a, b) => a.title.localeCompare(b.title)),
      surveyCount: board.surveys.length,
      responseCount,
      averageRating,
    };
  });
}

export default function StaffReportsPage() {
  const [report, setReport] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getUniversityReport(), api.getSurveys(), api.getDepartments(), api.getCourses()])
      .then(([universityReport, surveyList, departmentList, courseList]) => {
        setReport(universityReport);
        setSurveys(surveyList);
        setDepartments(departmentList);
        setCourses(courseList);
      })
      .catch((err) => setError(err.message));
  }, []);

  const insightBoards = useMemo(
    () => buildInsightBoards(surveys, departments, courses),
    [surveys, departments, courses]
  );

  const overallFromBoards = useMemo(() => {
    const rated = insightBoards.filter((board) => board.averageRating > 0);
    if (!rated.length) return 0;
    const totalResponses = rated.reduce((sum, board) => sum + (board.responseCount || 0), 0);
    if (totalResponses > 0) {
      return rated.reduce(
        (sum, board) => sum + board.averageRating * (board.responseCount || 0),
        0
      ) / totalResponses;
    }
    return rated.reduce((sum, board) => sum + board.averageRating, 0) / rated.length;
  }, [insightBoards]);

  if (error) return <div className="portal-card"><p className="form-error">{error}</p></div>;
  if (!report) return <div className="portal-card"><p>Loading university report...</p></div>;

  return (
    <div className="portal-page">
      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <h2>Reports</h2>
            <p>Overall university feedback statistics and department summaries.</p>
          </div>
          <DownloadButton type="university" className="btn btn-primary">
            Download university report
          </DownloadButton>
        </div>
      </section>

      <div className="portal-stats portal-stats-4">
        <article className="portal-stat"><strong>{report.totalDepartments}</strong><span>Departments</span></article>
        <article className="portal-stat"><strong>{report.totalCourses}</strong><span>Courses</span></article>
        <article className="portal-stat"><strong>{report.totalResponses}</strong><span>Responses</span></article>
        <article className="portal-stat"><strong>{formatRating(overallFromBoards)}</strong><span>Avg rating</span></article>
      </div>

      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <h3>Overall ratings</h3>
            <p className="portal-meta">
              Average ratings from Information Systems, Business, Medicine, and University-wide feedback.
            </p>
          </div>
        </div>
        <div className="portal-stats portal-stats-4">
          {insightBoards.map((board) => (
            <article key={board.key} className="portal-stat">
              <strong>{formatRating(board.averageRating)}</strong>
              <span>{board.name}</span>
            </article>
          ))}
        </div>
      </section>

      <AiInsightsPanel />

      {insightBoards.map((board) => (
        <section key={board.key} className="portal-card">
          <div className="portal-section-header">
            <div>
              <h3>{board.name}</h3>
              <p className="portal-meta">{board.description}</p>
            </div>
            <Link
              to={
                board.key === UNIVERSITY_KEY
                  ? '/staff/reports/area/university'
                  : `/staff/reports/area/${board.key}`
              }
              className="card-link"
            >
              View reports →
            </Link>
          </div>

          <div className="portal-stats portal-stats-3">
            <article className="portal-stat">
              <strong>{board.surveyCount}</strong>
              <span>Surveys</span>
            </article>
            <article className="portal-stat">
              <strong>{board.responseCount}</strong>
              <span>Responses</span>
            </article>
            <article className="portal-stat">
              <strong>{formatRating(board.averageRating)}</strong>
              <span>Avg rating</span>
            </article>
          </div>

          {board.surveys.length === 0 ? (
            <p className="portal-empty-text">No surveys yet for this area.</p>
          ) : (
            <div className="portal-list">
              {board.surveys.map((survey) => (
                <article key={survey.id} className="portal-list-item">
                  <div>
                    <h4>{survey.title}</h4>
                    <p className="portal-meta">
                      {getSurveyScopeLabel(survey)}
                      {` · ${survey.responseCount} responses`}
                    </p>
                  </div>
                  <div className="portal-item-actions">
                    <Link to={`/staff/reports/survey/${survey.id}`} className="btn btn-secondary">
                      View report
                    </Link>
                    <DownloadButton type="survey" id={survey.id} className="btn btn-secondary btn-small" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
