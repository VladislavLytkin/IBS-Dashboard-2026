import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, LabelList, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { GradePeriod, GradeRecord, GradeType, GradeValue } from '../types'
import { ALL_CLASSES } from '../data/classes'
import { STUDENT_STATUS_LABELS, getStudents } from '../data/students'
import {
  GRADE_TYPES, GRADE_VALUES, PERIOD_OPTIONS, SUBJECTS,
  addGrade, deleteGrade, filterGradesByPeriod, getAcademicMonthOptions,
  getAverageBySubject, getStudentAcademicInfo, getStudentGrades, updateGrade,
} from '../data/grades'
import { IconDownload } from '../components/icons'
import { Card, EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

const formatDate = (iso: string) => iso.split('-').reverse().join('.')

const gradeClass = (g: number) => (g >= 4 ? 'score-green' : g === 3 ? 'score-orange' : 'score-red')

interface GradeForm {
  date: string
  subject: string
  grade: GradeValue
  type: GradeType
}

/** Дата по умолчанию для новой оценки — внутри выбранного периода. */
function defaultDateFor(academicYear: string, period: GradePeriod, month?: string): string {
  const startYear = Number(academicYear.split('/')[0])
  if (period === 'month' && month) return `${month}-10`
  if (period === 'sem1') return `${startYear}-10-10`
  if (period === 'sem2') return `${startYear + 1}-02-10`
  return `${startYear}-11-10`
}

export function GradesPage() {
  const { user } = useAuth()
  const canEdit = user?.role === 'TEACHER' || user?.role === 'HEAD_TEACHER' || user?.role === 'ADMIN'
  const visibleClasses = useMemo(() => {
    if (user?.role === 'TEACHER' || user?.role === 'STUDENT') return (user.classIds ?? []).map((id) => id.replace(/^\d+-/, ''))
    return ALL_CLASSES
  }, [user])
  const [className, setClassName] = useState(visibleClasses[0] ?? '7Б')
  useEffect(() => {
    if (visibleClasses.length && !visibleClasses.includes(className)) setClassName(visibleClasses[0])
  }, [className, visibleClasses])
  const students = user?.role === 'STUDENT'
    ? [{ id: user.studentId ?? user.id, fullName: user.fullName }]
    : getStudents(className)
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  useEffect(() => {
    if (students.length && !students.some((s) => s.id === studentId)) setStudentId(students[0].id)
  }, [studentId, students])
  const selectedStudent = students.find((s) => s.id === studentId)

  // ----- Учебные периоды -----
  // Годы строятся по статусу ученика: активный — до текущего учебного года,
  // выбывший — до учебного года выбытия. Наличие оценок на список не влияет.
  const academicInfo = useMemo(() => getStudentAcademicInfo(studentId), [studentId])
  const { enrollmentYear, status, exitDate, exitReason, years: academicYears } = academicInfo
  const [academicYear, setAcademicYear] = useState(academicYears[academicYears.length - 1])
  useEffect(() => {
    // Годы до поступления ученика недоступны — при смене ученика сбрасываем на текущий.
    if (!academicYears.includes(academicYear)) setAcademicYear(academicYears[academicYears.length - 1])
  }, [academicYear, academicYears])
  const [period, setPeriod] = useState<GradePeriod>('year')
  const monthOptions = useMemo(() => getAcademicMonthOptions(academicYear), [academicYear])
  const [month, setMonth] = useState(monthOptions[0]?.value ?? '')
  useEffect(() => {
    if (!monthOptions.some((m) => m.value === month)) setMonth(monthOptions[0]?.value ?? '')
  }, [month, monthOptions])
  const [subjectFilter, setSubjectFilter] = useState<'all' | string>('all')

  // version растёт после каждой правки — оценки и оба графика пересчитываются сразу.
  const [version, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const records = useMemo(() => getStudentGrades(studentId), [studentId, version])
  const periodRecords = useMemo(
    () => filterGradesByPeriod(records, { academicYear, period, month }),
    [records, academicYear, period, month],
  )
  const averages = useMemo(() => getAverageBySubject(periodRecords), [periodRecords])
  const tableRecords = subjectFilter === 'all' ? periodRecords : periodRecords.filter((g) => g.subject === subjectFilter)

  const dynamics = useMemo(() => {
    if (subjectFilter === 'all') return []
    return periodRecords
      .filter((g) => g.subject === subjectFilter)
      .map((g) => ({
        label: period === 'all' ? formatDate(g.date) : formatDate(g.date).slice(0, 5),
        full: formatDate(g.date),
        grade: g.grade,
        record: g,
      }))
  }, [periodRecords, subjectFilter, period])

  const periodLabel = period === 'month'
    ? (monthOptions.find((m) => m.value === month)?.label ?? '')
    : (PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? '')
  const periodTitle = period === 'all' ? 'весь период обучения' : `${periodLabel.toLowerCase()}${period !== 'month' ? `, ${academicYear}` : ''}`
  // Год без оценок — нормальная ситуация (например, только что начавшийся): показываем заглушку.
  const emptyMessage = period === 'year' ? 'Нет оценок за выбранный учебный год' : 'Нет оценок за выбранный период'

  // ----- Форма добавления и редактирование -----
  // Оценку нельзя поставить раньше поступления, позже выбытия или в будущем.
  const minDate = `${enrollmentYear}-09-01`
  const maxDate = exitDate ?? new Date().toISOString().slice(0, 10)
  const clampDate = (d: string) => (d < minDate ? minDate : d > maxDate ? maxDate : d)

  const [form, setForm] = useState<GradeForm>({
    date: clampDate(defaultDateFor(academicYear, period, month)), subject: SUBJECTS[0], grade: 5, type: GRADE_TYPES[0],
  })
  useEffect(() => {
    setForm((f) => ({ ...f, date: clampDate(defaultDateFor(academicYear, period, month)) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear, period, month, minDate, maxDate])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GradeForm>({ date: '', subject: SUBJECTS[0], grade: 5, type: GRADE_TYPES[0] })

  const onClassChange = (value: string) => {
    setClassName(value)
    setStudentId(getStudents(value)[0]?.id ?? '')
    setEditingId(null)
  }

  const onAdd = () => {
    addGrade({ studentId, classId: className, ...form })
    bump()
  }

  const startEdit = (g: GradeRecord) => {
    setEditingId(g.id)
    setEditForm({ date: g.date, subject: g.subject, grade: g.grade, type: g.type })
  }

  const saveEdit = () => {
    if (!editingId) return
    updateGrade(editingId, editForm)
    setEditingId(null)
    bump()
  }

  const onDelete = (id: string) => {
    deleteGrade(id)
    if (editingId === id) setEditingId(null)
    bump()
  }

  return (
    <div className="page">
      <div className="toolbar">
        <div className="field">
          <span className="field__label">Выберите класс:</span>
          <select className="select" value={className} onChange={(e) => onClassChange(e.target.value)}>
            {visibleClasses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field__label">Выберите ученика:</span>
          <select className="select" value={studentId} onChange={(e) => { setStudentId(e.target.value); setEditingId(null) }} style={{ minWidth: 180 }}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </div>
      </div>

      <Card title="Информация об ученике">
        <div className="stat-row">
          <div className="stat-box">
            <div className="stat-box__label">ФИО</div>
            <div className="stat-box__value" style={{ fontSize: 18 }}>{selectedStudent?.fullName ?? '—'}</div>
          </div>
          <div className="stat-box">
            <div className="stat-box__label">Класс</div>
            <div className="stat-box__value" style={{ fontSize: 18 }}>{className}</div>
          </div>
          <div className="stat-box">
            <div className="stat-box__label">В школе</div>
            <div className="stat-box__value" style={{ fontSize: 18 }}>с {enrollmentYear} года</div>
          </div>
          <div className="stat-box">
            <div className="stat-box__label">Статус</div>
            <div className="stat-box__value" style={{ fontSize: 18, color: status === 'active' ? 'var(--green)' : status === 'withdrawn' ? 'var(--red)' : 'var(--orange)' }}>
              {STUDENT_STATUS_LABELS[status]}
            </div>
          </div>
          {status !== 'active' && exitDate && (
            <div className="stat-box">
              <div className="stat-box__label">Дата выбытия</div>
              <div className="stat-box__value" style={{ fontSize: 18 }}>{formatDate(exitDate)}</div>
              {exitReason && <div className="stat-box__sub">{exitReason}</div>}
            </div>
          )}
        </div>
      </Card>

      <div className="toolbar">
        <div className="field">
          <span className="field__label">Учебный год:</span>
          <select className="select" value={academicYear} disabled={period === 'all'}
            onChange={(e) => setAcademicYear(e.target.value)}>
            {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field__label">Период:</span>
          <select className="select" value={period} onChange={(e) => setPeriod(e.target.value as GradePeriod)}>
            {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {period === 'month' && (
          <div className="field">
            <span className="field__label">Месяц:</span>
            <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
              {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <span className="field__label">Предмет:</span>
          <select className="select" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="all">Все предметы</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <Card title={`Средний балл по предметам (${periodTitle})`}>
        {averages.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="chart-box" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={averages} margin={{ top: 24, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis dataKey="subject" tickLine={false} axisLine={false} interval={0}
                  tick={{ fontSize: 11 }} angle={0} height={40} />
                <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tickLine={false} axisLine={false} />
                <Bar dataKey="average" fill="var(--bar)" radius={[4, 4, 0, 0]} maxBarSize={46}>
                  <LabelList dataKey="average" position="top" fontSize={12} fill="#334155"
                    formatter={(v: number) => v.toFixed(1)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title={subjectFilter === 'all' ? 'Динамика оценок по предмету' : `Динамика оценок: ${subjectFilter} (${periodTitle})`}>
        {subjectFilter === 'all' ? (
          <EmptyState message="Выберите предмет в фильтре, чтобы увидеть динамику оценок" />
        ) : dynamics.length === 0 ? (
          <EmptyState message="Оценок по предмету за выбранный период нет" />
        ) : (
          <div className="chart-box" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dynamics} margin={{ top: 12, right: 16, left: -28, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis domain={[2, 5]} ticks={[2, 3, 4, 5]} tickLine={false} axisLine={false} />
                <Tooltip
                  labelFormatter={(_l, payload) => (payload?.[0]?.payload as { full?: string })?.full ?? ''}
                  formatter={(v, _n, item) => {
                    const rec = (item?.payload as { record?: GradeRecord })?.record
                    return [`${v}${rec ? ` — ${rec.type.toLowerCase()}` : ''}`, 'Оценка']
                  }}
                />
                <Line type="monotone" dataKey="grade" name="Оценка" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title={`Журнал оценок (${periodTitle})`}>
        {canEdit && (
          <div className="toolbar grade-add" style={{ marginBottom: 14 }}>
            <div className="field">
              <span className="field__label">Дата:</span>
              <input type="date" className="select" min={minDate} max={maxDate}
                value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field">
              <span className="field__label">Предмет:</span>
              <select className="select" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <span className="field__label">Тип:</span>
              <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as GradeType })}>
                {GRADE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <span className="field__label">Оценка:</span>
              <select className="select" value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) as GradeValue })}>
                {GRADE_VALUES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={onAdd}>Добавить оценку</button>
          </div>
        )}

        {tableRecords.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th>Дата</th>
                  {period === 'all' && <th>Учебный год</th>}
                  <th>Предмет</th>
                  <th>Тип работы</th>
                  <th className="td-num">Оценка</th>
                  {canEdit && <th className="td-num">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {tableRecords.map((g) => (
                  editingId === g.id ? (
                    <tr key={g.id}>
                      <td>
                        <input type="date" className="select" min={minDate} max={maxDate}
                          value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                      </td>
                      {period === 'all' && <td className="text-muted">{g.academicYear}</td>}
                      <td>
                        <select className="select" value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}>
                          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className="select" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as GradeType })}>
                          {GRADE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="td-num">
                        <select className="select" value={editForm.grade} onChange={(e) => setEditForm({ ...editForm, grade: Number(e.target.value) as GradeValue })}>
                          {GRADE_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                      <td className="td-num">
                        <div className="row-actions">
                          <button className="btn-primary" onClick={saveEdit}>Сохранить</button>
                          <button className="btn" onClick={() => setEditingId(null)}>Отмена</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={g.id}>
                      <td>{formatDate(g.date)}</td>
                      {period === 'all' && <td className="text-muted">{g.academicYear}</td>}
                      <td className="td-strong">{g.subject}</td>
                      <td className="text-muted">{g.type}</td>
                      <td className={`td-num ${gradeClass(g.grade)}`}>{g.grade}</td>
                      {canEdit && (
                        <td className="td-num">
                          <div className="row-actions">
                            <button className="btn" onClick={() => startEdit(g)}>Изменить</button>
                            <button className="btn btn--danger" onClick={() => onDelete(g.id)}>Удалить</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex-between" style={{ marginTop: 18 }}>
          <span className="text-muted">Примечание: оценки указаны по 5-балльной шкале (2–5).</span>
          <button className="btn btn--ghost-blue"><IconDownload /> Скачать в Excel</button>
        </div>
      </Card>
    </div>
  )
}
