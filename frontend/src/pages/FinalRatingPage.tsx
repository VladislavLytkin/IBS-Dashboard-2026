import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ParallelFilterValue } from '../types'
import { dashboardService } from '../services'
import { useFilters } from '../context/FiltersContext'
import { useApi } from '../hooks/useApi'
import { FINAL_SCORE_COMPONENTS } from '../utils/scoring'
import { Card, EmptyState, Medal, PageFooter, ParallelFilter, scoreClass } from '../components/ui'

const DIST = [
  { label: 'Высокий', range: '80–100', color: '#16a34a', test: (s: number) => s >= 80 },
  { label: 'Хороший', range: '60–79', color: '#2563eb', test: (s: number) => s >= 60 && s < 80 },
  { label: 'Средний', range: '40–59', color: '#f59e0b', test: (s: number) => s >= 40 && s < 60 },
  { label: 'Низкий', range: '0–39', color: '#dc2626', test: (s: number) => s < 40 },
]

export function FinalRatingPage() {
  const { year } = useFilters()
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const grade = parallel === 'all' ? 'all' : parallel
  const { data, loading, error } = useApi(() => dashboardService.finalRating({ year, grade }), [year, grade])
  const rows = data ?? []
  const showGrade = parallel === 'all'

  const distribution = useMemo(() => {
    const total = rows.length || 1
    return DIST.map((b) => {
      const count = rows.filter((r) => b.test(r.finalScore)).length
      return { ...b, count, percent: Math.round((count / total) * 100) }
    })
  }, [rows])

  return (
    <div className="page">
      <div className="info-banner">
        <span>Итоговый рейтинг рассчитывается по единой формуле (бэкенд, <code>utils/scoring</code>):</span>
        {FINAL_SCORE_COMPONENTS.map((c) => (
          <span key={c.key} className="weight-pill" style={{ color: c.color }}>
            {c.label} — {Math.round(c.weight * 100)}%
          </span>
        ))}
      </div>

      <div className="toolbar">
        <ParallelFilter value={parallel} onChange={setParallel} />
      </div>

      <Card title={`Итоговый рейтинг классов · ${year}`}>
        {loading ? (
          <EmptyState message="Загрузка…" />
        ) : error ? (
          <EmptyState message={error} />
        ) : rows.length === 0 ? (
          <EmptyState message="Нет данных за выбранный период." />
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th className="td-num">Место</th><th>Класс</th>{showGrade && <th>Параллель</th>}
                  <th className="td-num">Итоговый балл</th>
                  <th className="td-num" style={{ color: 'var(--blue)' }}>Академ. (35%)</th>
                  <th className="td-num" style={{ color: 'var(--green)' }}>Олимп. (25%)</th>
                  <th className="td-num" style={{ color: 'var(--purple)' }}>Посещ. (15%)</th>
                  <th className="td-num" style={{ color: 'var(--orange)' }}>Активн. (15%)</th>
                  <th className="td-num" style={{ color: 'var(--red)' }}>Риск (10%)</th>
                  <th className="td-num">Динамика</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="td-num"><Medal place={i + 1} /></td>
                    <td className="td-strong">{r.name}</td>
                    {showGrade && <td>{r.grade}</td>}
                    <td className={'td-num ' + scoreClass(r.finalScore)}>{r.finalScore.toFixed(1)}</td>
                    <td className="td-num" style={{ color: 'var(--blue)' }}>{r.academicScore.toFixed(1)}</td>
                    <td className="td-num" style={{ color: 'var(--green)' }}>{r.olympiadScore.toFixed(1)}</td>
                    <td className="td-num" style={{ color: 'var(--purple)' }}>{r.attendanceScore.toFixed(1)}</td>
                    <td className="td-num" style={{ color: 'var(--orange)' }}>{r.activityScore.toFixed(1)}</td>
                    <td className="td-num" style={{ color: 'var(--red)' }}>{r.riskScore}</td>
                    <td className={'td-num ' + (r.trend === 'up' ? 'text-green' : r.trend === 'down' ? 'text-red' : 'text-muted')}>
                      {r.weeklyDelta > 0 ? '+' : ''}{r.weeklyDelta.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <Card title="Распределение классов по уровням рейтинга">
          <div className="flex" style={{ gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 170, height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="percent" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {distribution.map((d) => <Cell key={d.label} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 220 }}>
              {distribution.map((d) => (
                <li key={d.label} className="flex-between">
                  <span className="legend-item"><span className="legend-dot" style={{ background: d.color }} />{d.label} ({d.range})</span>
                  <span className="text-muted">{d.percent}% ({d.count})</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <PageFooter />
    </div>
  )
}
