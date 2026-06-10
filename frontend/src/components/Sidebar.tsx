import { NavLink, useNavigate } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABELS, type Role } from '../api/types'
import {
  IconChart, IconChevronLeft, IconChevronRight, IconClock, IconExam, IconGlobe, IconHome,
  IconLogout, IconOlympiad, IconReport, IconRisk, IconSchool, IconSettings, IconStudent, IconUsers,
} from './icons'

interface NavItem {
  to: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  roles?: Role[] // если задано — пункт виден только этим ролям
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Главная', Icon: IconHome },
  { to: '/final-rating', label: 'Итоговый рейтинг', Icon: IconChart },
  { to: '/exams', label: 'Оценки / ЕГЭ', Icon: IconExam },
  { to: '/olympiads', label: 'Олимпиады', Icon: IconOlympiad },
  { to: '/attendance', label: 'Посещаемость', Icon: IconClock },
  { to: '/volunteering', label: 'Активность', Icon: IconGlobe },
  { to: '/risks', label: 'Риски', Icon: IconRisk },
  { to: '/students', label: 'Ученики', Icon: IconStudent },
  { to: '/classes', label: 'Классы', Icon: IconUsers },
]

const SECONDARY_NAV: NavItem[] = [
  { to: '/reports', label: 'Отчёты', Icon: IconReport },
  { to: '/settings', label: 'Настройки', Icon: IconSettings },
  { to: '/users', label: 'Пользователи', Icon: IconUsers, roles: ['ADMIN'] },
]

interface SidebarProps {
  open: boolean
  collapsed: boolean
  onToggleCollapse: () => void
  onNavigate: () => void
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export function Sidebar({ open, collapsed, onToggleCollapse, onNavigate }: SidebarProps) {
  const { user, hasRole, logout } = useAuth()
  const navigate = useNavigate()

  const doLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const renderLink = ({ to, label, Icon, roles }: NavItem) => {
    if (roles && !hasRole(...roles)) return null
    return (
      <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : undefined}
        className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`} onClick={onNavigate}>
        <Icon />
        <span className="sidebar__label">{label}</span>
      </NavLink>
    )
  }

  return (
    <>
      {open && <div className="sidebar__backdrop" onClick={onNavigate} />}
      <aside className={`sidebar${open ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}`}>
        <div className="sidebar__brand">
          <span className="sidebar__logo"><IconSchool width={22} height={22} /></span>
          <div className="sidebar__label">
            <div className="sidebar__brand-title">Школа №123</div>
            <div className="sidebar__brand-sub">Мониторинг школы</div>
          </div>
          <button className="sidebar__collapse" onClick={onToggleCollapse} aria-label="Свернуть меню">
            {collapsed ? <IconChevronRight width={18} height={18} /> : <IconChevronLeft width={18} height={18} />}
          </button>
        </div>

        <nav className="sidebar__nav">
          {MAIN_NAV.map(renderLink)}
          <div className="sidebar__divider" />
          {SECONDARY_NAV.map(renderLink)}
        </nav>

        {user && (
          <div className="sidebar__profile">
            <span className="topbar__avatar">{initials(user.fullName)}</span>
            <div className="sidebar__label sidebar__profile-meta">
              <div className="sidebar__profile-name">{user.fullName}</div>
              <div className="sidebar__profile-role">{ROLE_LABELS[user.role]}</div>
            </div>
            <button className="sidebar__logout" onClick={doLogout} title="Выйти" aria-label="Выйти">
              <IconLogout width={18} height={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
