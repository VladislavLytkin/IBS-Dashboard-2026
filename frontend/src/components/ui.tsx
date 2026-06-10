import type { ReactNode } from 'react'
import type { Trend } from '../types'
import { IconCalendar, IconChevronLeft, IconChevronRight, IconRefresh } from './icons'

/** Селект «Месяц» с иконкой календаря слева (как на дизайне). */
export function MonthSelect({
  value = '2024-05',
  label,
}: { value?: string; label?: string }) {
  return (
    <div className="field">
      {label && <span className="field__label">{label}</span>}
      <div className="select-icon">
        <IconCalendar width={16} height={16} />
        <select className="select select--with-icon" defaultValue={value}>
          <option value="2024-05">Май 2024</option>
          <option value="2024-04">Апрель 2024</option>
          <option value="2024-03">Март 2024</option>
        </select>
      </div>
    </div>
  )
}

/** CSS-класс цвета итогового балла (зелёный/оранжевый/красный). */
export function scoreClass(score: number): string {
  if (score >= 75) return 'score-green'
  if (score >= 65) return 'score-orange'
  return 'score-red'
}

export function TrendArrow({ trend }: { trend: Trend }) {
  if (trend === 'up') return <span className="trend trend--up" title="Рост">↑</span>
  if (trend === 'down') return <span className="trend trend--down" title="Снижение">↓</span>
  return <span className="trend trend--flat" title="Без изменений">—</span>
}

export function Medal({ place }: { place: number }) {
  const map: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
  if (map[place]) return <span className="medal">{map[place]}</span>
  return <span>{place}</span>
}

export function Card({ title, children, className, headerRight }: {
  title?: string
  children: ReactNode
  className?: string
  headerRight?: ReactNode
}) {
  return (
    <section className={`card card--pad${className ? ' ' + className : ''}`}>
      {(title || headerRight) && (
        <div className="flex-between" style={{ marginBottom: 16 }}>
          {title && <h2 className="card__title" style={{ margin: 0 }}>{title}</h2>}
          {headerRight}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageFooter() {
  return (
    <footer className="page-footer">
      <span>© 2024 Школа №123</span>
      <span className="page-footer__refresh">
        Данные обновлены: сегодня, 10:30 <IconRefresh width={15} height={15} />
      </span>
    </footer>
  )
}

export function Pagination({ total, perPage = 12 }: { total: number; perPage?: number }) {
  const pages = Math.ceil(total / perPage)
  return (
    <div className="pager">
      <button disabled aria-label="Назад"><IconChevronLeft width={16} height={16} /></button>
      <button className="is-active">1</button>
      {pages > 1 && <button>2</button>}
      {pages > 2 && <button>3</button>}
      {pages > 4 && <span className="pager__dots">…</span>}
      {pages > 3 && <button>{pages}</button>}
      <button aria-label="Вперёд"><IconChevronRight width={16} height={16} /></button>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 14h8" />
      </svg>
      <p>{message}</p>
    </div>
  )
}
