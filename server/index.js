import express from 'express';
import cors from 'cors';
import {
  initDb,
  listDepartments,
  getDepartment,
  getDepartmentSummary,
  listCourses,
  getCourse,
  getCourseSummary,
  listSurveys,
  getSurvey,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  addQuestion,
  deleteQuestion,
  submitResponse,
  getStudentResponses,
  getStudentSurveyStatus,
  saveStudentProfile,
  getDashboardStats,
  getSurveyReport,
  getUniversityReport,
  listAllResponses,
  buildExportRows,
  authenticateUser,
  changeUserPassword,
  getAuthAccountCounts,
  applyAsStudent,
  getStaffActor,
  createStudentAccount,
  listManagedStudents,
  getManagedStudent,
  updateManagedStudent,
  setStudentAccountStatus,
  createStaffAccount,
  listStaffAccounts,
  setStaffAccountStatus,
  listApplications,
  resetStudentPassword,
  resetStaffPassword,
  getStudentProfileByStudentId,
} from './db.js';
import { createSession, destroySession, getSession, readToken } from './sessions.js';
import { renderStaffPdf, rowsToWordHtml } from './exportFormats.js';
import { generateAiInsights } from './aiInsights.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function parseSurveyId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function requireSession(req) {
  const session = getSession(readToken(req));
  if (!session) {
    const error = new Error('Sign in is required.');
    error.status = 401;
    throw error;
  }
  return session;
}

function requireStaff(req) {
  const session = requireSession(req);
  if (session.role !== 'staff') {
    const error = new Error('Staff authentication is required.');
    error.status = 403;
    throw error;
  }
  return getStaffActor(session.loginId);
}

function requireAdmin(req) {
  const staff = requireStaff(req);
  if (!staff.isAdmin) {
    const error = new Error('Administrator access is required.');
    error.status = 403;
    throw error;
  }
  return staff;
}

function requireStudent(req) {
  const session = requireSession(req);
  if (session.role !== 'student') {
    const error = new Error('Student authentication is required.');
    error.status = 403;
    throw error;
  }
  return session;
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'NexGen University API is running',
    stack: 'Node.js + Express',
  });
});

app.get('/api/auth/status', (req, res) => {
  try {
    requireStaff(req);
    res.json(getAuthAccountCounts());
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { role, loginId, password } = req.body || {};
    const account = authenticateUser(role, loginId, password);
    res.json({ ...account, token: createSession(account) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  destroySession(readToken(req));
  res.status(204).send();
});

app.post('/api/auth/change-password', (req, res) => {
  try {
    const session = requireSession(req);
    const { currentPassword, newPassword } = req.body || {};
    res.json(changeUserPassword(session.role, session.loginId, currentPassword, newPassword));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/auth/apply', (req, res) => {
  try {
    const { name, email, phone, departmentId, courseId, message } = req.body || {};
    res.status(201).json(applyAsStudent({ name, email, phone, departmentId, courseId, message }));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/staff/surveys', (req, res) => {
  try {
    requireStaff(req);
    res.json(listSurveys());
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/staff/students', (req, res) => {
  try {
    requireStaff(req);
    res.json(
      listManagedStudents({
        query: req.query.q || '',
        departmentId: req.query.departmentId || null,
        courseId: req.query.courseId || null,
        academicYear: req.query.academicYear || '',
        yearLevel: req.query.yearLevel || '',
        semester: req.query.semester || '',
        accountStatus: req.query.accountStatus || '',
      })
    );
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/staff/students', (req, res) => {
  try {
    requireStaff(req);
    res.status(201).json(createStudentAccount(req.body || {}));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/staff/students/:studentId', (req, res) => {
  try {
    requireStaff(req);
    res.json(getManagedStudent(req.params.studentId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.put('/api/staff/students/:studentId', (req, res) => {
  try {
    requireStaff(req);
    res.json(updateManagedStudent(req.params.studentId, req.body || {}));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.patch('/api/staff/students/:studentId/status', (req, res) => {
  try {
    requireStaff(req);
    res.json(setStudentAccountStatus(req.params.studentId, req.body?.accountStatus));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/admin/staff', (req, res) => {
  try {
    requireAdmin(req);
    res.json(listStaffAccounts());
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/admin/staff', (req, res) => {
  try {
    requireAdmin(req);
    res.status(201).json(createStaffAccount(req.body || {}));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.patch('/api/admin/staff/:staffId/status', (req, res) => {
  try {
    const actor = requireAdmin(req);
    res.json(setStaffAccountStatus(req.params.staffId, req.body?.accountStatus, actor.staffId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/staff/students/:studentId/reset-password', (req, res) => {
  try {
    requireStaff(req);
    res.json(resetStudentPassword(req.params.studentId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/admin/staff/:staffId/reset-password', (req, res) => {
  try {
    const actor = requireAdmin(req);
    res.json(resetStaffPassword(req.params.staffId, actor.staffId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/staff/applications', (req, res) => {
  try {
    requireStaff(req);
    res.json(listApplications());
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/dashboard', (_req, res) => res.json(getDashboardStats()));

app.get('/api/departments', (_req, res) => res.json(listDepartments()));
app.get('/api/departments/:id', (req, res) => {
  const department = getDepartment(Number(req.params.id));
  if (!department) return res.status(404).json({ error: 'Department not found.' });
  res.json(department);
});
app.get('/api/departments/:id/summary', (req, res) => {
  const summary = getDepartmentSummary(Number(req.params.id));
  if (!summary) return res.status(404).json({ error: 'Department not found.' });
  res.json(summary);
});

app.get('/api/courses', (req, res) => {
  const departmentId = req.query.departmentId ? Number(req.query.departmentId) : null;
  res.json(listCourses(departmentId));
});
app.get('/api/courses/:id', (req, res) => {
  const course = getCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  res.json(course);
});
app.get('/api/courses/:id/summary', (req, res) => {
  const summary = getCourseSummary(Number(req.params.id));
  if (!summary) return res.status(404).json({ error: 'Course not found.' });
  res.json(summary);
});

app.get('/api/surveys', (req, res) => {
  res.json(listSurveys({ activeOnly: req.query.active === 'true' }));
});

app.post('/api/surveys', (req, res) => {
  const { title, description, isActive, departmentId, courseId, openingDate, closingDate, staffOnly } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Survey title is required.' });
  res.status(201).json(
    createSurvey({ title: title.trim(), description, isActive, departmentId, courseId, openingDate, closingDate, staffOnly })
  );
});

app.get('/api/surveys/:id/report', (req, res) => {
  const surveyId = parseSurveyId(req.params.id);
  if (!surveyId) return res.status(400).json({ error: 'Invalid survey id.' });
  const report = getSurveyReport(surveyId);
  if (!report) return res.status(404).json({ error: 'Survey not found.' });
  res.json(report);
});

app.get('/api/surveys/:id', (req, res) => {
  const surveyId = parseSurveyId(req.params.id);
  if (!surveyId) return res.status(400).json({ error: 'Invalid survey id.' });
  const survey = getSurvey(surveyId);
  if (!survey) return res.status(404).json({ error: 'Survey not found.' });
  res.json(survey);
});

app.put('/api/surveys/:id', (req, res) => {
  const surveyId = parseSurveyId(req.params.id);
  if (!surveyId) return res.status(400).json({ error: 'Invalid survey id.' });
  const survey = updateSurvey(surveyId, req.body);
  if (!survey) return res.status(404).json({ error: 'Survey not found.' });
  res.json(survey);
});

app.delete('/api/surveys/:id', (req, res) => {
  const surveyId = parseSurveyId(req.params.id);
  if (!surveyId) return res.status(400).json({ error: 'Invalid survey id.' });
  deleteSurvey(surveyId);
  res.status(204).send();
});

app.post('/api/surveys/:id/questions', (req, res) => {
  const surveyId = parseSurveyId(req.params.id);
  if (!surveyId) return res.status(400).json({ error: 'Invalid survey id.' });
  if (!getSurvey(surveyId)) return res.status(404).json({ error: 'Survey not found.' });
  const { questionText, questionType, options } = req.body;
  if (!questionText?.trim()) return res.status(400).json({ error: 'Question text is required.' });
  res.status(201).json(addQuestion(surveyId, { questionText: questionText.trim(), questionType, options }));
});

app.delete('/api/questions/:id', (req, res) => {
  deleteQuestion(Number(req.params.id));
  res.status(204).send();
});

app.get('/api/reports/university', (_req, res) => res.json(getUniversityReport()));

app.get('/api/reports/ai-insights', (_req, res) => {
  try {
    res.json(generateAiInsights());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unable to generate AI insights.' });
  }
});

app.get('/api/responses', (_req, res) => res.json(listAllResponses()));

app.get('/api/export/:type', async (req, res) => {
  const { type } = req.params;
  const id = req.query.id ? Number(req.query.id) : null;
  const format = (req.query.format || 'pdf').toLowerCase();
  const filenameBase = `${type}-report${id ? `-${id}` : ''}`;

  try {
    const staff = requireStaff(req);
    if (id && type === 'survey' && !getSurvey(id)) {
      return res.status(404).json({ error: 'Nothing to download.' });
    }
    if (id && type === 'department' && !getDepartment(id)) {
      return res.status(404).json({ error: 'Nothing to download.' });
    }
    if (id && type === 'course' && !getCourse(id)) {
      return res.status(404).json({ error: 'Nothing to download.' });
    }

    if (format === 'word') {
      const rows = buildExportRows(type, id);
      if (!rows.length) return res.status(404).json({ error: 'Nothing to download.' });
      const html = rowsToWordHtml(rows, `${type}-report`, staff);
      res.setHeader('Content-Type', 'application/msword');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.doc"`);
      return res.send(html);
    }

    if (format === 'pdf') {
      const pdf = await renderStaffPdf({ type, id, staff });
      if (!pdf) return res.status(404).json({ error: 'Nothing to download.' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
      return res.send(pdf);
    }

    return res.status(400).json({ error: 'Unsupported format. Use word or pdf.' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Download failed.' });
  }
});

app.get('/api/students/:email/surveys', (req, res) => {
  res.json(getStudentSurveyStatus(req.params.email));
});

app.get('/api/students/:email/responses', (req, res) => {
  res.json(getStudentResponses(req.params.email));
});

app.get('/api/students/:email/profile', (req, res) => {
  try {
    const session = requireStudent(req);
    res.json(getStudentProfileByStudentId(session.loginId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.put('/api/students/:email/profile', (req, res) => {
  try {
    const session = requireStudent(req);
    const profile = getStudentProfileByStudentId(session.loginId);
    res.json(saveStudentProfile(profile.email, { name: req.body?.name }));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/surveys/:id/responses', (req, res) => {
  const surveyId = parseSurveyId(req.params.id);
  if (!surveyId) return res.status(400).json({ error: 'Invalid survey id.' });
  try {
    res.status(201).json(submitResponse(surveyId, req.body));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

await initDb();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NexGen University API (Node.js) running on http://localhost:${PORT}`);
});
