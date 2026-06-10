import type { ReactNode } from 'react'
import type { GradeLevel, ParallelFilterValue, TrendDirection } from '../types'
import { GRADE_LEVELS } from '../types'
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

export function TrendArrow({ trend, delta }: { trend: TrendDirection; delta?: number }) {
  const text = delta != null ? ` ${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : ''
  if (trend === 'up') return <span className="trend trend--up" title="Рост">↑{text}</span>
  if (trend === 'down') return <span className="trend trend--down" title="Снижение">↓{text}</span>
  return <span className="trend trend--flat" title="Без изменений">—{text}</span>
}

// ===================== Фильтр по параллели =====================
export type LevelKind = 'high' | 'mid' | 'low'

/** Уровень результата по проценту: высокий / средний / низкий. */
export function levelOf(percent: number): LevelKind {
  if (percent >= 70) return 'high'
  if (percent >= 50) return 'mid'
  return 'low'
}

const LEVEL_COLOR: Record<LevelKind, string> = {
  high: 'var(--green)',
  mid: 'var(--orange)',
  low: 'var(--red)',
}

/** Мини-прогрессбар, ширина и цвет которого соответствуют значению. */
export function LevelBar({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const color = LEVEL_COLOR[levelOf(value)]
  return (
    <div className="mini">
      <span className="mini__val" style={{ color }}>{value}{suffix}</span>
      <span className="mini__track">
        <span className="mini__fill" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </span>
    </div>
  )
}

/** Сегментированный фильтр по параллелям: Все, 5–11. Активная параллель выделена. */
export function ParallelFilter({
  value,
  onChange,
  includeAll = true,
}: {
  value: ParallelFilterValue
  onChange: (v: ParallelFilterValue) => void
  includeAll?: boolean
}) {
  const options: { v: ParallelFilterValue; label: string }[] = [
    ...(includeAll ? [{ v: 'all' as ParallelFilterValue, label: 'Все' }] : []),
    ...GRADE_LEVELS.map((g: GradeLevel) => ({ v: g as ParallelFilterValue, label: String(g) })),
  ]
  return (
    <div className="pfilter" role="tablist" aria-label="Параллель">
      <span className="field__label">Параллель:</span>
      {options.map((o) => (
        <button
          key={String(o.v)}
          className={`pfilter__btn${value === o.v ? ' is-active' : ''}`}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
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

export interface ComparisonRow {
  subject: string
  school: number
  city: number
  region: number
}

/** Таблица сравнения «Школа / Город / Регион» с мини-прогрессбарами по уровню.
 *  На узких экранах превращается в карточки (см. .tbl--cards в CSS). */
export function ComparisonTable({
  subjectHeader,
  rows,
  emptyMessage = 'Нет данных для отображения',
}: {
  subjectHeader: string
  rows: ComparisonRow[]
  emptyMessage?: string
}) {
  if (!rows.length) return <EmptyState message={emptyMessage} />
  return (
    <div className="table-wrap">
      <table className="tbl tbl--compact tbl--cards cmp">
        <thead>
          <tr>
            <th>{subjectHeader}</th>
            <th>Школа №123</th>
            <th>Город</th>
            <th>Регион</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.subject}>
              <td className="td-strong cmp__subject" data-label={subjectHeader}>{r.subject}</td>
              <td data-label="Школа №123"><LevelBar value={r.school} /></td>
              <td data-label="Город"><LevelBar value={r.city} /></td>
              <td data-label="Регион"><LevelBar value={r.region} /></td>
            </tr>
          ))}
        </tbody>
      </table>
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
