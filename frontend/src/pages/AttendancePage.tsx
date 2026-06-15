import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid, Label, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, EmptyState } from '../components/ui'
import { AcademicPeriodFilter, type SemesterValue } from '../components/AcademicPeriodFilter'
import { useAuth } from '../auth/AuthContext'
import { getVisibleCities, classesInCity, CITIES, type City } from '../data/cities'
import { getVisibleClasses, getVisibleStudents, isStudent } from '../data/permissions'
import { getStudents } from '../data/students'
import {
  academicYearsOf, calculateAttendanceStats, calculateMonthlyTrend,
  filterAttendance, getAbsenceDetailsFromRows, getAttendanceForStudents,
  type AttendanceAbsenceDetail, type AttendanceTrendBar,
} from '../data/syntheticAttendance'

/** Tooltip графика динамики: период и количество дней по каждому статусу. */
function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: AttendanceTrendBar }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tip">
      <div className="chart-tip__title">Период: {d.fullLabel}</div>
      <div style={{ color: 'var(--green)' }}>Присутствовал: {d.present} дн.</div>
      <div style={{ color: 'var(--orange)' }}>Отсутствовал: {d.absent} дн.</div>
      <div style={{ color: 'var(--red)' }}>Прогулы: {d.truancy} дн.</div>
    </div>
  )
}

export function AttendancePage() {
  const { user } = useAuth()
  const studentRole = isStudent(user)

  // ----- Город (только для сотрудников) -----
  const cities = useMemo(() => getVisibleCities(user), [user])
  const [city, setCity] = useState(cities[0] ?? CITIES[0])
  useEffect(() => {
    if (cities.length && !cities.includes(city)) setCity(cities[0])
  }, [city, cities])

  // ----- Класс -----
  const allVisibleClasses = useMemo(() => getVisibleClasses(user), [user])
  const classes = useMemo(() => {
    if (studentRole) return allVisibleClasses
    const inCity = classesInCity(city)
    const filtered = allVisibleClasses.filter((c) => inCity.includes(c))
    return filtered.length ? filtered : allVisibleClasses
  }, [allVisibleClasses, city, studentRole])
  const [className, setClassName] = useState(classes[0] ?? '7Б')
  useEffect(() => {
    if (classes.length && !classes.includes(className)) setClassName(classes[0])
  }, [className, classes])

  // ----- Выбор ученика ('all' = общая статистика; ученик видит только себя) -----
  const students = useMemo(() => getVisibleStudents(user, className), [user, className])
  const [studentId, setStudentId] = useState<string>('all')
  useEffect(() => {
    if (studentRole) {
      setStudentId(students[0]?.id ?? '')
    } else if (studentId !== 'all' && !students.some((s) => s.id === studentId)) {
      setStudentId('all')
    }
  }, [studentRole, students, studentId])

  // Ученики класса (для агрегированной статистики и списка учебных лет).
  const classStudentIds = useMemo(() => {
    if (studentRole) return [user?.studentId ?? user?.id ?? '']
    return getStudents(className).map((s) => s.id)
  }, [studentRole, className, user])

  // ----- Учебный год / семестр -----
  const yearScopeRows = useMemo(() => getAttendanceForStudents(classStudentIds), [classStudentIds])
  const availableYears = useMemo(() => academicYearsOf(yearScopeRows), [yearScopeRows])
  const [year, setYear] = useState(availableYears[0] ?? '')
  useEffect(() => {
    if (availableYears.length && !availableYears.includes(year)) setYear(availableYears[0])
  }, [year, availableYears])
  const [semester, setSemester] = useState<SemesterValue>('all')

  // ----- Итоговые записи к показу -----
  const isAggregate = !studentRole && studentId === 'all'
  const displayStudentIds = useMemo(() => {
    if (isAggregate) return classStudentIds
    if (studentRole) return classStudentIds
    return [studentId]
  }, [isAggregate, studentRole, studentId, classStudentIds])

  const displayRows = useMemo(
    () => filterAttendance(getAttendanceForStudents(displayStudentIds), { academicYear: year, semester }),
    [displayStudentIds, year, semester],
  )

  const stats = useMemo(() => calculateAttendanceStats(displayRows), [displayRows])
  const trend = useMemo(() => calculateMonthlyTrend(displayRows), [displayRows])
  // Детализация пропусков осмысленна только для одного ученика.
  const details = useMemo(
    () => (isAggregate ? null : getAbsenceDetailsFromRows(displayRows)),
    [displayRows, isAggregate],
  )

  const { totalDays, present, absent, truancy } = stats
  const pct = (n: number) => (totalDays ? `${((n / totalDays) * 100).toFixed(1).replace('.', ',')}%` : '—')

  const selectedStudentName = students.find((s) => s.id === studentId)?.fullName
  const scopeLabel = studentRole
    ? 'мои данные'
    : isAggregate
      ? `класс ${className}, ${city}`
      : (selectedStudentName ?? '')

  const [absenceTab, setAbsenceTab] = useState<'excused' | 'truancy'>('excused')

  return (
    <div className="page">
      <h1 className="page__title" style={{ margin: '0 0 4px' }}>
        {studentRole ? 'Моя посещаемость' : 'Посещаемость'}
      </h1>

      <div className="toolbar">
        {!studentRole && (
          <>
            <div className="field">
              <span className="field__label">Город:</span>
              <select className="select" value={city} onChange={(e) => setCity(e.target.value as City)}>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <span className="field__label">Класс:</span>
              <select className="select" value={className} onChange={(e) => setClassName(e.target.value)}>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <span className="field__label">Ученик:</span>
              <select className="select" value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ minWidth: 200 }}>
                <option value="all">Все ученики — общая статистика</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </div>
          </>
        )}
        <AcademicPeriodFilter
          years={availableYears}
          year={year}
          onYearChange={setYear}
          semester={semester}
          onSemesterChange={setSemester}
        />
      </div>

      <Card title={`${isAggregate ? 'Общая статистика' : 'Статистика'}${scopeLabel ? ` — ${scopeLabel}` : ''}`}>
        {totalDays === 0 ? (
          <EmptyState message="Нет данных посещаемости за выбранный период" />
        ) : (
          <div className="stat-row">
            <div className="stat-box">
              <div className="stat-box__label">Учебных дней</div>
              <div className="stat-box__value">{totalDays}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box__label">Присутствовал</div>
              <div className="stat-box__value text-green">{present}</div>
              <div className="stat-box__sub">({pct(present)})</div>
            </div>
            <div className="stat-box">
              <div className="stat-box__label">Отсутствовал</div>
              <div className="stat-box__value" style={{ color: 'var(--orange)' }}>{absent}</div>
              <div className="stat-box__sub">({pct(absent)})</div>
            </div>
            <div className="stat-box">
              <div className="stat-box__label">Прогулы (без уваж. причины)</div>
              <div className="stat-box__value text-red">{truancy}</div>
              <div className="stat-box__sub">({pct(truancy)})</div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Динамика посещаемости">
        <div className="legend-row">
          <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--green)' }} /> Присутствовал</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--orange)' }} /> Отсутствовал</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--red)' }} /> Прогулы</span>
        </div>
        {trend.length === 0 ? (
          <EmptyState message="Нет данных для графика за выбранный период" />
        ) : (
          <div className="chart-box" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 12, right: 20, left: 8, bottom: 24 }}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }}>
                  <Label value="Период" position="insideBottom" offset={-12} style={{ fontSize: 12, fill: '#64748b' }} />
                </XAxis>
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }}>
                  <Label value="Количество дней" angle={-90} position="insideLeft" style={{ fontSize: 12, fill: '#64748b', textAnchor: 'middle' }} />
                </YAxis>
                <Tooltip content={<TrendTooltip />} />
                <Line type="monotone" dataKey="present" name="Присутствовал" stroke="var(--green)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="absent" name="Отсутствовал" stroke="var(--orange)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="truancy" name="Прогулы" stroke="var(--red)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {details && (
        <Card title="Детализация пропусков">
          <div className="detail-tabs">
            <button className={`detail-tab${absenceTab === 'excused' ? ' is-orange' : ''}`} onClick={() => setAbsenceTab('excused')}>
              Отсутствия (уваж.)
            </button>
            <button className={`detail-tab${absenceTab === 'truancy' ? ' is-red' : ''}`} onClick={() => setAbsenceTab('truancy')}>
              Прогулы
            </button>
          </div>
          {absenceTab === 'excused' ? (
            <DetailTable rows={details.excused} lastLabel="Причина" emptyMessage="Уважительных отсутствий за период нет" />
          ) : (
            <DetailTable rows={details.truancy} lastLabel="Комментарий" emptyMessage="Прогулов за период нет" />
          )}
          <p className="text-muted" style={{ marginTop: 14, fontSize: 13 }}>
            Прогул — отсутствие без уважительной причины.
          </p>
        </Card>
      )}
    </div>
  )
}

function DetailTable({ rows, lastLabel, emptyMessage }: { rows: AttendanceAbsenceDetail[]; lastLabel: string; emptyMessage: string }) {
  if (!rows.length) return <div className="empty empty--compact"><p>{emptyMessage}</p></div>
  return (
    <div className="table-wrap">
      <table className="tbl tbl--compact">
        <thead>
          <tr><th>Дата</th><th>Урок(и)</th><th>Предмет</th><th>{lastLabel}</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.date}</td>
              <td>{r.lessons}</td>
              <td>{r.subject}</td>
              <td className="text-muted">{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
