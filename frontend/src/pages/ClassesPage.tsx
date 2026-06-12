import { useState } from 'react'
import type { ParallelFilterValue } from '../types'
import { classesService } from '../services'
import { useFilters } from '../context/FiltersContext'
import { useApi } from '../hooks/useApi'
import { Card, EmptyState, ParallelFilter, TrendArrow, scoreClass } from '../components/ui'

export function ClassesPage() {
  const { year } = useFilters()
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const grade = parallel === 'all' ? 'all' : parallel
  const { data, loading, error } = useApi(() => classesService.list({ year, grade }), [year, grade])
  const rows = (data ?? []).slice().sort((a, b) => (a.grade - b.grade) || a.name.localeCompare(b.name))

  return (
    <div className="page">
      <div className="toolbar"><ParallelFilter value={parallel} onChange={setParallel} /></div>
      <Card title={`Классы · ${year}`}>
        {loading ? <EmptyState message="Загрузка…" /> : error ? <EmptyState message={error} /> : rows.length === 0 ? (
          <EmptyState message="Нет данных." />
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th>Класс</th><th className="td-num">Параллель</th><th className="td-num">Учеников</th>
                  <th className="td-num">Академ.</th><th className="td-num">Олимп.</th><th className="td-num">Посещ.</th>
                  <th className="td-num">Активн.</th><th className="td-num">Риск</th>
                  <th className="td-num">Итог</th><th className="td-num">Динамика</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="td-strong">{c.name}</td>
                    <td className="td-num">{c.grade}</td>
                    <td className="td-num">{c.studentCount}</td>
                    <td className="td-num">{c.academicScore.toFixed(1)}</td>
                    <td className="td-num">{c.olympiadScore.toFixed(1)}</td>
                    <td className="td-num">{c.attendanceScore.toFixed(1)}</td>
                    <td className="td-num">{c.activityScore.toFixed(1)}</td>
                    <td className="td-num text-red">{c.riskScore}</td>
                    <td className={'td-num ' + scoreClass(c.finalScore)}>{c.finalScore.toFixed(1)}</td>
                    <td className="td-num"><TrendArrow trend={c.trend} delta={c.weeklyDelta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
