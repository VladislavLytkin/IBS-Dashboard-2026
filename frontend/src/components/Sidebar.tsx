import { NavLink } from 'react-router-dom'
import {
  IconChart, IconClock, IconExam, IconGlobe, IconGrades, IconHome,
  IconOlympiad, IconReport, IconRisk, IconSchool, IconSettings,
} from './icons'
import type { ComponentType, SVGProps } from 'react'

interface NavItem {
  to: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Главный экран', Icon: IconHome },
  { to: '/grades', label: 'Оценки', Icon: IconGrades },
  { to: '/olympiads', label: 'Рейтинг олимпиад', Icon: IconOlympiad },
  { to: '/volunteering', label: 'СПД (волонтёрство)', Icon: IconGlobe },
  { to: '/attendance', label: 'Посещаемость', Icon: IconClock },
  { to: '/exams', label: 'Экзамены', Icon: IconExam },
  { to: '/risks', label: 'Риски', Icon: IconRisk },
  { to: '/student-rating', label: 'Итоговый рейтинг учеников', Icon: IconChart },
]

const SECONDARY_NAV: NavItem[] = [
  { to: '/reports', label: 'Отчёты', Icon: IconReport },
  { to: '/settings', label: 'Настройки', Icon: IconSettings },
]

interface SidebarProps {
  open: boolean
  onNavigate: () => void
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const renderLink = ({ to, label, Icon }: NavItem) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
      onClick={onNavigate}
    >
      <Icon />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <>
      {open && <div className="sidebar__backdrop" onClick={onNavigate} />}
      <aside className={`sidebar${open ? ' is-open' : ''}`}>
        <div className="sidebar__brand">
          <span className="sidebar__logo"><IconSchool width={22} height={22} /></span>
          <div>
            <div className="sidebar__brand-title">Школа №123</div>
            <div className="sidebar__brand-sub">Мониторинг школы</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {MAIN_NAV.map(renderLink)}
          <div className="sidebar__divider" />
          {SECONDARY_NAV.map(renderLink)}
        </nav>

        <div className="sidebar__footer">© 2024 Школа №123</div>
      </aside>
    </>
  )
}
