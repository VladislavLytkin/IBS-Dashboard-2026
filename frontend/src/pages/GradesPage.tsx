import { useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis,
} from 'recharts'
import { ALL_CLASSES } from '../data/classes'
import { getStudents } from '../data/students'
import { SUBJECT_AVERAGES, TERM_GRADES, TERM_WEEKS } from '../data/grades'
import { IconDownload } from '../components/icons'
import { Card, MonthSelect, PageFooter } from '../components/ui'

export function GradesPage() {
  const [className, setClassName] = useState('7Б')
  const students = getStudents(className)
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')

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
        <div className="toolbar__spacer">
          <MonthSelect />
        </div>
      </div>

      <Card title="Средний балл по предметам за месяц">
        <div className="chart-box" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SUBJECT_AVERAGES} margin={{ top: 24, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#eef1f5" />
              <XAxis dataKey="subject" tickLine={false} axisLine={false} interval={0}
                tick={{ fontSize: 11 }} angle={0} height={40} />
              <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tickLine={false} axisLine={false} />
              <Bar dataKey="average" fill="var(--bar)" radius={[4, 4, 0, 0]} maxBarSize={46}>
                <LabelList dataKey="average" position="top" fontSize={12} fill="#334155"
                  formatter={(v: number) => v.toFixed(1)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Оценки за четверть (III четверть)">
        <div className="table-wrap">
          <table className="tbl tbl--compact">
            <thead>
              <tr>
                <th>Предмет</th>
                {TERM_WEEKS.map((w) => <th key={w} className="td-num">{w} неделя</th>)}
                <th className="td-num">Итоговая оценка</th>
              </tr>
            </thead>
            <tbody>
              {TERM_GRADES.map((row) => (
                <tr key={row.subject}>
                  <td className="td-strong">{row.subject}</td>
                  {row.weeks.map((g, i) => (
                    <td key={i} className="td-num">{g ?? '—'}</td>
                  ))}
                  <td className="td-num score-green">{row.final}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-between" style={{ marginTop: 18 }}>
          <span className="text-muted">Примечание: оценки указаны по 5-балльной шкале.</span>
          <button className="btn btn--ghost-blue"><IconDownload /> Скачать в Excel</button>
        </div>
      </Card>

      <PageFooter />
    </div>
  )
}
