import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import DownloadButton from '../../components/DownloadButton';

export default function StaffReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSurveyReport(id)
      .then(setReport)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="portal-card">
        <h2>Report not found</h2>
        <p className="form-error">{error}</p>
        <Link to="/staff/reports" className="btn btn-primary">Back to reports</Link>
      </div>
    );
  }

  if (!report) {
    return <div className="portal-card"><p>Loading report...</p></div>;
  }

  return (
    <div className="portal-page">
      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <h2>{report.survey.title}</h2>
            <p>{report.survey.description}</p>
          </div>
          <div className="portal-item-actions">
            <Link to="/staff/reports" className="card-link">← Back to reports</Link>
            <DownloadButton type="survey" id={report.survey.id} className="btn btn-secondary">
              Download report
            </DownloadButton>
          </div>
        </div>
        <p className="portal-meta">Total responses: {report.totalResponses}</p>
      </section>

      {report.questionSummaries.map((question) => (
        <section key={question.id} className="portal-card">
          <h3>{question.questionText}</h3>
          <p className="portal-meta">
            Type: {question.questionType} · Responses: {question.responseCount}
          </p>

          {question.summaryType === 'rating' && (
            <div className="report-highlight">
              <strong>{question.averageRating || '—'}</strong>
              <span>Average rating (out of 5)</span>
            </div>
          )}

          {question.summaryType === 'choice' && (
            <div className="portal-list">
              {Object.entries(question.choiceCounts).map(([choice, count]) => (
                <article key={choice} className="portal-list-item">
                  <div>
                    <h3>{choice}</h3>
                  </div>
                  <span className="portal-rating">{count}</span>
                </article>
              ))}
            </div>
          )}

          {question.summaryType === 'text' && (
            <div className="portal-list">
              {question.textResponses.length === 0 ? (
                <p className="portal-empty-text">No text responses yet.</p>
              ) : (
                question.textResponses.map((item, index) => (
                  <article key={`${item.responseId}-${index}`} className="portal-list-item">
                    <p>{item.text}</p>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      ))}

      <section className="portal-card">
        <h3>Recent submissions</h3>
        {report.recentSubmissions.length === 0 ? (
          <p className="portal-empty-text">No submissions yet.</p>
        ) : (
          <div className="portal-list">
            {report.recentSubmissions.map((item) => (
              <article key={item.id} className="portal-list-item">
                <div>
                  <h3>{item.isAnonymous ? 'Anonymous student' : (item.studentName || 'Student')}</h3>
                  <p className="portal-meta">{item.submittedAt}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
