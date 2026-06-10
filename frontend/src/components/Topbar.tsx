import { ROLE_LABELS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useFilters, YEARS } from '../context/FiltersContext'
import { IconMenu } from './icons'
import { NotificationsBell } from './NotificationsBell'

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
        <NotificationsBell />
        {user && (
          <div className="topbar__user">
            <span className="topbar__avatar">{initials(user.fullName)}</span>
            <span className="topbar__user-meta">
              <span className="topbar__user-name">{user.fullName}</span>
              <span className="topbar__user-role">{ROLE_LABELS[user.role]}</span>
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
