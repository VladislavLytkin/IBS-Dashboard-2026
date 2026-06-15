import { createBrowserRouter } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { RequireAuth, RequireRole } from './components/guards'
import { LoginPage } from './pages/LoginPage'
import { NoAccessPage } from './pages/NoAccessPage'
import { HomePage } from './pages/HomePage'
import { FinalRatingPage } from './pages/FinalRatingPage'
import { ExamsPage } from './pages/ExamsPage'
import { OlympiadsPage } from './pages/OlympiadsPage'
import { AttendancePage } from './pages/AttendancePage'
import { VolunteeringPage } from './pages/VolunteeringPage'
import { RisksPage } from './pages/RisksPage'
import { StudentsPage } from './pages/StudentsPage'
import { ClassesPage } from './pages/ClassesPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'
import { GradesPage } from './pages/GradesPage'
import { StudentExamsPage } from './pages/StudentExamsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { MessengerPage } from './pages/MessengerPage'
import { SupportPage } from './pages/SupportPage'
import { ActionLogPage } from './pages/ActionLogPage'
import { TeachingActionsPage } from './pages/TeachingActionsPage'
import { RiskBreakdownPage } from './pages/RiskBreakdownPage'
import { ReviewRequestsPage } from './pages/ReviewRequestsPage'
import { IndexBreakdownPage } from './pages/IndexBreakdownPage'
import { DynamicsPage } from './pages/DynamicsPage'
import { RequestsPage } from './pages/RequestsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <DashboardLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'final-rating', element: <RequireRole roles={['DIRECTOR', 'HEAD_TEACHER', 'ANALYST']}><FinalRatingPage /></RequireRole> },
      { path: 'exams', element: <RequireRole roles={['DIRECTOR', 'HEAD_TEACHER', 'ANALYST']}><ExamsPage /></RequireRole> },
      { path: 'olympiads', element: <OlympiadsPage /> },
      { path: 'attendance', element: <RequireRole roles={['HEAD_TEACHER', 'TEACHER', 'STUDENT']}><AttendancePage /></RequireRole> },
      { path: 'volunteering', element: <RequireRole roles={['ADMIN', 'HEAD_TEACHER', 'TEACHER', 'STUDENT']}><VolunteeringPage /></RequireRole> },
      { path: 'risks', element: <RisksPage /> },
      // Разделы KPI-карточек главного экрана (из синтетического датасета).
      { path: 'risk', element: <RiskBreakdownPage /> },
      { path: 'review-requests', element: <ReviewRequestsPage /> },
      { path: 'requests', element: <RequestsPage /> },
      { path: 'index-breakdown', element: <IndexBreakdownPage /> },
      { path: 'dynamics', element: <DynamicsPage /> },
      { path: 'students', element: <RequireRole roles={['HEAD_TEACHER', 'TEACHER']}><StudentsPage /></RequireRole> },
      { path: 'classes', element: <RequireRole roles={['DIRECTOR', 'HEAD_TEACHER', 'TEACHER']}><ClassesPage /></RequireRole> },
      { path: 'reports', element: <RequireRole roles={['DIRECTOR', 'ADMIN', 'ANALYST']}><ReportsPage /></RequireRole> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'users', element: <RequireRole roles={['ADMIN']}><UsersPage /></RequireRole> },
      { path: 'grades', element: <RequireRole roles={['HEAD_TEACHER', 'TEACHER', 'STUDENT']}><GradesPage /></RequireRole> },
      { path: 'student-exams', element: <RequireRole roles={['HEAD_TEACHER', 'TEACHER', 'STUDENT']}><StudentExamsPage /></RequireRole> },
      { path: 'messenger', element: <MessengerPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: 'action-log', element: <RequireRole roles={['ADMIN', 'DIRECTOR']}><ActionLogPage /></RequireRole> },
      { path: 'teaching-actions', element: <RequireRole roles={['TEACHER', 'HEAD_TEACHER', 'DIRECTOR']}><TeachingActionsPage /></RequireRole> },
      { path: 'no-access', element: <NoAccessPage /> },
      { path: '*', element: <PlaceholderPage title="Страница не найдена" /> },
    ],
  },
])
