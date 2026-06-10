import { useState } from 'react'
import {
  CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, LabelList,
} from 'recharts'
import {
  RATING_DISTRIBUTION, RATING_SCHOOL_DYNAMICS, RATING_WEIGHTS, STUDENT_RATING,
} from '../data/studentRating'
import { ALL_CLASSES } from '../data/classes'
import { IconDownload, IconInfo } from '../components/icons'
import { Card, Medal, PageFooter, scoreClass } from '../components/ui'

const fmt = (n: number) => n.toFixed(1).replace('.', ',')

export function StudentRatingPage() {
  const [klass, setKlass] = useState('Все классы')
  const [period, setPeriod] = useState('2023/2024 учебный год')

  const rows = STUDENT_RATING.filter((r) => klass === 'Все классы' || r.className === klass)

  return (
    <div className="page">
      <div className="info-banner">
        <IconInfo width={18} height={18} />
        <span>Итоговый рейтинг рассчитывается автоматически на основе следующих компонентов:</span>
        {RATING_WEIGHTS.map((w) => (
          <span key={w.label} className="weight-pill" style={{ color: w.color }}>
            {w.label} — {w.weight}%
          </span>
        ))}
      </div>

      <div className="toolbar">
        <div className="field">
          <span className="field__label">Класс:</span>
          <select className="select" value={klass} onChange={(e) => setKlass(e.target.value)}>
            <option>Все классы</option>
            {ALL_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field__label">Период:</span>
          <select className="select" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ minWidth: 200 }}>
            <option>2023/2024 учебный год</option>
            <option>1 триместр 2023/24</option>
            <option>2 триместр 2023/24</option>
          </select>
        </div>
        <button className="btn btn--ghost-blue toolbar__spacer"><IconDownload /> Экспорт в Excel</button>
      </div>

      <Card title="Рейтинг учеников">
        <div className="table-wrap">
          <table className="tbl tbl--compact">
            <thead>
              <tr>
                <th rowSpan={2} className="td-num">Место</th>
                <th rowSpan={2}>ФИО</th>
                <th rowSpan={2}>Класс</th>
                <th rowSpan={2} className="td-num">Итоговый балл<br /><span className="text-muted" style={{ fontWeight: 400 }}>(из 100)</span></th>
                <th colSpan={4} className="td-num">Детализация по компонентам</th>
              </tr>
              <tr>
                <th className="td-num" style={{ color: 'var(--blue)' }}>Средний балл оценок<br /><span style={{ fontWeight: 400 }}>(40%)</span></th>
                <th className="td-num" style={{ color: 'var(--green)' }}>Олимпиады<br /><span style={{ fontWeight: 400 }}>(30%)</span></th>
                <th className="td-num" style={{ color: 'var(--orange)' }}>СПД (часы)<br /><span style={{ fontWeight: 400 }}>(10%)</span></th>
                <th className="td-num" style={{ color: 'var(--purple)' }}>Посещаемость<br /><span style={{ fontWeight: 400 }}>(20%)</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.fullName}>
                  <td className="td-num"><Medal place={r.place} /></td>
                  <td className="td-strong">{r.fullName}</td>
                  <td>{r.className}</td>
                  <td className={'td-num ' + scoreClass(r.total)}>{fmt(r.total)}</td>
                  <td className="td-num" style={{ color: 'var(--blue)' }}>{fmt(r.grades)} / 40</td>
                  <td className="td-num" style={{ color: 'var(--green)' }}>{fmt(r.olympiads)} / 30</td>
                  <td className="td-num" style={{ color: 'var(--orange)' }}>{fmt(r.volunteering)} / 10</td>
                  <td className="td-num" style={{ color: 'var(--purple)' }}>{fmt(r.attendance)} / 20</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="Распределение учеников по уровням рейтинга">
          <div className="flex" style={{ gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={RATING_DISTRIBUTION} dataKey="percent" nameKey="label"
                    innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {RATING_DISTRIBUTION.map((d) => <Cell key={d.label} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 220 }}>
              {RATING_DISTRIBUTION.map((d) => (
                <li key={d.label} className="flex-between">
                  <span className="legend-item">
                    <span className="legend-dot" style={{ background: d.color }} />
                    {d.label} ({d.range})
                  </span>
                  <span className="text-muted">{d.percent}% ({d.count} чел.)</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card title="Динамика среднего итогового балла по школе">
          <div className="chart-box" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={RATING_SCHOOL_DYNAMICS} margin={{ top: 24, right: 24, left: -10, bottom: 16 }}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
                <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickLine={false} axisLine={false} />
                <Line type="monotone" dataKey="value" stroke="var(--blue)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--blue)' }}>
                  <LabelList dataKey="value" position="top" fontSize={12} formatter={fmt} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <PageFooter />
    </div>
  )
}
