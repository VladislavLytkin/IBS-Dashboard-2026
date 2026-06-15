import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { Card, EmptyState } from '../components/ui'
import {
  loadSyntheticRequests, ACTIONABLE_STATUSES,
  REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS,
  type RequestType, type RequestStatus,
} from '../data/syntheticRequests'

/** Цвет статуса для бейджа. */
const STATUS_TONE: Record<RequestStatus, string> = {
  draft: 'badge--req-muted',
  pending: 'badge--req-warn',
  in_review: 'badge--req-warn',
  needs_revision: 'badge--req-warn',
  approved: 'badge--req-ok',
  rejected: 'badge--req-bad',
}

const PRIORITY_LABEL: Record<string, string> = { low: 'низкий', medium: 'средний', high: 'высокий' }

/**
 * Страница «Заявки» — административные заявки (олимпиады и СПД-проекты).
 * Фильтр по типу читается из URL (?type=...), статус и класс — локально.
 */
export function RequestsPage() {
  const [params, setParams] = useSearchParams()
  const typeParam = params.get('type') as RequestType | null
  const [status, setStatus] = useState<RequestStatus | 'all' | 'actionable'>('all')
  const [classId, setClassId] = useState<string>('all')

  const { data, loading, error } = useApi(() => loadSyntheticRequests(), [])
  const all = data ?? []

  // Список классов для фильтра.
  const classes = useMemo(() => [...new Set(all.map((r) => r.classId))].sort(), [all])

  const rows = all.filter((r) => {
    if (typeParam && r.type !== typeParam) return false
    if (status === 'actionable' && !ACTIONABLE_STATUSES.includes(r.status)) return false
    if (status !== 'all' && status !== 'actionable' && r.status !== status) return false
    if (classId !== 'all' && r.classId !== classId) return false
    return true
  })

  const setType = (value: RequestType | 'all') => {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('type')
    else next.set('type', value)
    setParams(next)
  }

  const TYPE_OPTIONS: { v: RequestType | 'all'; label: string }[] = [
    { v: 'all', label: 'Все' },
    { v: 'olympiad_result', label: 'Результаты олимпиад' },
    { v: 'spd_project_registration', label: 'Новые СПД-проекты' },
    { v: 'spd_project_participation', label: 'Участие в СПД-проектах' },
  ]

  return (
    <div className="page">
      <Card title="Заявки">
        <p className="text-muted" style={{ marginTop: -8 }}>
          Административные заявки: результаты олимпиад, регистрация и участие в СПД-проектах.
          На проверку — статусы «Ожидает», «На рассмотрении», «На доработку».
        </p>

        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div className="pfilter" role="tablist" aria-label="Тип заявки">
            <span className="field__label">Тип:</span>
            {TYPE_OPTIONS.map((o) => (
              <button
                key={o.v}
                className={`pfilter__btn${(typeParam ?? 'all') === o.v ? ' is-active' : ''}`}
                aria-pressed={(typeParam ?? 'all') === o.v}
                onClick={() => setType(o.v)}
              >
                {o.label}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field__label">Статус:</span>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">Все</option>
              <option value="actionable">Только на проверку</option>
              {(Object.keys(REQUEST_STATUS_LABELS) as RequestStatus[]).map((s) => (
                <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Класс:</span>
            <select className="select" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="all">Все</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>

        {loading ? <EmptyState message="Загрузка…" />
          : error ? <EmptyState message={error} />
          : rows.length === 0 ? <EmptyState message="Заявок по выбранным фильтрам нет." />
          : (
            <div className="table-wrap">
              <table className="tbl tbl--compact">
                <thead>
                  <tr>
                    <th>ID</th><th>Дата</th><th>Тип</th><th>Заявитель</th>
                    <th>Класс</th><th>Статус</th><th>Приоритет</th><th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.requestId}>
                      <td className="td-strong">{r.requestId}</td>
                      <td>{r.createdAt}</td>
                      <td>{REQUEST_TYPE_LABELS[r.type]}</td>
                      <td>{r.applicantName}</td>
                      <td>{r.classId}</td>
                      <td><span className={`badge ${STATUS_TONE[r.status]}`}>{REQUEST_STATUS_LABELS[r.status]}</span></td>
                      <td>{PRIORITY_LABEL[r.priority]}</td>
                      <td><button className="btn btn--ghost-blue" disabled>Рассмотреть</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  )
}
