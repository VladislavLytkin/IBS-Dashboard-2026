import { createBrowserRouter } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { RatingPage } from './pages/RatingPage'
import { GradesPage } from './pages/GradesPage'
import { OlympiadsPage } from './pages/OlympiadsPage'
import { VolunteeringPage } from './pages/VolunteeringPage'
import { AttendancePage } from './pages/AttendancePage'
import { ExamsPage } from './pages/ExamsPage'
import { RisksPage } from './pages/RisksPage'
import { StudentRatingPage } from './pages/StudentRatingPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <RatingPage /> },
      { path: 'grades', element: <GradesPage /> },
      { path: 'olympiads', element: <OlympiadsPage /> },
      { path: 'volunteering', element: <VolunteeringPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'exams', element: <ExamsPage /> },
      { path: 'risks', element: <RisksPage /> },
      { path: 'student-rating', element: <StudentRatingPage /> },
      { path: 'reports', element: <PlaceholderPage title="Отчёты" /> },
      { path: 'settings', element: <PlaceholderPage title="Настройки" /> },
      { path: '*', element: <PlaceholderPage title="Страница не найдена" /> },
    ],
  },
])
