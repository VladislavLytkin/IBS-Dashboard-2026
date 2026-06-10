import { ROLE_LABELS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useFilters, YEARS } from '../context/FiltersContext'
import { useTheme } from '../context/ThemeContext'
import { IconMenu, IconMoon, IconSun } from './icons'
import { NotificationsBell } from './NotificationsBell'
import { ProfileModal } from './ProfileModal'
import { useState } from 'react'

interface TopbarProps {
  title: string
  onBurger: () => void
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export function Topbar({ title, onBurger }: TopbarProps) {
  const { user } = useAuth()
  const { year, setYear } = useFilters()
  const { theme, toggleTheme } = useTheme()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header className="topbar">
      <button className="topbar__burger" onClick={onBurger} aria-label="Меню"><IconMenu /></button>
      <h1 className="topbar__title">{title}</h1>

      <div className="topbar__right">
        <div className="field">
          <span className="field__label">Год:</span>
          <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ minWidth: 100 }}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button className="topbar__icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}>
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <NotificationsBell />
        {user && (
          <div className="topbar__user">
            <span className="topbar__avatar">{initials(user.fullName)}</span>
            <span className="topbar__user-meta">
              <span className="topbar__user-name">{user.fullName}</span>
              <button className="topbar__user-role" onClick={() => setProfileOpen(true)}>{ROLE_LABELS[user.role]}</button>
            </span>
          </div>
        )}
      </div>
      {user && profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
    </header>
  )
}
