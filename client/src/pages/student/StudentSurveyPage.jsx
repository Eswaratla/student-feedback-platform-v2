import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function StudentSurveyPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentSurveys(user.email)
      .then(setSurveys)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.email]);

  async function openSurvey(surveyMeta) {
    try {
      const survey = await api.getSurvey(surveyMeta.id);
      setSelectedSurvey(survey);
      setAnswers({});
      setIsAnonymous(false);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  function updateAnswer(questionId, value, type) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]:
        type === 'rating'
          ? { questionId, answerRating: Number(value) }
          : { questionId, answerText: value },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      await api.submitResponse(selectedSurvey.id, {
        studentEmail: user.email,
        studentName: user.name,
        isAnonymous,
        answers: selectedSurvey.questions.map((q) => answers[q.id] || { questionId: q.id }),
      });
      setSelectedSurvey(null);
      setAnswers({});
      setIsAnonymous(false);
      const updated = await api.getStudentSurveys(user.email);
      setSurveys(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleSurveys = useMemo(() => {
    if (statusFilter === 'pending') {
      return surveys.filter((survey) => survey.status === 'pending');
    }
    if (statusFilter === 'completed') {
      return surveys.filter((survey) => survey.status === 'completed');
    }
    return surveys;
  }, [surveys, statusFilter]);

  const heading = statusFilter === 'pending'
    ? 'Pending surveys'
    : statusFilter === 'completed'
      ? 'Completed surveys'
      : 'Survey';
  const intro = statusFilter === 'pending'
    ? 'These surveys are waiting for your response.'
    : statusFilter === 'completed'
      ? 'Surveys you have already submitted.'
      : 'Complete available surveys to help NexGen University improve your experience.';
  const emptyMessage = statusFilter === 'pending'
    ? 'You have no pending surveys right now.'
    : statusFilter === 'completed'
      ? 'You have not completed any surveys yet.'
      : 'No surveys are available right now. Check back when your university publishes a new survey.';

  return (
    <div className="portal-page">
      <section className="portal-card">
        <h2>{heading}</h2>
        <p>{intro}</p>
      </section>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="portal-card"><p>Loading surveys...</p></section>
      ) : visibleSurveys.length === 0 ? (
        <section className="portal-card portal-empty">
          <p>{emptyMessage}</p>
          {statusFilter !== 'pending' && statusFilter !== 'completed' && (
            <p className="portal-meta">
              Department and program surveys only reach enrolled students. Set your department and
              program in <Link to="/student/settings">Settings</Link> so you do not miss them.
            </p>
          )}
        </section>
      ) : (
        <div className="portal-list">
          {visibleSurveys.map((survey) => (
            <article key={survey.id} className="portal-list-item">
              <div>
                <h3>{survey.title}</h3>
                <p>{survey.description}</p>
                <span className={`portal-tag ${survey.status}`}>
                  {survey.status === 'completed' ? 'Completed' : 'Pending'}
                </span>
              </div>
              {survey.status === 'pending' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openSurvey(survey)}
                >
                  Start survey
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {selectedSurvey && (
        <section className="portal-card portal-form-card">
          <h3>{selectedSurvey.title}</h3>
          <form onSubmit={handleSubmit} className="portal-form">
            {selectedSurvey.questions.map((question) => (
              <label key={question.id}>
                {question.questionText}
                {question.questionType === 'rating' && (
                  <select
                    value={answers[question.id]?.answerRating || 5}
                    onChange={(e) => updateAnswer(question.id, e.target.value, 'rating')}
                    required
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                )}
                {question.questionType === 'text' && (
                  <textarea
                    rows={4}
                    value={answers[question.id]?.answerText || ''}
                    onChange={(e) => updateAnswer(question.id, e.target.value, 'text')}
                    required
                  />
                )}
                {question.questionType === 'choice' && (
                  <select
                    value={answers[question.id]?.answerText || question.options[0]}
                    onChange={(e) => updateAnswer(question.id, e.target.value, 'text')}
                    required
                  >
                    {question.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            ))}

            <div className="portal-anonymous-option">
              <label className="portal-checkbox">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                Submit anonymously
              </label>
              <p className="portal-meta">
                {isAnonymous
                  ? 'Your name will not be shown with this feedback. Staff will see it as an anonymous response.'
                  : 'Your name will be shown to staff alongside your answers.'}
              </p>
            </div>

            <div className="portal-form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedSurvey(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit survey
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
