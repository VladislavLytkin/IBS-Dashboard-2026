import { useMemo, useState, type FormEvent } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, LabelList,
} from 'recharts'
import type { SpdApplication, SpdApplicationStatus, SpdEvent } from '../api/types'
import { spdService } from '../services'
import { useAuth } from '../auth/AuthContext'
import { useApi } from '../hooks/useApi'
import { VOLUNTEER_HOURS, VOLUNTEER_SCHOOL_DYNAMICS } from '../data/volunteering'
import { IconCalendar } from '../components/icons'
import { Card, EmptyState, PageFooter } from '../components/ui'

const APP_STATUS_LABEL: Record<SpdApplicationStatus, string> = {
  pending: 'На проверке',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}
const APP_STATUS_BADGE: Record<SpdApplicationStatus, string> = {
  pending: 'badge badge--risk-mid',
  approved: 'badge badge--risk-low',
  rejected: 'badge badge--risk-high',
}

const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

/** Учебный год по дате: сентябрь–август. */
function academicYearKey(d: Date): string {
  const start = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1
  return `${start}/${start + 1}`
}

/** Четверть учебного года: I (сен–окт), II (ноя–дек), III (янв–мар), IV (апр–май). */
function quarterOf(d: Date): { num: string; order: number } | null {
  const m = d.getMonth()
  if (m === 8 || m === 9) return { num: 'I', order: 1 }
  if (m === 10 || m === 11) return { num: 'II', order: 2 }
  if (m >= 0 && m <= 2) return { num: 'III', order: 3 }
  if (m === 3 || m === 4) return { num: 'IV', order: 4 }
  return null
}

interface PeriodOption {
  id: string
  label: string
  sortKey: string
  match: (dateStr: string) => boolean
}

/** Строит список периодов строго по датам имеющихся событий: месяцы, четверти, учебные годы. */
function buildPeriods(events: SpdEvent[]): PeriodOption[] {
  const byId = new Map<string, PeriodOption>()
  for (const e of events) {
    const d = new Date(e.date)
    if (Number.isNaN(d.getTime())) continue

    const monthId = `m-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byId.has(monthId)) {
      const y = d.getFullYear()
      const m = d.getMonth()
      byId.set(monthId, {
        id: monthId,
        label: `${MONTHS_RU[m]} ${y}`,
        sortKey: `${y}-${String(m + 1).padStart(2, '0')}-2`,
        match: (s) => {
          const x = new Date(s)
          return x.getFullYear() === y && x.getMonth() === m
        },
      })
    }

    const ay = academicYearKey(d)
    const q = quarterOf(d)
    if (q) {
      const qId = `q-${ay}-${q.order}`
      if (!byId.has(qId)) {
        byId.set(qId, {
          id: qId,
          label: `${q.num} четверть ${ay}`,
          sortKey: `${ay.slice(0, 4)}-q${q.order}-1`,
          match: (s) => {
            const x = new Date(s)
            return academicYearKey(x) === ay && quarterOf(x)?.order === q.order
          },
        })
      }
    }

    const ayId = `y-${ay}`
    if (!byId.has(ayId)) {
      byId.set(ayId, {
        id: ayId,
        label: `${ay} учебный год`,
        sortKey: `${ay.slice(0, 4)}-0`,
        match: (s) => academicYearKey(new Date(s)) === ay,
      })
    }
  }
  return [...byId.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

const fmtDate = (s: string) => new Date(s).toLocaleDateString('ru-RU')
const classLabel = (id: string) => id.replace(/^\d+-/, '')

export function VolunteeringPage() {
  const { user } = useAuth()
  const [scope, setScope] = useState<'month' | 'year'>('month')
  const [periodId, setPeriodId] = useState<string>('all')

  const events = useApi(() => spdService.events(), [])
  const applications = useApi(() => spdService.applications(), [])
  const allEvents = useMemo(() => events.data ?? [], [events.data])

  const periods = useMemo(() => buildPeriods(allEvents), [allEvents])
  const period = periods.find((p) => p.id === periodId)
  const visibleEvents = period ? allEvents.filter((e) => period.match(e.date)) : allEvents
  const eventById = useMemo(() => new Map(allEvents.map((e) => [e.id, e])), [allEvents])

  const totalHours = visibleEvents.reduce((s, e) => s + e.hours, 0)
  const isStudent = user?.role === 'STUDENT'
  const canReview = user?.role === 'ADMIN' || user?.role === 'HEAD_TEACHER'

  const reloadAll = () => {
    applications.reload()
  }

  return (
    <div className="page">
      <div className="toolbar">
        <div className="field">
          <span className="field__label">Период:</span>
          <div className="select-icon">
            <IconCalendar width={16} height={16} />
            <select className="select select--with-icon" value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              <option value="all">Все периоды</option>
              {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <Card title={`События СПД${period ? ` · ${period.label}` : ''}`}>
        {events.loading ? <EmptyState message="Загрузка событий…" /> : events.error ? <EmptyState message={events.error} /> : visibleEvents.length === 0 ? (
          <EmptyState message="За выбранный период событий СПД нет." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="tbl tbl--compact tbl--cards">
                <thead>
                  <tr><th>Событие</th><th>Тип</th><th className="td-num">Дата</th><th className="td-num">Часы</th><th>Организатор</th><th>Классы</th></tr>
                </thead>
                <tbody>
                  {visibleEvents.map((e) => (
                    <tr key={e.id}>
                      <td className="td-strong" data-label="Событие">{e.title}</td>
                      <td data-label="Тип"><span className="badge badge--gorod">{e.type}</span></td>
                      <td className="td-num text-muted" data-label="Дата">{fmtDate(e.date)}</td>
                      <td className="td-num td-strong" data-label="Часы">{e.hours}</td>
                      <td data-label="Организатор">{e.organizer}</td>
                      <td data-label="Классы">{e.classIds.map(classLabel).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex-between" style={{ marginTop: 14, fontWeight: 600 }}>
              <span>Всего событий: {visibleEvents.length}</span>
              <span>Всего часов: {totalHours}</span>
            </div>
          </>
        )}
      </Card>

      {isStudent && (
        <div className="grid grid-2-wide">
          <StudentSpdForm events={allEvents} onCreated={reloadAll} />
          <Card title="Мои заявки на СПД">
            <ApplicationsTable
              rows={applications.data ?? []}
              loading={applications.loading}
              eventById={eventById}
              canReview={false}
              onReload={reloadAll}
              showStudent={false}
            />
          </Card>
        </div>
      )}

      {!isStudent && (
        <Card title={canReview ? 'Заявки учеников на СПД' : 'Заявки учеников моих классов'}>
          <ApplicationsTable
            rows={applications.data ?? []}
            loading={applications.loading}
            eventById={eventById}
            canReview={canReview}
            onReload={reloadAll}
            showStudent
          />
        </Card>
      )}

      {!isStudent && (
        <div className="grid grid-2-wide">
          <Card title="Сумма часов по ученикам" headerRight={
            <div className="segment">
              <button className={scope === 'month' ? 'is-active' : ''} onClick={() => setScope('month')}>За месяц</button>
              <button className={scope === 'year' ? 'is-active' : ''} onClick={() => setScope('year')}>За год</button>
            </div>
          }>
            <div className="table-wrap">
              <table className="tbl tbl--compact">
                <thead>
                  <tr>
                    <th>№</th><th>Ученик</th><th>Класс</th>
                    <th className="td-num">За месяц</th><th className="td-num">За год</th>
                  </tr>
                </thead>
                <tbody>
                  {VOLUNTEER_HOURS.map((h, i) => (
                    <tr key={h.student}>
                      <td className="text-muted">{i + 1}</td>
                      <td className="td-strong">{h.student}</td>
                      <td>{h.className}</td>
                      <td className={'td-num' + (scope === 'month' ? ' td-strong' : ' text-muted')}>{h.month}</td>
                      <td className={'td-num' + (scope === 'year' ? ' td-strong' : ' text-muted')}>{h.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Динамика часов по школе">
            <div className="chart-box" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={VOLUNTEER_SCHOOL_DYNAMICS} margin={{ top: 24, right: 20, left: -10, bottom: 4 }}>
                  <CartesianGrid vertical={false} stroke="#eef1f5" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 250]} ticks={[0, 50, 150, 250]} />
                  <Line type="monotone" dataKey="value" stroke="var(--blue)" strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--blue)' }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="value" position="top" fontSize={12} fill="#334155" />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      <PageFooter />
    </div>
  )
}

function StudentSpdForm({ events, onCreated }: { events: SpdEvent[]; onCreated: () => void }) {
  const [eventId, setEventId] = useState('')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setError(null)
    try {
      await spdService.createApplication({ eventId, comment })
      setStatus('Заявка отправлена — статус: На проверке')
      setEventId('')
      setComment('')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку')
    }
  }

  return (
    <Card title="Подать заявку на СПД">
      <form className="form-grid form-grid--single" onSubmit={submit}>
        <label className="setting-field">
          <span className="field__label">Событие СПД</span>
          <select className="select" required value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Выберите событие</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title} · {fmtDate(e.date)} · {e.hours} ч</option>)}
          </select>
        </label>
        <label className="setting-field">
          <span className="field__label">Комментарий (необязательно)</span>
          <textarea className="input textarea" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Чем хотите помочь, пожелания по задачам…" />
        </label>
        <div className="flex" style={{ gap: 12 }}>
          <button className="btn-primary" type="submit" disabled={!eventId}>Отправить заявку</button>
          {status && <span className="text-green">{status}</span>}
          {error && <span className="text-red">{error}</span>}
        </div>
      </form>
    </Card>
  )
}

function ApplicationsTable({ rows, loading, eventById, canReview, onReload, showStudent }: {
  rows: SpdApplication[]
  loading: boolean
  eventById: Map<string, SpdEvent>
  canReview: boolean
  onReload: () => void
  showStudent: boolean
}) {
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  if (loading) return <EmptyState message="Загрузка заявок…" />
  if (rows.length === 0) return <EmptyState message="Заявок на СПД пока нет." />

  return (
    <div className="table-wrap">
      <table className="tbl tbl--compact tbl--cards">
        <thead>
          <tr>
            {showStudent && <th>Ученик</th>}
            <th>Событие</th><th className="td-num">Дата</th><th>Комментарий</th><th>Статус</th>
            {canReview && <th>Действия</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const event = eventById.get(a.eventId)
            return (
              <tr key={a.id}>
                {showStudent && <td className="td-strong" data-label="Ученик">{a.studentName}<div className="text-muted">{classLabel(a.classId)}</div></td>}
                <td data-label="Событие">{event?.title ?? a.eventId}{event && <div className="text-muted">{event.type} · {event.hours} ч</div>}</td>
                <td className="td-num text-muted" data-label="Дата">{event ? fmtDate(event.date) : '—'}</td>
                <td data-label="Комментарий">{a.comment || '—'}</td>
                <td data-label="Статус">
                  <span className={APP_STATUS_BADGE[a.status]}>{APP_STATUS_LABEL[a.status]}</span>
                  {a.status === 'rejected' && a.rejectionReason && <div className="text-red">{a.rejectionReason}</div>}
                </td>
                {canReview && (
                  <td data-label="Действия">
                    {a.status === 'pending' ? (
                      <div className="action-stack">
                        <button className="btn btn--ghost-blue" onClick={async () => { await spdService.reviewApplication(a.id, 'approved'); onReload() }}>Одобрить</button>
                        <button className="btn" onClick={() => setRejectingId(a.id)}>Отклонить</button>
                        {rejectingId === a.id && (
                          <div className="reject-box">
                            <input className="input" placeholder="Причина отклонения" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                            <button className="btn-primary" onClick={async () => { await spdService.reviewApplication(a.id, 'rejected', rejectReason); setRejectingId(null); setRejectReason(''); onReload() }}>Сохранить</button>
                          </div>
                        )}
                      </div>
                    ) : <span className="text-muted">Проверено</span>}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
