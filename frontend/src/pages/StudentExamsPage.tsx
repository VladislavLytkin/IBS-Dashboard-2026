import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { StudentExamType } from '../types'
import { ALL_CLASSES } from '../data/classes'
import { getStudents } from '../data/students'
import { getStudentAcademicInfo } from '../data/grades'
import {
  STUDENT_EXAM_TYPES, getSchoolAverageByYears, getStudentExamRows, ogeGradeFromScore,
  type StudentExamRow,
} from '../data/studentExams'
import { Card, EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

const formatDate = (iso: string) => iso.split('-').reverse().join('.')

const STATUS_CLASS: Record<string, string> = {
  'Не сдал': 'score-red',
  'Сдал': 'text-muted',
  'Выше среднего по школе': 'score-green',
  'Выше среднего по городу': 'score-green',
  'Выше среднего по стране': 'score-green',
}

/** Значение со сноской-источником; null → «Нет данных». */
function ValueWithSource({ value, sourceName, sourceYear }: { value: number | string | null; sourceName?: string; sourceYear?: number }) {
  if (value == null) return <span className="text-muted">Нет данных</span>
  return (
    <div>
      <div>{value}</div>
      {sourceName && <div className="src-note">{sourceName}{sourceYear ? `, ${sourceYear}` : ''}</div>}
    </div>
  )
}

interface ComparePoint {
  name: string // короткая подпись на оси X
  label: string // полное название в таблице под графиком
  value: number
  color: string
  sourceName: string
  sourceYear: number | null
}

/** Tooltip графика сравнения: показатель, балл, источник, год источника. */
function CompareTooltip({ active, payload }: { active?: boolean; payload?: { payload: ComparePoint }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tip">
      <div className="chart-tip__title">{d.name}</div>
      <div>Балл: <b>{d.value}</b></div>
      <div className="src-note">Источник: {d.sourceName}{d.sourceYear ? `, ${d.sourceYear}` : ''}</div>
    </div>
  )
}

export function StudentExamsPage() {
  const { user } = useAuth()
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

  const academicInfo = useMemo(() => getStudentAcademicInfo(studentId), [studentId])
  const rows = useMemo(() => getStudentExamRows(studentId), [studentId])

  // ----- Фильтры -----
  const [yearFilter, setYearFilter] = useState<'all' | string>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | StudentExamType>('all')
  const [subjectFilter, setSubjectFilter] = useState<'all' | string>('all')
  useEffect(() => {
    if (yearFilter !== 'all' && !academicInfo.years.includes(yearFilter)) setYearFilter('all')
  }, [yearFilter, academicInfo.years])
  const subjects = useMemo(() => Array.from(new Set(rows.map((r) => r.subject))), [rows])

  const filtered = rows.filter((r) =>
    (yearFilter === 'all' || r.academicYear === yearFilter)
    && (typeFilter === 'all' || r.examType === typeFilter)
    && (subjectFilter === 'all' || r.subject === subjectFilter))

  // Выбранный экзамен (для графиков) — клик по строке; по умолчанию самый свежий.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected: StudentExamRow | undefined =
    filtered.find((r) => r.id === selectedId) ?? filtered[filtered.length - 1]

  const comparisonData = useMemo<ComparePoint[]>(() => {
    if (!selected) return []
    const t = selected.threshold
    const b = selected.benchmark
    const examYear = Number(selected.examDate.slice(0, 4))
    const student = { name: 'Ученик', label: 'Балл ученика', value: selected.score, color: 'var(--blue)', sourceName: 'результат ученика', sourceYear: examYear }
    const school = { name: 'Школа', label: 'Средний по школе', value: selected.schoolAverage, color: 'var(--bar)', sourceName: 'по результатам учеников школы', sourceYear: null }

    // Внутренний экзамен — только школьные показатели: городской и федеральной статистики нет.
    const raw = selected.examType === 'Внутренний экзамен'
      ? [
        student,
        { name: 'Минимум школы', label: 'Минимум школы', value: t?.minSchoolScore ?? null, color: 'var(--red)', sourceName: t?.sourceName ?? 'демо-данные', sourceYear: t?.sourceYear ?? null },
        school,
      ]
      : [
        student,
        { name: 'Минимум', label: 'Минимум для аттестата', value: t?.minTotalScore ?? null, color: 'var(--red)', sourceName: t?.sourceName ?? 'демо-данные', sourceYear: t?.sourceYear ?? null },
        school,
        { name: 'Город', label: 'Средний по городу', value: b?.cityAverage ?? null, color: 'var(--orange)', sourceName: b?.sourceName ?? 'демо-данные', sourceYear: b?.sourceYear ?? null },
        { name: 'Страна', label: 'Средний по стране', value: b?.countryAverage ?? null, color: 'var(--green)', sourceName: b?.sourceName ?? 'демо-данные', sourceYear: b?.sourceYear ?? null },
      ]
    return raw.filter((d): d is ComparePoint => d.value != null)
  }, [selected])

  const dynamicsData = useMemo(
    () => (selected ? getSchoolAverageByYears(selected.examType, selected.subject) : []),
    [selected],
  )

  const scoreCell = (r: StudentExamRow) =>
    r.examType === 'ОГЭ' ? `${r.score} (оценка ${ogeGradeFromScore(r.subject, r.score)})` : String(r.score)

  return (
    <div className="page">

      <div className="toolbar">
        <div className="field">
          <span className="field__label">Выберите класс:</span>
          <select className="select" value={className} onChange={(e) => { setClassName(e.target.value); setStudentId(getStudents(e.target.value)[0]?.id ?? '') }}>
            {visibleClasses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field__label">Выберите ученика:</span>
          <select className="select" value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ minWidth: 180 }}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field__label">Учебный год:</span>
          <select className="select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">Все годы</option>
            {academicInfo.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field__label">Тип экзамена:</span>
          <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | StudentExamType)}>
            <option value="all">Все типы</option>
            {STUDENT_EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field__label">Предмет:</span>
          <select className="select" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="all">Все предметы</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState message="Экзаменационные результаты пока отсутствуют" /></Card>
      ) : (
        <>
          <Card title="Экзамены ученика">
            {filtered.length === 0 ? (
              <EmptyState message="Нет экзаменов по выбранным фильтрам" />
            ) : (
              <>
                <div className="table-wrap">
                  <table className="tbl tbl--compact">
                    <thead>
                      <tr>
                        <th>Предмет</th>
                        <th>Тип экзамена</th>
                        <th>Дата</th>
                        <th className="td-num">Балл ученика</th>
                        <th className="td-num">Макс. балл</th>
                        <th className="td-num">Минимальный балл</th>
                        <th className="td-num">Средний по школе</th>
                        <th className="td-num">Средний по городу</th>
                        <th className="td-num">Средний по стране</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id}
                          className={selected?.id === r.id ? 'is-selected' : undefined}
                          style={{ cursor: 'pointer' }}
                          title="Нажмите, чтобы показать графики по этому экзамену"
                          onClick={() => setSelectedId(r.id)}>
                          <td className="td-strong">{r.subject}</td>
                          <td>{r.examType}</td>
                          <td>{formatDate(r.examDate)}</td>
                          <td className={`td-num ${r.status === 'Не сдал' ? 'score-red' : 'score-green'}`}>
                            <div>{scoreCell(r)}</div>
                            {r.geometryScore != null && (
                              <div className="src-note">алгебра {r.algebraScore} · геометрия {r.geometryScore}</div>
                            )}
                          </td>
                          <td className="td-num">{r.maxScore}</td>
                          <td className="td-num">
                            <ValueWithSource
                              value={r.examType === 'Внутренний экзамен'
                                ? (r.threshold?.minSchoolScore != null ? `${r.threshold.minSchoolScore} (минимум школы)` : null)
                                : r.threshold != null
                                  ? `${r.threshold.minTotalScore}${r.threshold.minGeometryScore != null ? ` (геометрия ≥ ${r.threshold.minGeometryScore})` : ''}`
                                  : null}
                              sourceName={r.threshold?.sourceName} sourceYear={r.threshold?.sourceYear} />
                          </td>
                          <td className="td-num">
                            <ValueWithSource value={r.schoolAverage} sourceName="по результатам учеников" />
                          </td>
                          {/* Внутренний экзамен — городской и федеральной статистики не существует, показываем прочерк. */}
                          <td className="td-num">
                            {r.examType === 'Внутренний экзамен'
                              ? <span className="text-muted">—</span>
                              : <ValueWithSource value={r.benchmark?.cityAverage ?? null}
                                  sourceName={r.benchmark?.sourceName} sourceYear={r.benchmark?.sourceYear} />}
                          </td>
                          <td className="td-num">
                            {r.examType === 'Внутренний экзамен'
                              ? <span className="text-muted">—</span>
                              : <ValueWithSource value={r.benchmark?.countryAverage ?? null}
                                  sourceName={r.benchmark?.sourceName} sourceYear={r.benchmark?.sourceYear} />}
                          </td>
                          <td className={STATUS_CLASS[r.status]} style={{ whiteSpace: 'nowrap' }}>{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-muted" style={{ marginTop: 12, fontSize: 13 }}>
                  ЕГЭ — тестовая шкала 0–100; ОГЭ — первичные баллы с переводом в оценку (рекомендации ФИПИ).
                  Значения без официального источника помечены как «демо-данные».
                </p>
              </>
            )}
          </Card>

          {selected && (
            <div className="grid grid-2">
              <Card title={`Сравнение результата: ${selected.subject}, ${selected.examType === 'Внутренний экзамен' ? 'внутренний экзамен' : selected.examType}, ${formatDate(selected.examDate)}`}>
                <div className="chart-box" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 24, right: 8, left: -16, bottom: 4 }}>
                      <CartesianGrid vertical={false} stroke="#eef1f5" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, selected.maxScore]} tickLine={false} axisLine={false} />
                      <Tooltip content={<CompareTooltip />} cursor={{ fill: 'rgba(127, 127, 127, 0.06)' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={52}>
                        {comparisonData.map((d) => <Cell key={d.name} fill={d.color} />)}
                        <LabelList dataKey="value" position="top" fontSize={12} fill="#334155" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="tbl tbl--compact">
                    <thead>
                      <tr><th>Показатель</th><th className="td-num">Балл</th><th>Источник</th></tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((d) => (
                        <tr key={d.name}>
                          <td className="td-strong">{d.label}</td>
                          <td className="td-num">{d.value}</td>
                          <td className="text-muted">{d.sourceName}{d.sourceYear ? `, ${d.sourceYear}` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title={`Динамика результатов школы по годам: ${selected.subject} (${selected.examType})`}>
                {dynamicsData.length < 2 ? (
                  <EmptyState message="Недостаточно данных за разные годы" />
                ) : (
                  <div className="chart-box" style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dynamicsData} margin={{ top: 12, right: 16, left: -16, bottom: 4 }}>
                        <CartesianGrid vertical={false} stroke="#eef1f5" />
                        <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, selected.maxScore]} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(v) => [String(v), 'Средний балл школы']} labelFormatter={(l) => `${l} год`} />
                        <Line type="monotone" dataKey="average" name="Средний балл школы" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <p className="text-muted" style={{ marginTop: 10, fontSize: 13 }}>
                  Средний балл школы считается автоматически по результатам всех учеников за каждый год.
                </p>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
