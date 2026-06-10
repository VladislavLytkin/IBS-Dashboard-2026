import { IconBell, IconMenu } from './icons'

interface TopbarProps {
  title: string
  onBurger: () => void
}

export function Topbar({ title, onBurger }: TopbarProps) {
  return (
    <header className="topbar">
      <button className="topbar__burger" onClick={onBurger} aria-label="Меню">
        <IconMenu />
      </button>
      <h1 className="topbar__title">{title}</h1>

      <div className="topbar__right">
        <div className="topbar__bell">
          <IconBell />
          <span className="topbar__bell-badge">3</span>
        </div>
        <span className="topbar__date">20 мая 2024, 10:30</span>
        <div className="topbar__user">
          <span className="topbar__avatar">АД</span>
          <span className="topbar__user-name">Администратор ▾</span>
        </div>
      </div>
    </header>
  )
}
