import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis,
} from 'recharts'
import type { GradeRecord, GradeType, GradeValue } from '../types'
import { ALL_CLASSES } from '../data/classes'
import { getStudents } from '../data/students'
import {
  GRADE_TYPES, GRADE_VALUES, SUBJECTS,
  addGrade, deleteGrade, getAverageBySubject, getStudentGrades, updateGrade,
} from '../data/grades'
import { IconDownload } from '../components/icons'
import { Card, EmptyState, MonthSelect } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

const formatDate = (iso: string) => iso.split('-').reverse().join('.')

const gradeClass = (g: number) => (g >= 4 ? 'score-green' : g === 3 ? 'score-orange' : 'score-red')

interface GradeForm {
  date: string
  subject: string
  grade: GradeValue
  type: GradeType
}

const DEFAULT_FORM: GradeForm = { date: '2024-05-15', subject: SUBJECTS[0], grade: 5, type: GRADE_TYPES[0] }

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

  // version растёт после каждой правки — оценки и график пересчитываются сразу.
  const [version, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const records = useMemo(() => getStudentGrades(studentId), [studentId, version])
  const averages = useMemo(() => getAverageBySubject(records), [records])

  const [subjectFilter, setSubjectFilter] = useState<'all' | string>('all')
  const visibleRecords = subjectFilter === 'all' ? records : records.filter((g) => g.subject === subjectFilter)

  const [form, setForm] = useState<GradeForm>(DEFAULT_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GradeForm>(DEFAULT_FORM)

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
        <div className="toolbar__spacer">
          <MonthSelect />
        </div>
      </div>

      <Card title="Средний балл по предметам за месяц">
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
      </Card>

      <Card title="Журнал оценок за май 2024">
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <div className="field">
            <span className="field__label">Предмет:</span>
            <select className="select" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="all">Все предметы</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {canEdit && (
          <div className="toolbar grade-add" style={{ marginBottom: 14 }}>
            <div className="field">
              <span className="field__label">Дата:</span>
              <input type="date" className="select" min="2024-05-01" max="2024-05-31"
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

        {visibleRecords.length === 0 ? (
          <EmptyState message="Оценок за период нет" />
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Предмет</th>
                  <th>Тип работы</th>
                  <th className="td-num">Оценка</th>
                  {canEdit && <th className="td-num">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((g) => (
                  editingId === g.id ? (
                    <tr key={g.id}>
                      <td>
                        <input type="date" className="select" min="2024-05-01" max="2024-05-31"
                          value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                      </td>
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
