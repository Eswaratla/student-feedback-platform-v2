import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function StaffStudentsPage() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({
    q: '',
    departmentId: '',
    courseId: '',
    academicYear: '',
    yearLevel: '',
    semester: '',
    accountStatus: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetCredentials, setResetCredentials] = useState(null);

  const filteredCourses = filters.departmentId
    ? courses.filter((course) => course.departmentId === Number(filters.departmentId))
    : courses;

  async function loadStudents(nextFilters = filters) {
    try {
      setLoading(true);
      const rows = await api.listManagedStudents(nextFilters);
      setStudents(rows);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {});
    api.getCourses().then(setCourses).catch(() => {});
    loadStudents();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.q === searchInput) return prev;
        const next = { ...prev, q: searchInput };
        loadStudents(next);
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function updateFilter(field, value) {
    const next = { ...filters, [field]: value };
    if (field === 'departmentId') next.courseId = '';
    setFilters(next);
    loadStudents(next);
  }

  async function toggleStatus(student) {
    const nextStatus = student.accountStatus === 'inactive' ? 'active' : 'inactive';
    try {
      await api.setStudentAccountStatus(student.studentId, nextStatus);
      loadStudents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function resetPassword(student) {
    try {
      const result = await api.resetStudentPassword(student.studentId);
      setResetCredentials({
        name: student.name,
        loginId: result.studentId,
        initialPassword: result.initialPassword,
      });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="portal-page">
      <section className="portal-card">
        <div className="portal-section-header">
          <div>
            <h2>Students</h2>
            <p>Create and manage student accounts. IDs and initial passwords are generated automatically.</p>
          </div>
          <Link to="/staff/students/new" className="btn btn-primary">
            Add student
          </Link>
        </div>

        <div className="survey-filters">
          <label>
            Search
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, email, or student ID"
            />
          </label>
          <label>
            Department
            <select
              value={filters.departmentId}
              onChange={(e) => updateFilter('departmentId', e.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>
          <label>
            Program
            <select value={filters.courseId} onChange={(e) => updateFilter('courseId', e.target.value)}>
              <option value="">All programs</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Academic year
            <input
              value={filters.academicYear}
              onChange={(e) => updateFilter('academicYear', e.target.value)}
              placeholder="e.g. 2026"
            />
          </label>
          <label>
            Year level
            <select value={filters.yearLevel} onChange={(e) => updateFilter('yearLevel', e.target.value)}>
              <option value="">All year levels</option>
              <option>Year 1</option>
              <option>Year 2</option>
              <option>Year 3</option>
              <option>Year 4</option>
              <option>Postgraduate</option>
            </select>
          </label>
          <label>
            Semester
            <select value={filters.semester} onChange={(e) => updateFilter('semester', e.target.value)}>
              <option value="">All semesters</option>
              <option>Semester 1</option>
              <option>Semester 2</option>
            </select>
          </label>
          <label>
            Status
            <select
              value={filters.accountStatus}
              onChange={(e) => updateFilter('accountStatus', e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
          </label>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}

      {resetCredentials && (
        <section className="portal-card">
          <p className="form-success">Password reset for {resetCredentials.name}.</p>
          <p className="password-notice">
            Student ID: <strong>{resetCredentials.loginId}</strong><br />
            Temporary password: <strong>{resetCredentials.initialPassword}</strong>
          </p>
          <p className="portal-meta">Show this password once. The student can change it in Settings.</p>
        </section>
      )}

      {loading ? (
        <section className="portal-card"><p>Loading students...</p></section>
      ) : students.length === 0 ? (
        <section className="portal-card portal-empty">
          <p>{filters.q || filters.departmentId || filters.courseId || filters.academicYear || filters.yearLevel || filters.semester || filters.accountStatus
            ? 'No students match these filters.'
            : 'No student accounts yet. Add a student to get started.'}</p>
        </section>
      ) : (
        <div className="portal-list">
          {students.map((student) => (
            <article key={student.studentId} className="portal-list-item">
              <div>
                <h4>{student.name}</h4>
                <p className="portal-meta">
                  {student.studentId}
                  {student.email ? ` · ${student.email}` : ''}
                  {student.departmentName ? ` · ${student.departmentName}` : ''}
                  {student.courseCode ? ` · ${student.courseCode}` : ''}
                  {student.academicYear ? ` · ${student.academicYear}` : ''}
                  {student.yearLevel ? ` · ${student.yearLevel}` : ''}
                  {student.semester ? ` · ${student.semester}` : ''}
                </p>
                <span className={`portal-tag ${student.accountStatus === 'inactive' ? 'pending' : 'completed'}`}>
                  {student.accountStatus === 'inactive' ? 'Deactivated' : 'Active'}
                </span>
              </div>
              <div className="portal-item-actions">
                <Link to={`/staff/students/${student.studentId}`} className="btn btn-secondary">
                  Edit
                </Link>
                <button type="button" className="btn btn-secondary" onClick={() => resetPassword(student)}>
                  Reset password
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => toggleStatus(student)}>
                  {student.accountStatus === 'inactive' ? 'Reactivate' : 'Deactivate'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
