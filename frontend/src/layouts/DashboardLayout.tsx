import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'

const TITLES: Record<string, string> = {
  '/': 'Главная — обзор школы',
  '/final-rating': 'Итоговый рейтинг классов',
  '/exams': 'Оценки / ЕГЭ — сравнение результатов',
  '/olympiads': 'Олимпиады',
  '/attendance': 'Посещаемость',
  '/volunteering': 'Активность (СПД)',
  '/risks': 'Риски — ML-прогноз',
  '/students': 'Ученики',
  '/classes': 'Классы',
  '/reports': 'Отчёты',
  '/settings': 'Настройки',
  '/users': 'Пользователи',
  '/grades': 'Оценки (журнал)',
  '/messenger': 'Внутренний мессенджер',
  '/support': 'Поддержка',
  '/action-log': 'Журнал действий',
  '/teaching-actions': 'Учебные действия',
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'Мониторинг школы'

  return (
    <div className={`app-shell${collapsed ? ' is-collapsed' : ''}`}>
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onNavigate={() => setSidebarOpen(false)}
      />
      <div className="main">
        <Topbar title={title} onBurger={() => setSidebarOpen((v) => !v)} />
        <Outlet />
      </div>
    </div>
  )
}
