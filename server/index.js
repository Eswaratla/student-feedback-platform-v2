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
  getStudentProfile,
  saveStudentProfile,
  getDashboardStats,
  getSurveyReport,
  getUniversityReport,
  listAllResponses,
  buildExportRows,
} from './db.js';
import { rowsToPdfBuffer, rowsToWordHtml } from './exportFormats.js';
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'NexGen University API is running', stack: 'Node.js + Express' });
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

app.get('/api/reports/ai-insights', async (_req, res) => {
  try {
    const insights = await generateAiInsights(getUniversityReport());
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unable to generate AI insights.' });
  }
});

app.get('/api/responses', (_req, res) => res.json(listAllResponses()));

app.get('/api/export/:type', async (req, res) => {
  const { type } = req.params;
  const id = req.query.id ? Number(req.query.id) : null;
  const format = (req.query.format || 'pdf').toLowerCase();
  const rows = buildExportRows(type, id);

  if (!rows.length) return res.status(404).json({ error: 'Nothing to download.' });

  const title = `${type}-report`;
  const filenameBase = `${type}-report${id ? `-${id}` : ''}`;

  try {
    if (format === 'word') {
      const html = rowsToWordHtml(rows, title);
      res.setHeader('Content-Type', 'application/msword');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.doc"`);
      return res.send(html);
    }

    if (format === 'pdf') {
      const pdf = await rowsToPdfBuffer(rows, title);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
      return res.send(pdf);
    }

    return res.status(400).json({ error: 'Unsupported format. Use word or pdf.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Download failed.' });
  }
});

app.get('/api/students/:email/surveys', (req, res) => {
  res.json(getStudentSurveyStatus(req.params.email));
});

app.get('/api/students/:email/responses', (req, res) => {
  res.json(getStudentResponses(req.params.email));
});

app.get('/api/students/:email/profile', (req, res) => {
  res.json(getStudentProfile(req.params.email));
});

app.put('/api/students/:email/profile', (req, res) => {
  const { name, departmentId, courseId } = req.body;
  res.json(
    saveStudentProfile(req.params.email, {
      name,
      departmentId: departmentId ? Number(departmentId) : null,
      courseId: courseId ? Number(courseId) : null,
    })
  );
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

app.listen(PORT, () => {
  console.log(`NexGen University API (Node.js) running on http://localhost:${PORT}`);
});
