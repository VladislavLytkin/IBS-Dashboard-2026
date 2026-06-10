import { useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { AbsenceDetail, AttendanceMark } from '../types'
import {
  ABSENCE_EXCUSED, ABSENCE_TRUANCY, ATTENDANCE_CALENDAR, ATTENDANCE_SUMMARY,
  ATTENDANCE_TREND, ATTENDANCE_WEEKDAYS,
} from '../data/attendance'
import { ALL_CLASSES } from '../data/classes'
import { getStudents } from '../data/students'
import { Card, MonthSelect, PageFooter } from '../components/ui'

const MARK_LETTER: Record<AttendanceMark, string> = {
  present: 'П', absent: 'О', truancy: 'Н', weekend: 'В',
}
const MARK_CLASS: Record<AttendanceMark, string> = {
  present: 'mark-present', absent: 'mark-absent', truancy: 'mark-truancy', weekend: 'mark-weekend',
}

export function AttendancePage() {
  const [className, setClassName] = useState('7Б')
  const [absenceTab, setAbsenceTab] = useState<'excused' | 'truancy'>('excused')
  const students = getStudents(className)
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')

  const { totalLessons, present, absent, truancy } = ATTENDANCE_SUMMARY
  const pct = (n: number) => `${((n / totalLessons) * 100).toFixed(1).replace('.', ',')}%`

  const onClassChange = (value: string) => {
    setClassName(value)
    setStudentId(getStudents(value)[0]?.id ?? '')
  }

  return (
    <div className="page">
      <div className="toolbar">
        <div className="field">
          <span className="field__label">Выберите класс:</span>
          <select className="select" value={className} onChange={(e) => onClassChange(e.target.value)}>
            {ALL_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
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
              <div className="stat-box__label">Всего уроков</div>
              <div className="stat-box__value">{totalLessons}</div>
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

        <Card title="Динамика посещаемости">
          <div className="legend-row">
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--green)' }} /> Присутствие (%)</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--orange)' }} /> Отсутствие (%)</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--red)' }} /> Прогулы (%)</span>
          </div>
          <div className="chart-box" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ATTENDANCE_TREND} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={3} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${v}%`} />
                <Tooltip />
                <Line type="monotone" dataKey="present" stroke="var(--green)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="absent" stroke="var(--orange)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="truancy" stroke="var(--red)" strokeWidth={2} dot={{ r: 2 }} />
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
            {ATTENDANCE_CALENDAR.map((d, i) => (
              <div key={i} className={`cal__cell${d.outside ? ' is-outside' : ''}`}>
                <span className="cal__day">{d.day}</span>
                <span className={`cal__mark ${MARK_CLASS[d.mark]}`}>{MARK_LETTER[d.mark]}</span>
              </div>
            ))}
          </div>
          <div className="flex" style={{ gap: 18, marginTop: 14, fontSize: 13 }}>
            <span className="text-green">Присутствовал: {present} ({pct(present)})</span>
            <span style={{ color: 'var(--orange)' }}>Отсутствовал: {absent} ({pct(absent)})</span>
            <span className="text-red">Прогулы: {truancy} ({pct(truancy)})</span>
          </div>
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
            <DetailTable rows={ABSENCE_EXCUSED} lastLabel="Причина" emptyMessage="Уважительных отсутствий за период нет" />
          ) : (
            <DetailTable rows={ABSENCE_TRUANCY} lastLabel="Комментарий" emptyMessage="Прогулов за период нет" />
          )}

          <p className="text-muted" style={{ marginTop: 14, fontSize: 13 }}>
            Примечание: Н – прогул без уважительной причины.
          </p>
        </Card>
      </div>

      <PageFooter />
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
