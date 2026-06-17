import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { OlympiadApplication, OlympiadApplicationStatus, OlympiadCatalogItem } from '../api/types'
import { ApiError } from '../api/client'
import type { ParallelFilterValue } from '../types'
import { olympiadsService } from '../services'
import { useAuth } from '../auth/AuthContext'
import { useFilters } from '../context/FiltersContext'
import { useApi } from '../hooks/useApi'
import { IconInfo } from '../components/icons'
import { Card, ComparisonTable, EmptyState, Medal, ParallelFilter, scoreClass } from '../components/ui'

export function OlympiadsPage() {
  const { user } = useAuth()
  const { year } = useFilters()
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const [appStatus, setAppStatus] = useState<OlympiadApplicationStatus | 'all'>('all')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const grade = parallel === 'all' ? 'all' : parallel

  const comparison = useApi(() => olympiadsService.comparison({ year, grade }), [year, grade])
  const rating = useApi(() => olympiadsService.rating({ year, grade }), [year, grade])
  const applications = useApi(() => olympiadsService.applications(), [])
  const rows = comparison.data?.rows ?? []
  const ranking = rating.data ?? []
  const appRows = (applications.data ?? []).filter((a) => appStatus === 'all' || a.status === appStatus)

  const avgIndex = useMemo(
    () => (ranking.length ? Math.round((ranking.reduce((s, r) => s + r.index, 0) / ranking.length) * 10) / 10 : 0),
    [ranking],
  )

  if (user?.role === 'STUDENT') {
    return (
      <div className="page">
        <StudentApplicationForm userName={user.fullName} classId={user.classIds?.[0] ?? `${year}-11Б`} onCreated={applications.reload} />
        <ApplicationsCard
          role={user.role}
          rows={appRows}
          loading={applications.loading}
          appStatus={appStatus}
          setAppStatus={setAppStatus}
          onReload={() => { applications.reload(); rating.reload() }}
          rejectingId={rejectingId}
          setRejectingId={setRejectingId}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="toolbar"><ParallelFilter value={parallel} onChange={setParallel} /></div>

      <div className="grid grid-4">
        <MiniStat label="Классов в рейтинге" value={String(ranking.length)} color="blue" />
        <MiniStat label="Средний олимп. индекс" value={`${avgIndex}%`} color="purple" />
        <MiniStat label="Лучший класс" value={ranking[0]?.classId ?? '—'} color="green" />
        <MiniStat label="Направлений" value={String(rows.length)} color="orange" />
      </div>

      <div className="grid grid-2-wide">
        <Card title={`Сравнение с городом и регионом · ${year}`}>
          {comparison.loading ? <EmptyState message="Загрузка…" /> : comparison.error ? <EmptyState message={comparison.error} /> : (
            <>
              <ComparisonTable subjectHeader="Предмет / направление" rows={rows} />
              <div className="note" style={{ marginTop: 14 }}>
                <IconInfo width={16} height={16} />
                Олимпиадный индекс — сводный показатель по направлению. Синтетические данные для прототипа.
              </div>
            </>
          )}
        </Card>

        <Card title="Рейтинг классов по олимпиадному индексу">
          {rating.loading ? <EmptyState message="Загрузка…" /> : rating.error ? <EmptyState message={rating.error} /> : ranking.length === 0 ? (
            <EmptyState message="Нет данных за выбранный период." />
          ) : (
            <div className="table-wrap table-wrap--olympiad-rating">
              <table className="tbl tbl--compact olympiad-rating-table">
                <thead>
                  <tr><th className="td-num">Место</th><th>Класс</th><th className="td-num">Участие</th><th className="td-num">Призёры</th><th className="td-num">Индекс</th></tr>
                </thead>
                <tbody>
                  {ranking.slice(0, 16).map((r, i) => (
                    <tr key={r.classId + i}>
                      <td className="td-num"><Medal place={i + 1} /></td>
                      <td className="td-strong">{r.classId}</td>
                      <td className="td-num text-muted">{r.participationPct}%</td>
                      <td className="td-num text-muted">{r.awardPct}%</td>
                      <td className={'td-num ' + scoreClass(r.index)}>{r.index}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
        <ApplicationsCard
          role={user.role}
          rows={appRows}
          loading={applications.loading}
          appStatus={appStatus}
          setAppStatus={setAppStatus}
          onReload={() => { applications.reload(); rating.reload() }}
          rejectingId={rejectingId}
          setRejectingId={setRejectingId}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
        />
      )}

    </div>
  )
}

function ApplicationsCard({
  role, rows, loading, appStatus, setAppStatus, onReload, rejectingId, setRejectingId, rejectReason, setRejectReason,
}: {
  role: 'ADMIN' | 'TEACHER' | 'STUDENT'
  rows: OlympiadApplication[]
  loading: boolean
  appStatus: OlympiadApplicationStatus | 'all'
  setAppStatus: (v: OlympiadApplicationStatus | 'all') => void
  onReload: () => void
  rejectingId: string | null
  setRejectingId: (id: string | null) => void
  rejectReason: string
  setRejectReason: (v: string) => void
}) {
  return (
    <Card
      title={role === 'ADMIN' ? 'Валидация олимпиадных заявок' : role === 'STUDENT' ? 'Мои олимпиадные заявки' : 'Заявки моих учеников'}
      headerRight={
        <select className="select" value={appStatus} onChange={(e) => setAppStatus(e.target.value as typeof appStatus)}>
          <option value="all">Все статусы</option>
          <option value="pending">Ожидает проверки</option>
          <option value="approved">Подтверждена</option>
          <option value="rejected">Отклонена</option>
        </select>
      }
    >
      {loading ? <EmptyState message="Загрузка заявок…" /> : rows.length === 0 ? <EmptyState message="Заявок по выбранному фильтру нет." /> : (
        <div className="table-wrap">
          <table className="tbl tbl--compact tbl--cards">
            <thead><tr><th>Олимпиада</th><th>Ученик</th><th>Предмет</th><th>Дата</th><th>Результат</th><th>Статус</th>{role === 'ADMIN' && <th>Действия</th>}</tr></thead>
            <tbody>{rows.map((a) => (
              <tr key={a.id}>
                <td className="td-strong" data-label="Олимпиада">{a.title}<div className="text-muted">{a.level}</div></td>
                <td data-label="Ученик">{a.studentName}<div className="text-muted">{a.classId.replace(/^\d+-/, '')}</div></td>
                <td data-label="Предмет">{a.subject}</td>
                <td data-label="Дата">{new Date(a.participationDate).toLocaleDateString('ru-RU')}</td>
                <td data-label="Результат">{a.result}<div className="text-muted">{a.placeOrDegree || '—'}</div></td>
                <td data-label="Статус"><StatusBadge status={a.status} />{a.rejectionReason && <div className="text-red">{a.rejectionReason}</div>}</td>
                {role === 'ADMIN' && (
                  <td data-label="Действия">
                    {a.status === 'pending' ? (
                      <div className="action-stack">
                        <button className="btn btn--ghost-blue" onClick={async () => { await olympiadsService.reviewApplication(a.id, 'approved'); onReload() }}>Подтвердить</button>
                        <button className="btn" onClick={() => setRejectingId(a.id)}>Отклонить</button>
                        {rejectingId === a.id && <div className="reject-box"><input className="input" placeholder="Причина отклонения" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /><button className="btn-primary" onClick={async () => { await olympiadsService.reviewApplication(a.id, 'rejected', rejectReason); setRejectingId(null); setRejectReason(''); onReload() }}>Сохранить</button></div>}
                      </div>
                    ) : <span className="text-muted">Проверено</span>}
                  </td>
                )}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

/** Autocomplete-поиск олимпиады по справочнику с возможностью добавить новую. */
function OlympiadSearch({ value, onSelect }: { value: string; onSelect: (item: { name: string; subject?: string }) => void }) {
  const catalog = useApi(() => olympiadsService.catalog(), [])
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', subject: '', officialWebsiteUrl: '' })
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => setQuery(value), [value])
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const items = catalog.data ?? []
  const q = query.trim().toLowerCase()
  const matches = q ? items.filter((o) => o.name.toLowerCase().includes(q) || o.subject.toLowerCase().includes(q)) : items

  const pick = (item: OlympiadCatalogItem) => {
    onSelect({ name: item.name, subject: item.subject })
    setQuery(item.name)
    setOpen(false)
    setAdding(false)
  }

  const urlValid = (() => {
    try {
      const u = new URL(newItem.officialWebsiteUrl)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  })()
  const canAdd = newItem.name.trim().length >= 2 && newItem.subject.trim().length >= 2 && urlValid

  const addNew = async () => {
    setError(null)
    try {
      const created = await olympiadsService.addToCatalog({
        name: newItem.name.trim(),
        subject: newItem.subject.trim(),
        officialWebsiteUrl: newItem.officialWebsiteUrl.trim(),
      })
      catalog.reload()
      pick(created)
      setNewItem({ name: '', subject: '', officialWebsiteUrl: '' })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось добавить олимпиаду')
    }
  }

  return (
    <div className="ac" ref={boxRef}>
      <input
        className="input"
        required
        placeholder="Начните вводить название…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          onSelect({ name: e.target.value })
          setOpen(true)
        }}
      />
      {open && (
        <div className="ac__panel">
          {catalog.loading ? (
            <div className="ac__hint">Загрузка списка…</div>
          ) : (
            <>
              {matches.slice(0, 8).map((o) => (
                <button type="button" key={o.id} className="ac__item" onClick={() => pick(o)}>
                  <span className="ac__name">{o.name}</span>
                  <span className="ac__meta">{o.subject} · <a href={o.officialWebsiteUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>сайт</a></span>
                </button>
              ))}
              {matches.length === 0 && <div className="ac__hint">Ничего не найдено.</div>}
              {!adding ? (
                <button type="button" className="ac__add" onClick={() => { setAdding(true); setNewItem((p) => ({ ...p, name: query.trim() })) }}>
                  + Добавить новую олимпиаду
                </button>
              ) : (
                <div className="ac__form">
                  <input className="input" placeholder="Название олимпиады" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                  <input className="input" placeholder="Предмет" value={newItem.subject} onChange={(e) => setNewItem({ ...newItem, subject: e.target.value })} />
                  <input className="input" type="url" placeholder="Ссылка на официальный сайт (https://…)" value={newItem.officialWebsiteUrl} onChange={(e) => setNewItem({ ...newItem, officialWebsiteUrl: e.target.value })} />
                  {newItem.officialWebsiteUrl && !urlValid && <span className="text-red" style={{ fontSize: 12 }}>Укажите корректную ссылку (http/https)</span>}
                  {error && <span className="text-red" style={{ fontSize: 12 }}>{error}</span>}
                  <div className="flex" style={{ gap: 8 }}>
                    <button type="button" className="btn-primary" disabled={!canAdd} onClick={addNew}>Добавить</button>
                    <button type="button" className="btn" onClick={() => { setAdding(false); setError(null) }}>Отмена</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StudentApplicationForm({ userName, classId, onCreated }: { userName: string; classId: string; onCreated: () => void }) {
  const [form, setForm] = useState({
    studentName: userName,
    classId,
    title: '',
    level: 'школьный',
    subject: 'Математика',
    participationDate: new Date().toISOString().slice(0, 10),
    result: 'участие',
    placeOrDegree: '',
    confirmationUrl: '',
    studentComment: '',
  })
  const [status, setStatus] = useState<string | null>(null)
  const update = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await olympiadsService.createApplication(form)
    setStatus('Заявка отправлена на проверку')
    update({ title: '', placeOrDegree: '', confirmationUrl: '', studentComment: '' })
    onCreated()
  }

  return (
    <Card title="Подать заявку на олимпиаду">
      <form className="form-grid" onSubmit={submit}>
        <Field label="Название олимпиады">
          <OlympiadSearch
            value={form.title}
            onSelect={({ name, subject }) => update(subject ? { title: name, subject } : { title: name })}
          />
        </Field>
        <Field label="Уровень"><select className="select" value={form.level} onChange={(e) => update({ level: e.target.value })}>
          {['школьный', 'муниципальный', 'региональный', 'заключительный', 'всероссийский', 'перечневая', 'другое'].map((x) => <option key={x}>{x}</option>)}
        </select></Field>
        <Field label="Предмет"><input className="input" value={form.subject} onChange={(e) => update({ subject: e.target.value })} /></Field>
        <Field label="Дата участия"><input className="input" type="date" value={form.participationDate} onChange={(e) => update({ participationDate: e.target.value })} /></Field>
        <Field label="Результат"><select className="select" value={form.result} onChange={(e) => update({ result: e.target.value })}>
          {['участие', 'призёр', 'победитель', 'другое'].map((x) => <option key={x}>{x}</option>)}
        </select></Field>
        <Field label="Место или степень"><input className="input" placeholder="1 место, призёр 3 степени" value={form.placeOrDegree} onChange={(e) => update({ placeOrDegree: e.target.value })} /></Field>
        <Field label="Ссылка на подтверждение"><input className="input" value={form.confirmationUrl} onChange={(e) => update({ confirmationUrl: e.target.value })} /></Field>
        <Field label="Комментарий"><input className="input" value={form.studentComment} onChange={(e) => update({ studentComment: e.target.value })} /></Field>
        <div className="flex" style={{ gap: 12 }}>
          <button className="btn-primary" type="submit">Отправить заявку</button>
          {status && <span className="text-green">{status}</span>}
        </div>
      </form>
    </Card>
  )
}

function StatusBadge({ status }: { status: OlympiadApplicationStatus }) {
  const label = { pending: 'ожидает проверки', approved: 'подтверждена', rejected: 'отклонена' }[status]
  const cls = status === 'approved' ? 'badge badge--risk-low' : status === 'rejected' ? 'badge badge--risk-high' : 'badge badge--risk-mid'
  return <span className={cls}>{label}</span>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="setting-field"><span className="field__label">{label}</span>{children}</label>
}

function MiniStat({ label, value, color }: { label: string; value: string; color: 'blue' | 'green' | 'orange' | 'red' | 'purple' }) {
  return (
    <div className="card card--pad">
      <div className="stat-box__label">{label}</div>
      <div className={`stat-box__value stat-box__value--${color}`} style={{ marginTop: 8 }}>{value}</div>
    </div>
  )
}
