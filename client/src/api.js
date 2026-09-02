async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function downloadExport(type, id = null, format = 'pdf') {
  const params = new URLSearchParams({ format });
  if (id) params.set('id', id);
  window.open(`/api/export/${type}?${params}`, '_blank');
}

export const api = {
  getDashboard: () => request('/api/dashboard'),
  getDepartments: () => request('/api/departments'),
  getDepartment: (id) => request(`/api/departments/${id}`),
  getDepartmentSummary: (id) => request(`/api/departments/${id}/summary`),
  getCourses: (departmentId = null) =>
    request(`/api/courses${departmentId ? `?departmentId=${departmentId}` : ''}`),
  getCourse: (id) => request(`/api/courses/${id}`),
  getCourseSummary: (id) => request(`/api/courses/${id}/summary`),
  getSurveys: (activeOnly = false) => request(`/api/surveys${activeOnly ? '?active=true' : ''}`),
  getSurvey: (id) => request(`/api/surveys/${id}`),
  createSurvey: (data) => request('/api/surveys', { method: 'POST', body: JSON.stringify(data) }),
  updateSurvey: (id, data) => request(`/api/surveys/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSurvey: (id) => request(`/api/surveys/${id}`, { method: 'DELETE' }),
  addQuestion: (surveyId, data) =>
    request(`/api/surveys/${surveyId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  deleteQuestion: (id) => request(`/api/questions/${id}`, { method: 'DELETE' }),
  getSurveyReport: (id) => request(`/api/surveys/${id}/report`),
  getUniversityReport: () => request('/api/reports/university'),
  getAiInsights: () => request('/api/reports/ai-insights'),
  getAllResponses: () => request('/api/responses'),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data) =>
    request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  getAuthStatus: () => request('/api/auth/status'),
  getStudentSurveys: (email) => request(`/api/students/${encodeURIComponent(email)}/surveys`),
  getStudentResponses: (email) => request(`/api/students/${encodeURIComponent(email)}/responses`),
  getStudentProfile: (email) => request(`/api/students/${encodeURIComponent(email)}/profile`),
  saveStudentProfile: (email, data) =>
    request(`/api/students/${encodeURIComponent(email)}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  submitResponse: (surveyId, data) =>
    request(`/api/surveys/${surveyId}/responses`, { method: 'POST', body: JSON.stringify(data) }),
};
