import { NavLink, useNavigate } from 'react-router-dom'
import { useState, type ComponentType, type SVGProps } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABELS, type Role } from '../api/types'
import {
  IconChart, IconChevronLeft, IconChevronRight, IconClock, IconExam, IconGlobe, IconGrades, IconHelp,
  IconHome, IconLogout, IconOlympiad, IconReport, IconRisk, IconSchool, IconSettings, IconStudent, IconUsers,
} from './icons'
import { ProfileModal } from './ProfileModal'

interface NavItem {
  to: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  roles?: Role[] // если задано — пункт виден только этим ролям
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Главная', Icon: IconHome },
  { to: '/final-rating', label: 'Итоговый рейтинг', Icon: IconChart, roles: ['DIRECTOR', 'HEAD_TEACHER', 'ANALYST'] },
  { to: '/exams', label: 'Экзамены', Icon: IconExam, roles: ['DIRECTOR', 'HEAD_TEACHER', 'ANALYST'] },
  { to: '/grades', label: 'Оценки', Icon: IconGrades, roles: ['HEAD_TEACHER', 'TEACHER', 'STUDENT'] },
  { to: '/student-exams', label: 'Экзамены ученика', Icon: IconExam, roles: ['HEAD_TEACHER', 'TEACHER', 'STUDENT'] },
  { to: '/olympiads', label: 'Олимпиады', Icon: IconOlympiad, roles: ['ADMIN', 'DIRECTOR', 'HEAD_TEACHER', 'TEACHER', 'STUDENT'] },
  { to: '/attendance', label: 'Пропуски', Icon: IconClock, roles: ['HEAD_TEACHER', 'TEACHER', 'STUDENT'] },
  { to: '/volunteering', label: 'Активность (СПД)', Icon: IconGlobe, roles: ['ADMIN', 'HEAD_TEACHER', 'TEACHER', 'STUDENT'] },
  { to: '/risks', label: 'Риски', Icon: IconRisk, roles: ['DIRECTOR', 'HEAD_TEACHER', 'TEACHER', 'STUDENT', 'ANALYST'] },
  { to: '/requests', label: 'Заявки', Icon: IconReport, roles: ['DIRECTOR', 'HEAD_TEACHER', 'ADMIN', 'ANALYST', 'TEACHER'] },
  { to: '/students', label: 'Ученики', Icon: IconStudent, roles: ['HEAD_TEACHER', 'TEACHER'] },
  { to: '/classes', label: 'Классы', Icon: IconUsers, roles: ['DIRECTOR', 'HEAD_TEACHER', 'TEACHER'] },
  { to: '/teaching-actions', label: 'Учебные действия', Icon: IconGrades, roles: ['TEACHER', 'HEAD_TEACHER', 'DIRECTOR'] },
  { to: '/messenger', label: 'Мессенджер', Icon: IconReport, roles: ['DIRECTOR', 'HEAD_TEACHER', 'TEACHER', 'STUDENT', 'ADMIN'] },
]

const SECONDARY_NAV: NavItem[] = [
  { to: '/reports', label: 'Отчёты', Icon: IconReport, roles: ['DIRECTOR', 'ADMIN', 'ANALYST'] },
  { to: '/support', label: 'Поддержка', Icon: IconHelp, roles: ['ADMIN', 'DIRECTOR', 'HEAD_TEACHER', 'TEACHER', 'STUDENT'] },
  { to: '/action-log', label: 'Журнал действий', Icon: IconChart, roles: ['ADMIN', 'DIRECTOR'] },
  // Настройки доступны всем: персонализация цветов — личная, системные секции внутри страницы по ролям.
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
  const [profileOpen, setProfileOpen] = useState(false)

  const doLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const renderLink = ({ to, label, Icon, roles }: NavItem) => {
    if (roles && !hasRole(...roles)) return null
    const settingsCls = to === '/settings' ? ' sidebar__link--settings' : ''
    return (
      <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : undefined}
        className={({ isActive }) => `sidebar__link${settingsCls}${isActive ? ' is-active' : ''}`} onClick={onNavigate}>
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
            <button className="sidebar__label sidebar__profile-meta sidebar__profile-button" onClick={() => setProfileOpen(true)}>
              <div className="sidebar__profile-name">{user.fullName}</div>
              <div className="sidebar__profile-role">{ROLE_LABELS[user.role]}</div>
            </button>
            <button className="sidebar__logout" onClick={doLogout} title="Выйти" aria-label="Выйти">
              <IconLogout width={18} height={18} />
            </button>
          </div>
        )}
      </aside>
      {user && profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
    </>
  )
}
