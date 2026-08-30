import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';

function responderLabel(item) {
  if (item.isAnonymous) return 'Anonymous student';
  return item.studentName || 'Student';
}

function responseDepartmentId(item, courseDepartment) {
  if (item.studentDepartmentId) return item.studentDepartmentId;
  if (item.studentCourseId && courseDepartment.has(item.studentCourseId)) {
    return courseDepartment.get(item.studentCourseId);
  }
  if (item.departmentId) return item.departmentId;
  if (item.courseId && courseDepartment.has(item.courseId)) {
    return courseDepartment.get(item.courseId);
  }
  return null;
}

export default function StaffAreaReportPage() {
  const { areaId } = useParams();
  const isUniversity = areaId === 'university';
  const departmentId = isUniversity ? null : Number(areaId);

  const [responses, setResponses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAllResponses(), api.getDepartments(), api.getCourses()])
      .then(([responseList, departmentList, courseList]) => {
        setResponses(responseList);
        setDepartments(departmentList);
        setCourses(courseList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [areaId]);

  const department = isUniversity
    ? null
    : departments.find((dept) => dept.id === departmentId);

  const title = isUniversity ? 'University-wide' : department?.name || 'Department';
  const availableCourses = isUniversity
    ? []
    : courses.filter((course) => course.departmentId === departmentId);
  const courseListLabel = isUniversity
    ? 'University-wide surveys are not tied to a specific course.'
    : availableCourses.length
      ? availableCourses.map((course) => `${course.code} — ${course.name}`).join(', ')
      : 'No courses listed for this department.';

  const areaResponses = useMemo(() => {
    const courseDepartment = new Map(courses.map((course) => [course.id, course.departmentId]));

    return responses.filter((item) => {
      const areaDepartmentId = responseDepartmentId(item, courseDepartment);
      if (isUniversity) return areaDepartmentId == null;
      return areaDepartmentId === departmentId;
    });
  }, [responses, courses, isUniversity, departmentId]);

  if (loading) {
    return <section className="portal-card"><p>Loading report...</p></section>;
  }

  if (error) {
    return (
      <section className="portal-card">
        <p className="form-error">{error}</p>
        <Link to="/staff/reports" className="btn btn-primary">Back to reports</Link>
      </section>
    );
  }

  if (!isUniversity && !Number.isInteger(departmentId)) {
    return (
      <section className="portal-card">
        <h2>Report not found</h2>
        <Link to="/staff/reports" className="btn btn-primary">Back to reports</Link>
      </section>
    );
  }

  return (
    <div className="portal-page">
      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <h2>{title} report</h2>
            <p>{courseListLabel}</p>
            <p className="portal-meta">
              {areaResponses.length} {areaResponses.length === 1 ? 'response' : 'responses'}.
              Anonymous submissions hide the student’s name and email.
            </p>
          </div>
          <Link to="/staff/reports" className="card-link">← Back to reports</Link>
        </div>
      </section>

      {areaResponses.length === 0 ? (
        <section className="portal-card portal-empty">
          <p>
            {isUniversity
              ? 'No university-wide responses yet.'
              : 'No one from this department has submitted survey or feedback responses yet.'}
          </p>
        </section>
      ) : (
        <section className="portal-card">
          <h3>Who responded</h3>
          <div className="portal-list">
            {areaResponses.map((item) => (
              <article key={item.id} className="portal-list-item portal-feedback-item">
                <div>
                  <h3>{responderLabel(item)}</h3>
                  <p className="portal-meta">
                    {item.surveyTitle}
                    {item.submittedAt ? ` · ${item.submittedAt}` : ''}
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
                      {answer.answerRating ?? answer.answerText}
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
