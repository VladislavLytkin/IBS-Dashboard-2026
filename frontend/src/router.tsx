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
import { PlaceholderPage } from './pages/PlaceholderPage'

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
      { path: 'final-rating', element: <FinalRatingPage /> },
      { path: 'exams', element: <ExamsPage /> },
      { path: 'olympiads', element: <OlympiadsPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'volunteering', element: <VolunteeringPage /> },
      { path: 'risks', element: <RisksPage /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'classes', element: <ClassesPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'users', element: <RequireRole roles={['ADMIN']}><UsersPage /></RequireRole> },
      { path: 'grades', element: <GradesPage /> },
      { path: 'no-access', element: <NoAccessPage /> },
      { path: '*', element: <PlaceholderPage title="Страница не найдена" /> },
    ],
  },
])
