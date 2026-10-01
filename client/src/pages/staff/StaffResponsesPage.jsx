import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import DownloadButton from '../../components/DownloadButton';

function responderLabel(item) {
  if (item.isAnonymous) return 'Anonymous student';
  return item.studentName || 'Student';
}

function formatAnswerValue(answer) {
  if (answer.questionType === 'rating') {
    if (answer.answerRating === null || answer.answerRating === undefined) {
      return '';
    }
    return `${answer.answerRating} / 5`;
  }

  if (answer.questionType === 'text' || answer.questionType === 'choice') {
    return answer.answerText ?? '';
  }

  if (answer.answerRating !== null && answer.answerRating !== undefined) {
    return `${answer.answerRating} / 5`;
  }

  return answer.answerText ?? '';
}

export default function StaffResponsesPage() {
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAllResponses()
      .then(setResponses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="portal-page">
      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <h2>All responses</h2>
            <p>Every submitted survey and feedback response, across all departments and courses.</p>
          </div>
          <div className="portal-item-actions">
            <Link to="/staff/dashboard" className="card-link">← Back to dashboard</Link>
            <DownloadButton type="responses" className="btn btn-secondary">
              Download responses
            </DownloadButton>
          </div>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="portal-card"><p>Loading responses...</p></section>
      ) : responses.length === 0 ? (
        <section className="portal-card portal-empty">
          <p>No student responses yet.</p>
        </section>
      ) : (
        <section className="portal-card">
          <p className="portal-meta">
            {responses.length} {responses.length === 1 ? 'response' : 'responses'}.
            Anonymous submissions hide the student’s name and email.
          </p>
          <div className="portal-list">
            {responses.map((item) => (
              <article key={item.id} className="portal-list-item portal-feedback-item">
                <div>
                  <h3>{responderLabel(item)}</h3>
                  <p className="portal-meta">
                    {item.surveyTitle}
                    {item.submittedAt ? ` · ${item.submittedAt}` : ''}
                    {item.departmentName ? ` · ${item.departmentName}` : ''}
                    {!item.isAnonymous && item.studentCourseCode
                      ? ` · ${item.studentCourseCode}`
                      : item.courseCode
                        ? ` · ${item.courseCode}`
                        : ''}
                  </p>
                  {item.isAnonymous && (
                    <span className="portal-tag pending">Anonymous</span>
                  )}
                  {item.answers?.map((answer, index) => (
                    <p key={index}>
                      <strong>{answer.questionText}: </strong>
                      {formatAnswerValue(answer)}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
