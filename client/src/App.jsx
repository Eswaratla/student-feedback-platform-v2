import { Routes, Route, NavLink, Navigate, useParams } from 'react-router-dom';
import Logo from './components/Logo';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AboutPage from './pages/AboutPage';
import ApplyPage from './pages/ApplyPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import StudentPortalLayout from './layouts/StudentPortalLayout';
import StaffPortalLayout from './layouts/StaffPortalLayout';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import StudentSurveyPage from './pages/student/StudentSurveyPage';
import StudentMyFeedbackPage from './pages/student/StudentMyFeedbackPage';
import StudentSettingsPage from './pages/student/StudentSettingsPage';
import StaffDashboardPage from './pages/staff/StaffDashboardPage';
import StaffDepartmentsPage from './pages/staff/StaffDepartmentsPage';
import StaffSurveysPage from './pages/staff/StaffSurveysPage';
import StaffSurveyFormPage from './pages/staff/StaffSurveyFormPage';
import StaffSurveyConfirmationPage from './pages/staff/StaffSurveyConfirmationPage';
import StaffReportsPage from './pages/staff/StaffReportsPage';
import StaffResponsesPage from './pages/staff/StaffResponsesPage';
import StaffAreaReportPage from './pages/staff/StaffAreaReportPage';
import StaffReportDetailPage from './pages/staff/StaffReportDetailPage';
import StaffProfilePage from './pages/staff/StaffProfilePage';
import StaffStudentsPage from './pages/staff/StaffStudentsPage';
import StaffStudentFormPage from './pages/staff/StaffStudentFormPage';
import StaffAccountsPage from './pages/staff/StaffAccountsPage';
import StaffApplicationsPage from './pages/staff/StaffApplicationsPage';

function RedirectDepartmentToReport() {
  const { id } = useParams();
  return <Navigate to={`/staff/reports/area/${id}`} replace />;
}

function PublicLayout() {
  return (
    <div className="app">
      <header className="site-header">
        <div className="container header-inner">
          <NavLink to="/" className="brand"><Logo /></NavLink>
          <nav className="main-nav">
            <NavLink to="/about">About Us</NavLink>
            <NavLink to="/apply">Apply Now</NavLink>
            <NavLink to="/login" className="nav-login">Login</NavLink>
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Logo size={40} />
            <p>Empowering the next generation through quality education.</p>
          </div>
          <nav className="footer-nav">
            <NavLink to="/about">About Us</NavLink>
            <NavLink to="/apply">Apply Now</NavLink>
            <NavLink to="/login">Login</NavLink>
          </nav>
        </div>
        <div className="footer-bottom">
          <div className="container">
            <span>&copy; {new Date().getFullYear()} NexGen University. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/student/*" element={<StudentPortalLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboardPage />} />
        <Route path="survey" element={<StudentSurveyPage />} />
        <Route path="my-feedback" element={<StudentMyFeedbackPage />} />
        <Route path="settings" element={<StudentSettingsPage />} />
      </Route>

      <Route path="/staff/*" element={<StaffPortalLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboardPage />} />
        <Route path="students" element={<StaffStudentsPage />} />
        <Route path="students/new" element={<StaffStudentFormPage />} />
        <Route path="students/:studentId" element={<StaffStudentFormPage />} />
        <Route path="applications" element={<StaffApplicationsPage />} />
        <Route path="accounts" element={<StaffAccountsPage />} />
        <Route path="departments" element={<StaffDepartmentsPage />} />
        <Route path="departments/:id" element={<RedirectDepartmentToReport />} />
        <Route path="courses" element={<Navigate to="/staff/reports" replace />} />
        <Route path="courses/:id" element={<Navigate to="/staff/reports" replace />} />
        <Route path="surveys" element={<StaffSurveysPage />} />
        <Route path="surveys/new" element={<StaffSurveyFormPage />} />
        <Route path="surveys/:id/confirmation" element={<StaffSurveyConfirmationPage />} />
        <Route path="surveys/:id" element={<StaffSurveyFormPage />} />
        <Route path="responses" element={<StaffResponsesPage />} />
        <Route path="reports" element={<StaffReportsPage />} />
        <Route path="reports/area/:areaId" element={<StaffAreaReportPage />} />
        <Route path="reports/survey/:id" element={<StaffReportDetailPage />} />
        <Route path="profile" element={<StaffProfilePage />} />
      </Route>

      <Route path="/*" element={<PublicLayout />} />
    </Routes>
  );
}
