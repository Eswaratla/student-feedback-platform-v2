import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';

const QUESTION_TYPES = [
  { value: 'rating', label: 'Rating (1–5)' },
  { value: 'text', label: 'Text response' },
  { value: 'choice', label: 'Multiple choice' },
];

const EMPTY_QUESTION = {
  questionText: '',
  questionType: 'rating',
  options: ['Option 1', 'Option 2'],
};

function formatScheduleDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function StaffSurveyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [publishMode, setPublishMode] = useState('draft');
  const [openingDate, setOpeningDate] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState(EMPTY_QUESTION);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const surveyId = isNew ? null : Number(id);

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {});
    api.getCourses().then(setCourses).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) {
      setNotFound(false);
      setLoading(false);
      setError('');
      setTitle('');
      setDescription('');
      setPublishMode('draft');
      setOpeningDate('');
      setClosingDate('');
      setDepartmentId('');
      setCourseId('');
      setQuestions([]);
      setNewQuestion(EMPTY_QUESTION);
      return;
    }

    if (!Number.isInteger(surveyId) || surveyId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotFound(false);

    api.getSurvey(surveyId)
      .then((survey) => {
        setTitle(survey.title);
        setDescription(survey.description || '');
        if (survey.isActive && survey.openingDate) {
          setPublishMode('scheduled');
        } else if (survey.isActive) {
          setPublishMode('now');
        } else {
          setPublishMode('draft');
        }
        setOpeningDate(survey.openingDate || '');
        setClosingDate(survey.closingDate || '');
        setDepartmentId(survey.departmentId ? String(survey.departmentId) : '');
        setCourseId(survey.courseId ? String(survey.courseId) : '');
        setQuestions(survey.questions || []);
        setError('');
        setNotFound(false);
      })
      .catch((err) => {
        setError(err.message);
        setNotFound(err.message.toLowerCase().includes('not found'));
      })
      .finally(() => setLoading(false));
  }, [id, isNew, surveyId]);

  const filteredCourses = departmentId
    ? courses.filter((course) => course.departmentId === Number(departmentId))
    : courses;

  const selectedCourse = courseId ? courses.find((course) => course.id === Number(courseId)) : null;
  const selectedDepartment = departmentId
    ? departments.find((dept) => dept.id === Number(departmentId))
    : null;

  const audienceLabel = selectedCourse
    ? `Only students enrolled in ${selectedCourse.code} — ${selectedCourse.name} will see this survey.`
    : selectedDepartment
      ? `Only students in ${selectedDepartment.name} will see this survey.`
      : 'Every student will see this survey, whatever their department or program.';

  function goToConfirmation(id, action) {
    navigate(`/staff/surveys/${id}/confirmation`, { state: { action } });
  }

  async function saveSurvey(e, mode = publishMode) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Enter a survey title before saving.');
      return;
    }

    let isActive = false;
    let scheduledOpeningDate = null;
    const action = mode === 'now' ? 'published' : mode === 'scheduled' ? 'scheduled' : 'draft';

    if (mode === 'now') {
      isActive = true;
      scheduledOpeningDate = null;
    } else if (mode === 'scheduled') {
      if (!openingDate) {
        setError('Choose an opening date & time to schedule this survey.');
        setPublishMode('scheduled');
        return;
      }
      isActive = true;
      scheduledOpeningDate = openingDate;
    }

    if (isActive && questions.length === 0) {
      setError('Add at least one question before publishing this survey to students.');
      return;
    }

    const payload = {
      title: title.trim(),
      description,
      isActive,
      openingDate: scheduledOpeningDate,
      closingDate: closingDate || null,
      departmentId: departmentId ? Number(departmentId) : null,
      courseId: courseId ? Number(courseId) : null,
      staffOnly: false,
    };

    setSaving(true);

    try {
      if (isNew) {
        const created = await api.createSurvey(payload);
        if (!created?.id) {
          throw new Error('Survey could not be created. Please try again.');
        }
        for (const question of questions) {
          await api.addQuestion(created.id, question);
        }
        goToConfirmation(created.id, action);
        return;
      }

      await api.updateSurvey(surveyId, payload);
      goToConfirmation(surveyId, action);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addQuestion() {
    const questionText = newQuestion.questionText.trim();
    if (!questionText) {
      setError('Enter the question text before adding it.');
      return;
    }

    const draft = {
      questionText,
      questionType: newQuestion.questionType,
      options: newQuestion.questionType === 'choice' ? newQuestion.options : [],
    };

    setError('');

    if (isNew) {
      setQuestions((prev) => [...prev, { ...draft, draftKey: `draft-${Date.now()}-${prev.length}` }]);
      setNewQuestion(EMPTY_QUESTION);
      return;
    }

    try {
      const question = await api.addQuestion(surveyId, draft);
      setQuestions((prev) => [...prev, question]);
      setNewQuestion(EMPTY_QUESTION);
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeQuestion(question) {
    if (!question.id) {
      setQuestions((prev) => prev.filter((q) => q.draftKey !== question.draftKey));
      return;
    }

    try {
      await api.deleteQuestion(question.id);
      setQuestions((prev) => prev.filter((q) => q.id !== question.id));
    } catch (err) {
      setError(err.message);
    }
  }

  function updateOption(index, value) {
    setNewQuestion((prev) => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options };
    });
  }

  if (loading) {
    return <section className="portal-card"><p>Loading survey...</p></section>;
  }

  if (notFound) {
    return (
      <div className="portal-page">
        <section className="portal-card">
          <h2>Survey not found</h2>
          <p className="portal-meta">This survey may have been removed or the link is out of date.</p>
          <div className="portal-form-actions">
            <Link to="/staff/surveys/new" className="btn btn-primary">Create new survey</Link>
            <Link to="/staff/surveys" className="btn btn-secondary">Back to surveys</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <h2>{isNew ? 'Create survey' : 'Edit survey'}</h2>
            <p className="portal-meta">
              {isNew
                ? 'Build a student feedback survey, then publish now or schedule it for later.'
                : 'Update survey details, questions, and publishing settings.'}
            </p>
          </div>
          <Link to="/staff/surveys" className="card-link">← Back to surveys</Link>
        </div>

        {error && <p className="form-error">{error}</p>}

        <form onSubmit={(e) => e.preventDefault()} className="portal-form">
          <label>
            Survey title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label>
            Description
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label>
            Department
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setCourseId('');
              }}
            >
              <option value="">University-wide</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>

          <label>
            Course (optional)
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">No specific course</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </label>

          <p className="portal-meta">{audienceLabel}</p>

          <label>
            Closing date &amp; time
            <input
              type="datetime-local"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
            />
          </label>

          <div className="portal-questions-block">
            <h3>Questions</h3>
            <p className="portal-meta">Add the questions students will answer in this survey.</p>

            {questions.length === 0 ? (
              <p className="portal-empty-text">No questions yet. Add your first question below.</p>
            ) : (
              <div className="portal-list">
                {questions.map((question) => (
                  <article key={question.id || question.draftKey} className="portal-list-item">
                    <div>
                      <h4>{question.questionText}</h4>
                      <p>
                        Type: {question.questionType}
                        {question.options?.length ? ` · Options: ${question.options.join(', ')}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline danger-btn"
                      onClick={() => removeQuestion(question)}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            )}

            <div className="portal-questions-add">
              <h4>Add question</h4>

              <label>
                Question text
                <input
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion((prev) => ({ ...prev, questionText: e.target.value }))}
                />
              </label>

              <label>
                Question type
                <select
                  value={newQuestion.questionType}
                  onChange={(e) => setNewQuestion((prev) => ({ ...prev, questionType: e.target.value }))}
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>

              {newQuestion.questionType === 'choice' && (
                <div className="portal-options">
                  {newQuestion.options.map((option, index) => (
                    <label key={index}>
                      Option {index + 1}
                      <input value={option} onChange={(e) => updateOption(index, e.target.value)} />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setNewQuestion((prev) => ({
                        ...prev,
                        options: [...prev.options, `Option ${prev.options.length + 1}`],
                      }))
                    }
                  >
                    Add option
                  </button>
                </div>
              )}

              <button type="button" className="btn btn-secondary" onClick={addQuestion}>
                Add question
              </button>
            </div>
          </div>

          <div className="portal-publish-schedule">
            <h3>Publish to students</h3>
            <p className="portal-meta">Choose when students can access this survey.</p>

            <div className="portal-publish-mode">
              <button
                type="button"
                className={`portal-mode-btn ${publishMode === 'now' ? 'active' : ''}`}
                onClick={() => {
                  setPublishMode('now');
                  setOpeningDate('');
                }}
              >
                Publish now
              </button>
              <button
                type="button"
                className={`portal-mode-btn ${publishMode === 'scheduled' ? 'active' : ''}`}
                onClick={() => setPublishMode('scheduled')}
              >
                Schedule for later
              </button>
            </div>

            {publishMode === 'now' && (
              <p className="portal-meta">Students can respond as soon as you save.</p>
            )}

            {publishMode === 'scheduled' && (
              <>
                <label>
                  Opening date &amp; time
                  <input
                    type="datetime-local"
                    value={openingDate}
                    onChange={(e) => setOpeningDate(e.target.value)}
                    required
                  />
                </label>
                <p className="portal-meta">
                  {openingDate
                    ? `Students can respond from ${formatScheduleDateTime(openingDate)}.`
                    : 'Pick when students can start responding.'}
                  {closingDate ? ` Closes ${formatScheduleDateTime(closingDate)}.` : ''}
                </p>
              </>
            )}

            {publishMode === 'draft' && (
              <p className="portal-meta">
                Not published yet. Choose an option above, or save as a draft. Create survey publishes it to the students you selected.
              </p>
            )}
          </div>

          <div className="portal-form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={(e) => saveSurvey(e, 'draft')}
            >
              {saving ? 'Saving...' : 'Save as draft'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={(e) => saveSurvey(e, publishMode === 'scheduled' ? 'scheduled' : 'now')}
            >
              {saving
                ? 'Saving...'
                : publishMode === 'scheduled'
                  ? 'Publish'
                  : isNew
                    ? 'Create survey'
                    : 'Publish'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
