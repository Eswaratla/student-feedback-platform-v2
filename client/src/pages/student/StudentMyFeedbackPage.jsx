import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function StudentMyFeedbackPage() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentResponses(user.email)
      .then(setFeedback)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.email]);

  return (
    <div className="portal-page">
      <section className="portal-card">
        <h2>Completed surveys</h2>
        <p>Review the surveys you have already submitted.</p>
      </section>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="portal-card"><p>Loading feedback...</p></section>
      ) : feedback.length === 0 ? (
        <section className="portal-card portal-empty">
          <p>You have not submitted any feedback yet.</p>
        </section>
      ) : (
        <div className="portal-list">
          {feedback.map((item) => (
            <article key={item.id} className="portal-list-item portal-feedback-item">
              <div>
                <h3>{item.surveyTitle}</h3>
                <p className="portal-meta">Submitted on {item.submittedAt}</p>
                {item.answers.map((answer, index) => (
                  <p key={index}>
                    <strong>{answer.questionText}: </strong>
                    {answer.answerRating ?? answer.answerText}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
