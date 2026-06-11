import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useFilters } from '../context/FiltersContext'
import { studentsService, workflowService } from '../services'
import { useApi } from '../hooks/useApi'
import { Card, EmptyState, PageFooter } from '../components/ui'

const ABSENCE_LABEL = { excused: 'Уважительное отсутствие', truancy: 'Прогул' } as const
const DEBT_STATUS = { assigned: 'Назначена', in_progress: 'В работе', closed: 'Закрыта', overdue: 'Просрочена' } as const
const EXPULSION_STATUS = { initiated: 'Инициировано', review: 'На рассмотрении', confirmed: 'Подтверждено', cancelled: 'Отменено' } as const

const CALL_REASONS = [
  'Учебная консультация',
  'Разбор оценок',
  'Поведение',
  'Олимпиада',
  'Проектная деятельность',
  'СПД',
  'Разговор с родителями',
  'Другое',
] as const

const ALL_SUBJECTS = [
  'Русский язык', 'Математика', 'Информатика', 'Физика', 'Химия', 'Биология',
  'Обществознание', 'История', 'География', 'Литература', 'Английский язык',
]

/** Учитель выбирает только предметы своего профиля; завуч и выше — любые. */
function useMySubjects(): string[] {
  const { user } = useAuth()
  return useMemo(() => {
    if (user?.role === 'TEACHER' && user.subjects?.length) return user.subjects
    return ALL_SUBJECTS
  }, [user])
}

function SubjectSelect({ value, onChange, subjects }: { value: string; onChange: (v: string) => void; subjects: string[] }) {
  return (
    <select className="select" required value={value} onChange={(e) => onChange(e.target.value)}>
      {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

export function TeachingActionsPage() {
  const { user } = useAuth()
  const { year } = useFilters()
  const students = useApi(() => studentsService.list({ year }), [year])
  const absences = useApi(() => workflowService.absences(year), [year])
  const debts = useApi(() => workflowService.debts(year), [year])
  const expulsions = useApi(() => workflowService.expulsions(), [])
  const rows = students.data ?? []
  const canEditStudy = user?.role === 'TEACHER' || user?.role === 'HEAD_TEACHER'
  const canExpel = user?.role === 'DIRECTOR'

  const refreshStudy = () => {
    absences.reload()
    debts.reload()
  }

  return (
    <div className="page">
      {canEditStudy && (
        <div className="grid grid-2-wide">
          <AbsenceForm students={rows} onCreated={absences.reload} />
          <DebtForm students={rows} onCreated={debts.reload} />
        </div>
      )}

      {(canEditStudy || canExpel) && <OfficeCallForm students={rows} onCreated={refreshStudy} />}
      {canExpel && <ExpulsionForm students={rows} onCreated={expulsions.reload} />}

      <div className="grid grid-2-wide">
        <Card title="Пропуски, внесённые через журнал">
          {absences.loading ? <EmptyState message="Загрузка пропусков…" /> : (absences.data ?? []).length === 0 ? <EmptyState message="Пропусков нет." /> : (
            <div className="table-wrap">
              <table className="tbl tbl--compact tbl--cards">
                <thead><tr><th>Дата</th><th>Ученик</th><th>Урок</th><th>Предмет</th><th>Тип</th><th>Причина / комментарий</th></tr></thead>
                <tbody>{(absences.data ?? []).map((a) => (
                  <tr key={a.id}><td data-label="Дата">{a.date}</td><td data-label="Ученик">{a.studentName}</td><td data-label="Урок">{a.lesson}</td><td data-label="Предмет">{a.subject}</td><td data-label="Тип">{ABSENCE_LABEL[a.type]}</td><td data-label="Комментарий">{a.reasonOrComment}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Академические задолженности">
          {debts.loading ? <EmptyState message="Загрузка задолженностей…" /> : (debts.data ?? []).length === 0 ? <EmptyState message="Задолженностей нет." /> : (
            <div className="table-wrap">
              <table className="tbl tbl--compact tbl--cards">
                <thead><tr><th>Ученик</th><th>Предмет</th><th>Тема</th><th>Срок</th><th>Статус</th></tr></thead>
                <tbody>{(debts.data ?? []).map((d) => (
                  <tr key={d.id}><td data-label="Ученик">{d.studentName}</td><td data-label="Предмет">{d.subject}</td><td data-label="Тема">{d.topic}<div className="text-muted">{d.reason}</div></td><td data-label="Срок">{d.dueDate}</td><td data-label="Статус">{DEBT_STATUS[d.status]}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {canExpel && (
        <Card title="Управленческие заявки на отчисление">
          {(expulsions.data ?? []).length === 0 ? <EmptyState message="Заявок на отчисление нет." /> : (
            <div className="table-wrap">
              <table className="tbl tbl--compact tbl--cards">
                <thead><tr><th>Ученик</th><th>Класс</th><th>Причина</th><th>Статус</th><th>Дата</th></tr></thead>
                <tbody>{(expulsions.data ?? []).map((e) => (
                  <tr key={e.id}><td>{e.studentName}</td><td>{e.classId.replace(/^\d+-/, '')}</td><td>{e.writtenReason}</td><td>{EXPULSION_STATUS[e.status]}</td><td>{new Date(e.createdAt).toLocaleString('ru-RU')}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <PageFooter />
    </div>
  )
}

function StudentSelect({ value, onChange, students }: { value: string; onChange: (id: string) => void; students: { id: string; fullName: string; classId: string }[] }) {
  return (
    <select className="select" required value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Выберите ученика</option>
      {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} · {s.classId.replace(/^\d+-/, '')}</option>)}
    </select>
  )
}

function AbsenceForm({ students, onCreated }: { students: { id: string; fullName: string; classId: string }[]; onCreated: () => void }) {
  const subjects = useMySubjects()
  const [form, setForm] = useState({ studentId: '', date: new Date().toISOString().slice(0, 10), lesson: '1', subject: subjects[0] ?? 'Математика', type: 'excused' as const, reasonOrComment: 'Справка от врача' })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await workflowService.createAbsence(form)
    onCreated()
  }
  return (
    <Card title="Проставить пропуск">
      <form className="form-grid" onSubmit={submit}>
        <label className="setting-field"><span className="field__label">Ученик</span><StudentSelect value={form.studentId} onChange={(studentId) => setForm({ ...form, studentId })} students={students} /></label>
        <label className="setting-field"><span className="field__label">Дата</span><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label className="setting-field"><span className="field__label">Урок</span><input className="input" value={form.lesson} onChange={(e) => setForm({ ...form, lesson: e.target.value })} /></label>
        <label className="setting-field"><span className="field__label">Предмет</span><SubjectSelect value={form.subject} onChange={(subject) => setForm({ ...form, subject })} subjects={subjects} /></label>
        <label className="setting-field"><span className="field__label">Тип</span><select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}><option value="excused">Уважительное отсутствие</option><option value="truancy">Прогул</option></select></label>
        <label className="setting-field"><span className="field__label">Причина / комментарий</span><input className="input" value={form.reasonOrComment} onChange={(e) => setForm({ ...form, reasonOrComment: e.target.value })} /></label>
        <button className="btn-primary" type="submit">Сохранить пропуск</button>
      </form>
    </Card>
  )
}

function DebtForm({ students, onCreated }: { students: { id: string; fullName: string; classId: string }[]; onCreated: () => void }) {
  const subjects = useMySubjects()
  const [form, setForm] = useState({ studentId: '', subject: subjects[0] ?? 'Математика', topic: '', reason: '', dueDate: new Date().toISOString().slice(0, 10), comment: '' })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await workflowService.createDebt(form)
    onCreated()
  }
  return (
    <Card title="Назначить академическую задолженность">
      <form className="form-grid" onSubmit={submit}>
        <label className="setting-field"><span className="field__label">Ученик</span><StudentSelect value={form.studentId} onChange={(studentId) => setForm({ ...form, studentId })} students={students} /></label>
        <label className="setting-field"><span className="field__label">Предмет</span><SubjectSelect value={form.subject} onChange={(subject) => setForm({ ...form, subject })} subjects={subjects} /></label>
        <label className="setting-field"><span className="field__label">Тема / раздел</span><input className="input" required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></label>
        <label className="setting-field"><span className="field__label">Причина</span><input className="input" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
        <label className="setting-field"><span className="field__label">Срок закрытия</span><input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
        <label className="setting-field"><span className="field__label">Комментарий</span><input className="input" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></label>
        <button className="btn-primary" type="submit">Назначить задолженность</button>
      </form>
    </Card>
  )
}

function OfficeCallForm({ students, onCreated }: { students: { id: string; fullName: string; classId: string }[]; onCreated: () => void }) {
  const recipients = useApi(() => workflowService.recipients(), [])
  const [studentId, setStudentId] = useState('')
  const [form, setForm] = useState({ dateTime: '', room: '', reason: '', customReason: '' })
  const [sent, setSent] = useState<string | null>(null)
  const student = useMemo(() => students.find((s) => s.id === studentId), [students, studentId])
  const recipient = useMemo(
    () => (recipients.data ?? []).find((r) => r.studentId === studentId || r.fullName === student?.fullName),
    [recipients.data, studentId, student],
  )
  // Итоговая причина: выбранная из списка либо введённая вручную при «Другое».
  const finalReason = form.reason === 'Другое' ? form.customReason.trim() : form.reason
  const reasonValid = finalReason.length > 0
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!recipient || !reasonValid) return
    await workflowService.sendMessage({
      toUserId: recipient.id,
      type: 'office_call',
      title: `Вызов ученика: ${student?.fullName ?? ''}`,
      text: `Причина: ${finalReason}. Дата и время: ${form.dateTime}. Место: ${form.room}.`,
      meta: { dateTime: form.dateTime, room: form.room, reason: finalReason },
    })
    setSent('Вызов отправлен')
    setForm({ dateTime: '', room: '', reason: '', customReason: '' })
    setStudentId('')
    onCreated()
  }
  return (
    <Card title="Вызвать ученика">
      <form className="form-grid" onSubmit={submit}>
        <label className="setting-field"><span className="field__label">Ученик</span><StudentSelect value={studentId} onChange={(id) => { setStudentId(id); setSent(null) }} students={students} /></label>
        <label className="setting-field"><span className="field__label">Дата и время</span><input className="input" type="datetime-local" required value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} /></label>
        <label className="setting-field"><span className="field__label">Кабинет / место</span><input className="input" required value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></label>
        <label className="setting-field">
          <span className="field__label">Причина вызова</span>
          <select className="select" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
            <option value="">Выберите причину</option>
            {CALL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        {form.reason === 'Другое' && (
          <label className="setting-field">
            <span className="field__label">Своя причина</span>
            <input className="input" required placeholder="Опишите причину вызова" value={form.customReason} onChange={(e) => setForm({ ...form, customReason: e.target.value })} />
          </label>
        )}
        <div className="flex" style={{ gap: 12 }}>
          <button className="btn-primary" type="submit" disabled={!recipient || !reasonValid}>Отправить вызов</button>
          {sent && <span className="text-green">{sent}</span>}
          {studentId && !recipient && !recipients.loading && <span className="text-muted">У ученика нет учётной записи в системе</span>}
        </div>
      </form>
    </Card>
  )
}

function ExpulsionForm({ students, onCreated }: { students: { id: string; fullName: string; classId: string }[]; onCreated: () => void }) {
  const [studentId, setStudentId] = useState('')
  const [writtenReason, setWrittenReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const submit = async () => {
    await workflowService.createExpulsion({ studentId, writtenReason })
    setConfirmOpen(false)
    setWrittenReason('')
    setStudentId('')
    onCreated()
  }
  return (
    <Card title="Инициировать отчисление">
      <div className="note" style={{ marginBottom: 14 }}>Критическое управленческое действие. Ученик не удаляется из системы, создаётся заявка на рассмотрение.</div>
      <div className="form-grid">
        <label className="setting-field"><span className="field__label">Ученик</span><StudentSelect value={studentId} onChange={setStudentId} students={students} /></label>
        <label className="setting-field"><span className="field__label">Письменная причина</span><textarea className="input textarea" required value={writtenReason} onChange={(e) => setWrittenReason(e.target.value)} /></label>
        <button className="btn-primary" disabled={!studentId || writtenReason.length < 10} onClick={() => setConfirmOpen(true)}>Создать заявку</button>
      </div>
      {confirmOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setConfirmOpen(false)}>
          <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal__head"><div><h2>Подтвердите действие</h2><p>Заявка на отчисление будет записана в журнал действий.</p></div><button className="modal__close" onClick={() => setConfirmOpen(false)}>×</button></div>
            <button className="btn-primary" onClick={submit}>Подтвердить создание заявки</button>
          </section>
        </div>
      )}
    </Card>
  )
}
