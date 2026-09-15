function authHeaders() {
  try {
    const raw = localStorage.getItem('nexgen_auth');
    const user = raw ? JSON.parse(raw) : null;
    if (user?.token) {
      return { Authorization: `Bearer ${user.token}` };
    }
  } catch {
    return {};
  }
  return {};
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
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
  listStaffSurveys: () => request('/api/staff/surveys'),
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
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  changePassword: (data) =>
    request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  apply: (data) => request('/api/auth/apply', { method: 'POST', body: JSON.stringify(data) }),
  listManagedStudents: (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    const query = search.toString();
    return request(`/api/staff/students${query ? `?${query}` : ''}`);
  },
  createStudentAccount: (data) =>
    request('/api/staff/students', { method: 'POST', body: JSON.stringify(data) }),
  getManagedStudent: (studentId) => request(`/api/staff/students/${encodeURIComponent(studentId)}`),
  updateManagedStudent: (studentId, data) =>
    request(`/api/staff/students/${encodeURIComponent(studentId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  setStudentAccountStatus: (studentId, accountStatus) =>
    request(`/api/staff/students/${encodeURIComponent(studentId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ accountStatus }),
    }),
  resetStudentPassword: (studentId) =>
    request(`/api/staff/students/${encodeURIComponent(studentId)}/reset-password`, {
      method: 'POST',
    }),
  listStaffAccounts: () => request('/api/admin/staff'),
  createStaffAccount: (data) =>
    request('/api/admin/staff', { method: 'POST', body: JSON.stringify(data) }),
  setStaffAccountStatus: (staffId, accountStatus) =>
    request(`/api/admin/staff/${encodeURIComponent(staffId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ accountStatus }),
    }),
  resetStaffPassword: (staffId) =>
    request(`/api/admin/staff/${encodeURIComponent(staffId)}/reset-password`, {
      method: 'POST',
    }),
  listApplications: () => request('/api/staff/applications'),
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
