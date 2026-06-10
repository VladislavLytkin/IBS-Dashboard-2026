import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'

const TITLES: Record<string, string> = {
  '/': 'Главный экран — Общий рейтинг классов (параллель)',
  '/grades': 'Оценки',
  '/olympiads': 'Рейтинг олимпиад',
  '/volunteering': 'СПД (волонтёрство)',
  '/attendance': 'Посещаемость',
  '/exams': 'Экзамены',
  '/risks': 'Риски — ML-прогноз',
  '/student-rating': 'Итоговый рейтинг учеников',
  '/reports': 'Отчёты',
  '/settings': 'Настройки',
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'Мониторинг школы'

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="main">
        <Topbar title={title} onBurger={() => setSidebarOpen((v) => !v)} />
        <Outlet />
      </div>
    </div>
  )
}
