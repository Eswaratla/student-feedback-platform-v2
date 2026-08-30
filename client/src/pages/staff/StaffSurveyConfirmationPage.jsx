import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../../api';

function formatScheduleDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function audienceMessage(survey) {
  if (survey.courseName) {
    const course = survey.courseCode
      ? `${survey.courseCode} — ${survey.courseName}`
      : survey.courseName;
    return `students enrolled in ${course}`;
  }
  if (survey.departmentName) {
    return `students in the ${survey.departmentName} department`;
  }
  return 'all students at NexGen University';
}

function resolveAction(locationState, survey) {
  if (locationState?.action) return locationState.action;
  if (!survey) return 'draft';
  if (survey.isActive && survey.openingDate) return 'scheduled';
  if (survey.isActive) return 'published';
  return 'draft';
}

export default function StaffSurveyConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const surveyId = Number(id);
  const [survey, setSurvey] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isInteger(surveyId) || surveyId <= 0) {
      setError('Invalid survey.');
      setLoading(false);
      return;
    }

    api.getSurvey(surveyId)
      .then(setSurvey)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [surveyId]);

  if (loading) {
    return <section className="portal-card"><p>Loading survey...</p></section>;
  }

  if (error || !survey) {
    return (
      <div className="portal-page">
        <section className="portal-card">
          <h2>Survey not found</h2>
          <p className="portal-meta">{error || 'This survey may have been removed.'}</p>
          <div className="portal-form-actions">
            <Link to="/staff/surveys/new" className="btn btn-primary">Create survey</Link>
            <Link to="/staff/surveys" className="btn btn-secondary">Back to surveys</Link>
          </div>
        </section>
      </div>
    );
  }

  const action = resolveAction(location.state, survey);
  const audience = audienceMessage(survey);
  const questionCount = survey.questions?.length || 0;
  const isDraft = action === 'draft';
  const isScheduled = action === 'scheduled';

  const heading = isDraft
    ? 'Survey saved as draft'
    : isScheduled
      ? 'Survey scheduled'
      : 'Survey published';

  const summary = isDraft
    ? `This survey is stored on the server and is not visible to students yet. When you are ready, open it and create the survey to publish it to ${audience}.`
    : isScheduled
      ? `This survey will be published to ${audience} from ${formatScheduleDateTime(survey.openingDate)}.`
      : `This survey is now published to the respective students: ${audience}. They can open it in the student portal and submit feedback.`;

  return (
    <div className="portal-page">
      <section className="portal-card survey-result-card">
        <p className={`survey-result-badge ${isDraft ? 'draft' : 'published'}`}>
          {isDraft ? 'Draft saved' : isScheduled ? 'Scheduled' : 'Published'}
        </p>
        <h2>{heading}</h2>
        <p className={isDraft ? 'portal-meta' : 'portal-success'}>{summary}</p>

        <dl className="survey-result-details">
          <div>
            <dt>Title</dt>
            <dd>{survey.title}</dd>
          </div>
          {survey.description ? (
            <div>
              <dt>Description</dt>
              <dd>{survey.description}</dd>
            </div>
          ) : null}
          <div>
            <dt>Audience</dt>
            <dd>{audience}</dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>{questionCount} {questionCount === 1 ? 'question' : 'questions'}</dd>
          </div>
          {survey.openingDate ? (
            <div>
              <dt>Opens</dt>
              <dd>{formatScheduleDateTime(survey.openingDate)}</dd>
            </div>
          ) : null}
          {survey.closingDate ? (
            <div>
              <dt>Closes</dt>
              <dd>{formatScheduleDateTime(survey.closingDate)}</dd>
            </div>
          ) : null}
        </dl>

        <div className="portal-form-actions">
          <Link to={`/staff/surveys/${survey.id}`} className="btn btn-primary">
            {isDraft ? 'Continue editing' : 'View survey'}
          </Link>
          {!isDraft && (
            <Link to={`/staff/reports/survey/${survey.id}`} className="btn btn-secondary">
              View report
            </Link>
          )}
          <Link to="/staff/surveys" className="btn btn-secondary">Back to surveys</Link>
          <Link to="/staff/surveys/new" className="btn btn-secondary">Create another</Link>
        </div>
      </section>
    </div>
  );
}
