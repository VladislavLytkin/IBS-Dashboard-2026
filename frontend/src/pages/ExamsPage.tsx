import { useEffect, useMemo, useState, type ReactElement } from 'react'
import {
  Bar, BarChart, CartesianGrid, Label, LabelList, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { round1 } from '../utils/random'
import { getVisibleClasses } from '../data/permissions'
import { getVisibleCities, cityForClass } from '../data/cities'
import { getStudents } from '../data/students'
import {
  EXAM_TYPE_OPTIONS, academicYearsOfFacts, classAggregates, classVsGrade, dynamicOf,
  dynamicsSeries, filterFacts, perExamRank, rankOf, scoreDistribution, studentAggregates,
  subjectAverages, subjectComparison, subjectDynamics, subjectsOf,
  type DynamicsGranularity, type ExamFact, type ExamTypeFilter,
} from '../data/examAnalytics'

const EXAM_GRADES = [5, 6, 7, 8, 9, 10, 11]
const formatDate = (iso: string) => iso.split('-').reverse().join('.')
const gradeOfClass = (className: string) => parseInt(className, 10)
const localStudentId = (id?: string) => id?.replace(/^\d+-/, '').replace(/-s(\d+)$/, '-$1')
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0)
const subjAvg = (list: ExamFact[], subject: string) =>
  round1(avg(list.filter((f) => f.subject === subject).map((f) => f.percent)))

type Period = 'month' | 'quarter' | 'year' | 'multi'
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Четверть' },
  { value: 'year', label: 'Учебный год' },
  { value: 'multi', label: 'Несколько лет' },
]

type Metric = 'percent' | 'score' | 'rank_class' | 'rank_grade' | 'dynamic'
const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'percent', label: 'Процент от максимума' },
  { value: 'score', label: 'Балл' },
  { value: 'rank_class', label: 'Место в классе' },
  { value: 'rank_grade', label: 'Место в параллели' },
  { value: 'dynamic', label: 'Динамика' },
]

interface ViewConfig {
  unit: 'percent' | 'score' // что показывать на оси Y графиков балла
  granularity: DynamicsGranularity
}

/** Подкрашенная дельта: +N / −N / без изменений. */
function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted">—</span>
  if (value > 0) return <span className="text-green">↑ +{value}</span>
  if (value < 0) return <span className="text-red">↓ {value}</span>
  return <span className="text-muted">— 0</span>
}

const RISK_COLOR: Record<string, string> = { 'низкий': 'var(--green)', 'средний': 'var(--orange)', 'высокий': 'var(--red)' }

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card card--pad">
      <div className="stat-box__label">{label}</div>
      <div className="stat-box__value" style={{ marginTop: 8 }}>{value}</div>
      {sub && <div className="stat-box__sub">{sub}</div>}
    </div>
  )
}

export function ExamsPage() {
  const { user } = useAuth()

  // ----- Фильтры -----
  const cities = useMemo(() => getVisibleCities(user), [user])
  const [city, setCity] = useState<'all' | string>('all')
  const [type, setType] = useState<ExamTypeFilter>('all')
  const [grade, setGrade] = useState<number>(11)
  const [subject, setSubject] = useState<'all' | string>('all')
  const [period, setPeriod] = useState<Period>('multi')
  const [metric, setMetric] = useState<Metric>('percent')

  const visibleClasses = useMemo(() => getVisibleClasses(user), [user])
  const classesInScope = useMemo(
    () => visibleClasses
      .filter((c) => gradeOfClass(c) === grade && (city === 'all' || cityForClass(c) === city))
      .sort(),
    [visibleClasses, grade, city],
  )
  const [className, setClassName] = useState<'all' | string>('all')
  useEffect(() => {
    if (className !== 'all' && !classesInScope.includes(className)) setClassName('all')
  }, [className, classesInScope])

  const scopeStudents = useMemo(() => {
    const classList = className === 'all' ? classesInScope : [className]
    const students = classList.flatMap((c) => getStudents(c)).map((s) => ({ id: s.id, fullName: s.fullName, classId: s.classId }))
    return user?.role === 'STUDENT' ? students.filter((s) => s.id === localStudentId(user.studentId)) : students
  }, [className, classesInScope, user])
  const [studentId, setStudentId] = useState<'all' | string>('all')
  useEffect(() => {
    if (user?.role === 'STUDENT' && scopeStudents[0] && studentId !== scopeStudents[0].id) {
      setStudentId(scopeStudents[0].id)
    }
  }, [user, scopeStudents, studentId])
  useEffect(() => {
    if (studentId !== 'all' && !scopeStudents.some((s) => s.id === studentId)) setStudentId('all')
  }, [studentId, scopeStudents])

  // Учитель видит только свои классы даже на уровне «вся параллель».
  const restrictTo = useMemo(
    () => (user?.role === 'TEACHER' ? new Set(visibleClasses) : null),
    [user, visibleClasses],
  )
  const scoped = (facts: ExamFact[]) => (restrictTo ? facts.filter((f) => restrictTo.has(f.classId)) : facts)

  // Списки годов и предметов — без фильтров по году/предмету, чтобы быть стабильными.
  const typeScopeFacts = useMemo(
    () => scoped(filterFacts({ type, grade, city, academicYear: 'all', subject: 'all' })),
    [type, grade, city, restrictTo],
  )
  const availableYears = useMemo(() => academicYearsOfFacts(typeScopeFacts), [typeScopeFacts])
  const [academicYear, setAcademicYear] = useState<string>('')
  useEffect(() => {
    if (availableYears.length && !availableYears.includes(academicYear)) setAcademicYear(availableYears[0])
  }, [academicYear, availableYears])

  // Период → диапазон и гранулярность графиков.
  const isStudentLevel = studentId !== 'all'
  const isMulti = period === 'multi'
  const effectiveYear: 'all' | string = isMulti ? 'all' : academicYear
  const subjectScopeFacts = useMemo(
    () => scoped(filterFacts({
      type, grade, city, className,
      studentId: isStudentLevel ? studentId : 'all',
      academicYear: effectiveYear,
      subject: 'all',
    })),
    [type, grade, city, className, studentId, isStudentLevel, effectiveYear, restrictTo],
  )
  const availableSubjects = useMemo(() => subjectsOf(subjectScopeFacts), [subjectScopeFacts])
  useEffect(() => {
    if (subject !== 'all' && !availableSubjects.includes(subject)) setSubject('all')
  }, [subject, availableSubjects])

  const granularity: DynamicsGranularity = isMulti ? (isStudentLevel ? 'date' : 'year') : period === 'year' ? 'date' : period
  const view: ViewConfig = { unit: metric === 'score' ? 'score' : 'percent', granularity }

  const base = { type, grade, city, academicYear: effectiveYear, subject }
  const yearGradeFacts = useMemo(() => scoped(filterFacts(base)), [type, grade, city, effectiveYear, subject, restrictTo])
  const scopeFacts = useMemo(() => scoped(filterFacts({ ...base, className })), [type, grade, city, effectiveYear, subject, className, restrictTo])

  const studentFacts = useMemo(
    () => (isStudentLevel ? filterFacts({ ...base, studentId }) : []),
    [type, grade, city, effectiveYear, subject, studentId, isStudentLevel],
  )
  const studentClass = studentFacts[0]?.classId
  const classFacts = useMemo(
    () => (studentClass ? filterFacts({ ...base, className: studentClass }) : []),
    [type, grade, city, effectiveYear, subject, studentClass],
  )

  const isClass = !isStudentLevel && className !== 'all'
  const levelLabel = isStudentLevel
    ? scopeStudents.find((s) => s.id === studentId)?.fullName ?? 'Ученик'
    : isClass ? `Класс ${className}` : `Вся параллель — ${grade} класс`

  const hasData = (isStudentLevel ? studentFacts.length : scopeFacts.length) > 0

  return (
    <div className="page">
      <h1 className="page__title" style={{ margin: '0 0 4px' }}>Экзамены</h1>

      <div className="toolbar">
        <Field label="Тип экзамена">
          <select className="select" value={type} onChange={(e) => setType(e.target.value as ExamTypeFilter)}>
            {EXAM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Город">
          <select className="select" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="all">Все города</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Параллель">
          <select className="select" value={grade} onChange={(e) => { setGrade(Number(e.target.value)); setClassName('all'); setStudentId('all') }}>
            {EXAM_GRADES.map((g) => <option key={g} value={g}>{g} класс</option>)}
          </select>
        </Field>
        <Field label="Класс">
          <select className="select" value={className} onChange={(e) => { setClassName(e.target.value); setStudentId('all') }}>
            <option value="all">Все классы</option>
            {classesInScope.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Ученик">
          <select className="select" value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ minWidth: 200 }}>
            {user?.role !== 'STUDENT' && <option value="all">Вся параллель / класс</option>}
            {scopeStudents.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.classId})</option>)}
          </select>
        </Field>
        <Field label="Предмет">
          <select className="select" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="all">Все предметы</option>
            {availableSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Период">
          <select className="select" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        {!isMulti && (
          <Field label="Учебный год">
            <select className="select" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        )}
        <Field label="Метрика">
          <select className="select" value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
            {METRIC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>

      {!hasData ? (
        <Card><EmptyState message="Нет экзаменов по выбранным фильтрам" /></Card>
      ) : isStudentLevel ? (
        <StudentLevel
          name={levelLabel} studentId={studentId} view={view}
          studentFacts={studentFacts} classFacts={classFacts} gradeFacts={yearGradeFacts}
        />
      ) : (
        <AggregateLevel
          name={levelLabel} isClass={isClass} view={view} sortByDynamic={metric === 'dynamic'}
          scopeFacts={scopeFacts} gradeFacts={yearGradeFacts}
        />
      )}

      <p className="text-muted" style={{ fontSize: 13 }}>
        Баллы приведены к % от максимального балла, чтобы сравнивать разные экзамены (ЕГЭ, ОГЭ, ВПР,
        директорский, пробный). «Директорский» — внутренние экзамены школы, «Общий» — ЕГЭ / ОГЭ / ВПР,
        «Пробный» — пробные ЕГЭ по назначенным предметам 11 класса.
      </p>
    </div>
  )
}

// ===================== Уровень «ученик» =====================

function StudentLevel({ name, studentId, view, studentFacts, classFacts, gradeFacts }: {
  name: string
  studentId: string
  view: ViewConfig
  studentFacts: ExamFact[]
  classFacts: ExamFact[]
  gradeFacts: ExamFact[]
}) {
  const studentAvg = round1(avg(studentFacts.map((f) => f.percent)))
  const classAggs = studentAggregates(classFacts)
  const gradeAggs = studentAggregates(gradeFacts)
  const classRank = rankOf(classAggs, studentId)
  const gradeRank = rankOf(gradeAggs, studentId)
  const dynamic = dynamicOf(studentFacts)

  const dynamics = useMemo(() => dynamicsSeries(studentFacts, view.granularity), [studentFacts, view.granularity])
  const bySubject = useMemo(() => subjectAverages(studentFacts), [studentFacts])
  const comparison = useMemo(() => subjectComparison(studentFacts, classFacts, gradeFacts), [studentFacts, classFacts, gradeFacts])
  const trends = useMemo(() => subjectDynamics(studentFacts), [studentFacts])
  const rising = trends.filter((t) => t.dynamic > 0)
  const falling = trends.filter((t) => t.dynamic < 0)

  const examRows = useMemo(() => {
    const sorted = [...studentFacts].sort((a, b) => a.examDate.localeCompare(b.examDate))
    const lastBySubject = new Map<string, number>()
    const rows = sorted.map((f) => {
      const prev = lastBySubject.get(f.subject)
      lastBySubject.set(f.subject, f.percent)
      const ranks = perExamRank(f, classFacts, gradeFacts)
      return {
        ...f,
        dyn: prev == null ? null : round1(f.percent - prev),
        classAvg: subjAvg(classFacts, f.subject),
        gradeAvg: subjAvg(gradeFacts, f.subject),
        ranks,
      }
    })
    return rows.reverse()
  }, [studentFacts, classFacts, gradeFacts])

  return (
    <>
      <div className="grid grid-4">
        <KpiCard label={view.unit === 'score' ? 'Средний балл ученика' : 'Средний балл, %'} value={`${studentAvg}%`} />
        <KpiCard label="Место в классе" value={classRank ? `${classRank}` : '—'} sub={`из ${classAggs.length}`} />
        <KpiCard label="Место в параллели" value={gradeRank ? `${gradeRank}` : '—'} sub={`из ${gradeAggs.length}`} />
        <KpiCard label="Динамика за период" value={`${dynamic > 0 ? '+' : ''}${dynamic}%`} />
      </div>

      <div className="grid grid-2">
        <Card title={`Динамика результатов: ${name}`}>
          {dynamics.length < 2 ? <EmptyState message="Недостаточно точек для динамики (расширьте период)" /> : (
            <DynamicsChart data={dynamics} view={view} seriesName="Балл ученика" />
          )}
        </Card>
        <Card title="Результаты ученика по предметам">
          <SubjectBarChart data={bySubject} view={view} />
        </Card>
      </div>

      <Card title="Сравнение: ученик / класс / параллель">
        <Legend items={[['Ученик', 'var(--blue)'], ['Средний класса', 'var(--green)'], ['Средний параллели', 'var(--orange)']]} />
        <ChartBox height={320}>
          <BarChart data={comparison} margin={{ top: 16, right: 16, left: 8, bottom: 70 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="#eef1f5" />
            <XAxis dataKey="subject" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} height={70} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }}>
              <AxisLabel value="Балл, %" axis="y" />
            </YAxis>
            <Tooltip formatter={(v, n) => [`${v}%`, String(n)]} labelFormatter={(l) => `Предмет: ${l}`} cursor={{ fill: 'rgba(127,127,127,0.06)' }} />
            <Bar dataKey="student" name="Ученик" fill="var(--blue)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="classAvg" name="Средний класса" fill="var(--green)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="gradeAvg" name="Средний параллели" fill="var(--orange)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ChartBox>
        {(rising.length > 0 || falling.length > 0) && (
          <p className="text-muted" style={{ marginTop: 10, fontSize: 13 }}>
            {rising.length > 0 && <>Рост: <span className="text-green">{rising.map((t) => t.subject).join(', ')}</span>. </>}
            {falling.length > 0 && <>Снижение: <span className="text-red">{falling.map((t) => t.subject).join(', ')}</span>.</>}
          </p>
        )}
      </Card>

      <Card title="Экзамены ученика">
        <div className="table-wrap">
          <table className="tbl tbl--compact">
            <thead>
              <tr>
                <th>Дата</th><th>Тип</th><th>Предмет</th>
                <th className="td-num">Балл</th><th className="td-num">Макс.</th><th className="td-num">% макс.</th>
                <th className="td-num">Ср. класс</th><th className="td-num">Ср. параллель</th>
                <th className="td-num">Место в классе</th><th className="td-num">Место в параллели</th><th>Динамика</th>
              </tr>
            </thead>
            <tbody>
              {examRows.map((r) => (
                <tr key={`${r.examType}-${r.subject}-${r.examDate}`}>
                  <td>{formatDate(r.examDate)}</td>
                  <td>{r.examType}</td>
                  <td className="td-strong">{r.subject}</td>
                  <td className="td-num">{r.score}</td>
                  <td className="td-num">{r.maxScore}</td>
                  <td className="td-num">{r.percent}%</td>
                  <td className="td-num">{r.classAvg}%</td>
                  <td className="td-num">{r.gradeAvg}%</td>
                  <td className="td-num">{r.ranks.classRank ? `${r.ranks.classRank} / ${r.ranks.classTotal}` : '—'}</td>
                  <td className="td-num">{r.ranks.gradeRank ? `${r.ranks.gradeRank} / ${r.ranks.gradeTotal}` : '—'}</td>
                  <td><Delta value={r.dyn} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

// ===================== Уровень «класс / параллель» =====================

function AggregateLevel({ name, isClass, view, sortByDynamic, scopeFacts, gradeFacts }: {
  name: string
  isClass: boolean
  view: ViewConfig
  sortByDynamic: boolean
  scopeFacts: ExamFact[]
  gradeFacts: ExamFact[]
}) {
  const scopeAvg = round1(avg(scopeFacts.map((f) => f.percent)))
  const gradeAvg = round1(avg(gradeFacts.map((f) => f.percent)))
  const classes = useMemo(() => classAggregates(gradeFacts), [gradeFacts])
  const scopeClasses = useMemo(() => classAggregates(scopeFacts), [scopeFacts])
  const bestClass = classes[0]
  const studentCount = useMemo(() => new Set(scopeFacts.map((f) => f.studentId)).size, [scopeFacts])
  const dynamic = dynamicOf(scopeFacts)

  const dynamics = useMemo(() => dynamicsSeries(scopeFacts, view.granularity), [scopeFacts, view.granularity])
  const bySubject = useMemo(() => subjectAverages(scopeFacts), [scopeFacts])
  const distribution = useMemo(() => scoreDistribution(scopeFacts), [scopeFacts])
  const vsGrade = useMemo(() => classVsGrade(scopeFacts, gradeFacts), [scopeFacts, gradeFacts])
  const students = useMemo(() => {
    const list = studentAggregates(scopeFacts)
    return sortByDynamic ? [...list].sort((a, b) => b.dynamic - a.dynamic) : list
  }, [scopeFacts, sortByDynamic])

  return (
    <>
      <div className="grid grid-4">
        <KpiCard label="Средний балл" value={`${scopeAvg}%`} sub={name} />
        {isClass
          ? <KpiCard label="Средний по параллели" value={`${gradeAvg}%`} sub={`разница ${scopeAvg - gradeAvg >= 0 ? '+' : ''}${round1(scopeAvg - gradeAvg)}%`} />
          : <KpiCard label="Лучший класс" value={bestClass ? bestClass.className : '—'} sub={bestClass ? `${bestClass.avgPercent}%` : undefined} />}
        <KpiCard label="Учеников с экзаменами" value={String(studentCount)} />
        <KpiCard label="Динамика среднего балла" value={`${dynamic > 0 ? '+' : ''}${dynamic}%`} />
      </div>

      <div className="grid grid-2">
        <Card title={`Динамика среднего балла: ${name}`}>
          {dynamics.length < 2 ? <EmptyState message="Недостаточно точек для динамики (расширьте период)" /> : (
            <DynamicsChart data={dynamics} view={view} seriesName="Средний балл" />
          )}
        </Card>
        <Card title="Средний балл по предметам">
          <SubjectBarChart data={bySubject} view={view} />
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title={isClass ? 'Сравнение класса со средним по параллели' : 'Сравнение классов внутри параллели'}>
          {isClass ? (
            <>
              <Legend items={[['Класс', 'var(--green)'], ['Параллель', 'var(--orange)']]} />
              <ChartBox>
                <BarChart data={vsGrade} margin={{ top: 16, right: 16, left: 8, bottom: 70 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="#eef1f5" />
                  <XAxis dataKey="subject" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} height={70} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }}>
                    <AxisLabel value="Балл, %" axis="y" />
                  </YAxis>
                  <Tooltip formatter={(v, n) => [`${v}%`, String(n)]} labelFormatter={(l) => `Предмет: ${l}`} cursor={{ fill: 'rgba(127,127,127,0.06)' }} />
                  <Bar dataKey="classAvg" name="Класс" fill="var(--green)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="gradeAvg" name="Параллель" fill="var(--orange)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ChartBox>
            </>
          ) : (
            <ChartBox>
              <BarChart data={classes} margin={CHART_MARGIN}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis dataKey="className" tickLine={false} axisLine={false} tick={{ fontSize: 12 }}>
                  <AxisLabel value="Класс" axis="x" offset={-2} />
                </XAxis>
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }}>
                  <AxisLabel value="Балл, %" axis="y" />
                </YAxis>
                <Tooltip formatter={(v) => [`${v}%`, 'Средний балл']} labelFormatter={(l) => `Класс: ${l}`} cursor={{ fill: 'rgba(127,127,127,0.06)' }} />
                <Bar dataKey="avgPercent" fill="var(--green)" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="avgPercent" position="top" fontSize={11} />
                </Bar>
              </BarChart>
            </ChartBox>
          )}
        </Card>

        <Card title="Распределение средних баллов учеников">
          <ChartBox>
            <BarChart data={distribution} margin={CHART_MARGIN}>
              <CartesianGrid vertical={false} stroke="#eef1f5" />
              <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 12 }}>
                <AxisLabel value="Диапазон балла, %" axis="x" offset={-2} />
              </XAxis>
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }}>
                <AxisLabel value="Учеников" axis="y" />
              </YAxis>
              <Tooltip formatter={(v) => [`${v}`, 'Учеников']} labelFormatter={(l) => `Диапазон: ${l}%`} cursor={{ fill: 'rgba(127,127,127,0.06)' }} />
              <Bar dataKey="count" fill="var(--blue)" radius={[4, 4, 0, 0]} maxBarSize={48}>
                <LabelList dataKey="count" position="top" fontSize={11} />
              </Bar>
            </BarChart>
          </ChartBox>
        </Card>
      </div>

      <Card title={isClass ? 'Показатели класса' : 'Классы параллели'}>
        <div className="table-wrap">
          <table className="tbl tbl--compact">
            <thead>
              <tr>
                <th>Класс</th><th className="td-num">Учеников</th><th className="td-num">Средний балл</th>
                <th className="td-num">Медиана</th><th className="td-num">Минимум</th><th className="td-num">Максимум</th>
                <th>Динамика</th><th className="td-num">В зоне риска</th>
              </tr>
            </thead>
            <tbody>
              {scopeClasses.map((c) => (
                <tr key={c.className}>
                  <td className="td-strong">{c.className}</td>
                  <td className="td-num">{c.count}</td>
                  <td className="td-num">{c.avgPercent}%</td>
                  <td className="td-num">{c.median}%</td>
                  <td className="td-num">{c.min}%</td>
                  <td className="td-num">{c.max}%</td>
                  <td><Delta value={c.dynamic} /></td>
                  <td className="td-num" style={{ color: c.riskCount ? 'var(--red)' : undefined }}>{c.riskCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Рейтинг учеников">
        <div className="table-wrap">
          <table className="tbl tbl--compact">
            <thead>
              <tr>
                <th className="td-num">Место</th><th>Ученик</th><th>Класс</th>
                <th className="td-num">Средний балл</th><th>Динамика</th><th>Риск</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.studentId}>
                  <td className="td-num">{i + 1}</td>
                  <td className="td-strong">{s.studentName}</td>
                  <td>{s.classId}</td>
                  <td className="td-num">{s.avgPercent}%</td>
                  <td><Delta value={s.dynamic} /></td>
                  <td style={{ color: RISK_COLOR[s.riskLevel] }}>{s.riskLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

// ===================== Переиспользуемые графики =====================

const CHART_MARGIN = { top: 16, right: 16, left: 8, bottom: 28 }

function DynamicsChart({ data, view, seriesName }: { data: { label: string; percent: number; score: number }[]; view: ViewConfig; seriesName: string }) {
  const key = view.unit
  const unitLabel = view.unit === 'score' ? 'Балл' : 'Балл, %'
  return (
    <ChartBox>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} stroke="#eef1f5" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }}>
          <AxisLabel value="Период" axis="x" />
        </XAxis>
        <YAxis domain={view.unit === 'score' ? [0, 'auto'] : [0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }}>
          <AxisLabel value={unitLabel} axis="y" />
        </YAxis>
        <Tooltip formatter={(v) => [view.unit === 'score' ? `${v}` : `${v}%`, seriesName]} labelFormatter={(l) => `Период: ${l}`} />
        <Line type="monotone" dataKey={key} name={seriesName} stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ChartBox>
  )
}

function SubjectBarChart({ data, view }: { data: { subject: string; percent: number; score: number }[]; view: ViewConfig }) {
  const key = view.unit
  const unitLabel = view.unit === 'score' ? 'Балл' : 'Балл, %'
  return (
    <ChartBox>
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} stroke="#eef1f5" />
        <XAxis dataKey="subject" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} height={70}>
          <AxisLabel value="Предмет" axis="x" offset={-2} />
        </XAxis>
        <YAxis domain={view.unit === 'score' ? [0, 'auto'] : [0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }}>
          <AxisLabel value={unitLabel} axis="y" />
        </YAxis>
        <Tooltip formatter={(v) => [view.unit === 'score' ? `${v}` : `${v}%`, 'Балл']} labelFormatter={(l) => `Предмет: ${l}`} cursor={{ fill: 'rgba(127,127,127,0.06)' }} />
        <Bar dataKey={key} fill="var(--bar)" radius={[4, 4, 0, 0]} maxBarSize={40}>
          <LabelList dataKey={key} position="top" fontSize={10} />
        </Bar>
      </BarChart>
    </ChartBox>
  )
}

function ChartBox({ children, height = 280 }: { children: ReactElement; height?: number }) {
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  )
}

function AxisLabel({ value, axis, offset = -14 }: { value: string; axis: 'x' | 'y'; offset?: number }) {
  if (axis === 'x') {
    return <Label value={value} position="insideBottom" offset={offset} style={{ fontSize: 12, fill: '#64748b' }} />
  }
  return <Label value={value} angle={-90} position="insideLeft" style={{ fontSize: 12, fill: '#64748b', textAnchor: 'middle' }} />
}

function Field({ label, children }: { label: string; children: ReactElement }) {
  return (
    <div className="field">
      <span className="field__label">{label}:</span>
      {children}
    </div>
  )
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="legend-row">
      {items.map(([label, color]) => (
        <span key={label} className="legend-item"><span className="legend-dot" style={{ background: color }} /> {label}</span>
      ))}
    </div>
  )
}
