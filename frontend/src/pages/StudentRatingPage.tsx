import { useMemo, useState } from 'react'
import {
  CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, LabelList,
} from 'recharts'
import type { ParallelFilterValue, RatingDistribution } from '../types'
import { getStudentRanking } from '../data/students'
import { RATING_SCHOOL_DYNAMICS } from '../data/studentRating'
import { FINAL_SCORE_COMPONENTS } from '../utils/scoring'
import { IconDownload } from '../components/icons'
import { Card, EmptyState, Medal, PageFooter, ParallelFilter, scoreClass } from '../components/ui'

const fmt = (n: number) => n.toFixed(1).replace('.', ',')

function buildDistribution(scores: number[]): RatingDistribution[] {
  const buckets = [
    { label: 'Высокий', range: '80–100', color: '#16a34a', test: (s: number) => s >= 80 },
    { label: 'Хороший', range: '60–79', color: '#2563eb', test: (s: number) => s >= 60 && s < 80 },
    { label: 'Средний', range: '40–59', color: '#f59e0b', test: (s: number) => s >= 40 && s < 60 },
    { label: 'Низкий', range: '0–39', color: '#dc2626', test: (s: number) => s < 40 },
  ]
  const total = scores.length || 1
  return buckets.map((b) => {
    const count = scores.filter(b.test).length
    return { label: b.label, range: b.range, color: b.color, count, percent: Math.round((count / total) * 100) }
  })
}

export function StudentRatingPage() {
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const ranking = useMemo(() => getStudentRanking(parallel), [parallel])
  const distribution = useMemo(() => buildDistribution(ranking.map((r) => r.finalScore)), [ranking])

  const topRows = ranking.slice(0, 12)

  return (
    <div className="page">
      <div className="info-banner">
        <span>Итоговый рейтинг рассчитывается автоматически по единой формуле (см. <code>src/utils/scoring.ts</code>):</span>
        {FINAL_SCORE_COMPONENTS.map((c) => (
          <span key={c.key} className="weight-pill" style={{ color: c.color }}>
            {c.label} — {Math.round(c.weight * 100)}%
          </span>
        ))}
      </div>

      <div className="toolbar">
        <ParallelFilter value={parallel} onChange={setParallel} />
        <button className="btn btn--ghost-blue toolbar__spacer"><IconDownload /> Экспорт в Excel</button>
      </div>

      <Card title="Рейтинг учеников">
        {topRows.length === 0 ? (
          <EmptyState message="Для выбранной параллели нет данных." />
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th className="td-num">Место</th>
                  <th>ФИО</th>
                  <th>Класс</th>
                  <th className="td-num">Итоговый балл</th>
                  <th className="td-num" style={{ color: 'var(--blue)' }}>Академ. (35%)</th>
                  <th className="td-num" style={{ color: 'var(--green)' }}>Олимп. (25%)</th>
                  <th className="td-num" style={{ color: 'var(--purple)' }}>Посещ. (15%)</th>
                  <th className="td-num" style={{ color: 'var(--orange)' }}>Активн. (15%)</th>
                  <th className="td-num" style={{ color: 'var(--red)' }}>Риск (10%)</th>
                </tr>
              </thead>
              <tbody>
                {topRows.map((r) => (
                  <tr key={r.student.id}>
                    <td className="td-num"><Medal place={r.place} /></td>
                    <td className="td-strong">{r.student.fullName}</td>
                    <td>{r.student.classId}</td>
                    <td className={'td-num ' + scoreClass(r.finalScore)}>{fmt(r.finalScore)}</td>
                    <td className="td-num" style={{ color: 'var(--blue)' }}>{fmt(r.academic)}</td>
                    <td className="td-num" style={{ color: 'var(--green)' }}>{fmt(r.olympiad)}</td>
                    <td className="td-num" style={{ color: 'var(--purple)' }}>{fmt(r.attendance)}</td>
                    <td className="td-num" style={{ color: 'var(--orange)' }}>{fmt(r.activity)}</td>
                    <td className="td-num" style={{ color: 'var(--red)' }}>{r.student.riskScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-2">
        <Card title="Распределение учеников по уровням рейтинга">
          <div className="flex" style={{ gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="percent" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {distribution.map((d) => <Cell key={d.label} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 220 }}>
              {distribution.map((d) => (
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
