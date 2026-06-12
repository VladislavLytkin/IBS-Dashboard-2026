import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { AbsenceDetail, AttendanceMark } from '../types'
import {
  ATTENDANCE_LABELS, ATTENDANCE_WEEKDAYS,
  getAbsenceDetails, getClassTrend, getStudentCalendar, getStudentSummary, setAttendanceMark,
} from '../data/attendance'
import { ALL_CLASSES } from '../data/classes'
import { getStudents } from '../data/students'
import { Card, MonthSelect } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

const MARK_LETTER: Record<AttendanceMark, string> = {
  present: 'П', absent: 'О', truancy: 'Н', weekend: 'В',
}
const MARK_CLASS: Record<AttendanceMark, string> = {
  present: 'mark-present', absent: 'mark-absent', truancy: 'mark-truancy', weekend: 'mark-weekend',
}
/** Порядок смены статуса при клике учителя по дню. */
const NEXT_MARK: Record<Exclude<AttendanceMark, 'weekend'>, Exclude<AttendanceMark, 'weekend'>> = {
  present: 'absent', absent: 'truancy', truancy: 'present',
}

export function AttendancePage() {
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
  const [absenceTab, setAbsenceTab] = useState<'excused' | 'truancy'>('excused')
  const classStudents = getStudents(className)
  const students = user?.role === 'STUDENT'
    ? [{ id: user.studentId ?? user.id, fullName: user.fullName }]
    : classStudents
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  useEffect(() => {
    if (students.length && !students.some((s) => s.id === studentId)) setStudentId(students[0].id)
  }, [studentId, students])

  // version растёт после каждой правки — сводка, календарь и графики пересчитываются сразу.
  const [version, setVersion] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summary = useMemo(() => getStudentSummary(studentId), [studentId, version])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calendar = useMemo(() => getStudentCalendar(studentId), [studentId, version])
  const trend = useMemo(
    () => getClassTrend(classStudents.map((s) => s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [className, version],
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const details = useMemo(() => getAbsenceDetails(studentId), [studentId, version])

  const { totalDays, present, absent, truancy } = summary
  const pct = (n: number) => `${((n / totalDays) * 100).toFixed(1).replace('.', ',')}%`

  const onClassChange = (value: string) => {
    setClassName(value)
    setStudentId(getStudents(value)[0]?.id ?? '')
  }

  const onDayClick = (day: number, mark: AttendanceMark, outside?: boolean) => {
    if (!canEdit || outside || mark === 'weekend') return
    setAttendanceMark(studentId, day, NEXT_MARK[mark])
    setVersion((v) => v + 1)
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
          <select className="select" value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ minWidth: 180 }}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </div>
        <div className="toolbar__spacer"><MonthSelect label="Месяц:" /></div>
      </div>

      <div className="grid grid-2">
        <Card title="Общая статистика за май 2024">
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
              <div className="stat-box__label">Прогулы (Н)</div>
              <div className="stat-box__value text-red">{truancy}</div>
              <div className="stat-box__sub">({pct(truancy)})</div>
            </div>
          </div>
        </Card>

        <Card title={`Динамика посещаемости класса ${className}`}>
          <div className="legend-row">
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--green)' }} /> Присутствие (%)</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--orange)' }} /> Отсутствие (%)</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--red)' }} /> Прогулы (%)</span>
          </div>
          <div className="chart-box" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={3} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Line type="monotone" dataKey="present" name={ATTENDANCE_LABELS.present} stroke="var(--green)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="absent" name={ATTENDANCE_LABELS.absent} stroke="var(--orange)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="truancy" name={ATTENDANCE_LABELS.truancy} stroke="var(--red)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title="Посещаемость по дням">
          <div className="cal-legend">
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--green)' }} /> П – присутствовал</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--orange)' }} /> О – отсутствовал (уваж.)</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--red)' }} /> Н – прогул</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--text-soft)' }} /> Выходной</span>
          </div>
          <div className="cal">
            {ATTENDANCE_WEEKDAYS.map((w) => <div key={w} className="cal__head">{w}</div>)}
            {calendar.map((d, i) => {
              const editable = canEdit && !d.outside && d.mark !== 'weekend'
              return (
                <div
                  key={i}
                  className={`cal__cell${d.outside ? ' is-outside' : ''}${editable ? ' is-editable' : ''}`}
                  title={editable ? 'Нажмите, чтобы изменить статус' : undefined}
                  onClick={() => onDayClick(d.day, d.mark, d.outside)}
                >
                  <span className="cal__day">{d.day}</span>
                  <span className={`cal__mark ${MARK_CLASS[d.mark]}`}>{MARK_LETTER[d.mark]}</span>
                </div>
              )
            })}
          </div>
          <div className="flex" style={{ gap: 18, marginTop: 14, fontSize: 13 }}>
            <span className="text-green">Присутствовал: {present} ({pct(present)})</span>
            <span style={{ color: 'var(--orange)' }}>Отсутствовал: {absent} ({pct(absent)})</span>
            <span className="text-red">Прогулы: {truancy} ({pct(truancy)})</span>
          </div>
          {canEdit && (
            <p className="text-muted" style={{ marginTop: 10, fontSize: 13 }}>
              Кликните по учебному дню, чтобы изменить статус: присутствие → отсутствие → прогул.
            </p>
          )}
        </Card>

        <Card title="Детализация пропусков">
          <div className="detail-tabs">
            <button className={`detail-tab${absenceTab === 'excused' ? ' is-orange' : ''}`} onClick={() => setAbsenceTab('excused')}>
              Отсутствия (уваж.)
            </button>
            <button className={`detail-tab${absenceTab === 'truancy' ? ' is-red' : ''}`} onClick={() => setAbsenceTab('truancy')}>
              Прогулы (Н)
            </button>
          </div>
          {absenceTab === 'excused' ? (
            <DetailTable rows={details.excused} lastLabel="Причина" emptyMessage="Уважительных отсутствий за период нет" />
          ) : (
            <DetailTable rows={details.truancy} lastLabel="Комментарий" emptyMessage="Прогулов за период нет" />
          )}

          <p className="text-muted" style={{ marginTop: 14, fontSize: 13 }}>
            Примечание: Н – прогул без уважительной причины.
          </p>
        </Card>
      </div>
    </div>
  )
}

function DetailTable({ rows, lastLabel, emptyMessage }: { rows: AbsenceDetail[]; lastLabel: string; emptyMessage: string }) {
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
