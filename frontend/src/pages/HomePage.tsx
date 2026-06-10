import { useState } from 'react'
import type { ParallelFilterValue } from '../types'
import { dashboardService } from '../services'
import { useFilters } from '../context/FiltersContext'
import { useApi } from '../hooks/useApi'
import { IconInfo } from '../components/icons'
import { EmptyState, Medal, PageFooter, ParallelFilter, TrendArrow, scoreClass } from '../components/ui'

export function HomePage() {
  const { year } = useFilters()
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const grade = parallel === 'all' ? 'all' : parallel

  const summary = useApi(() => dashboardService.summary({ year, grade }), [year, grade])
  const rating = useApi(() => dashboardService.classRating({ year, grade }), [year, grade])
  const rows = rating.data ?? []
  const showGrade = parallel === 'all'
  const s = summary.data

  return (
    <div className="page">
      <div className="toolbar">
        <ParallelFilter value={parallel} onChange={setParallel} />
        <button className="btn btn--ghost-blue toolbar__spacer"><IconInfo /> Как рассчитывается рейтинг?</button>
      </div>

      <div className="grid grid-4">
        <MiniStat label="Классов" value={s ? String(s.classCount) : '—'} color="blue" />
        <MiniStat label="Учеников" value={s ? String(s.studentCount) : '—'} color="purple" />
        <MiniStat label="Средний итоговый балл" value={s ? s.avgFinalScore.toFixed(1) : '—'} color="green" />
        <MiniStat label="Высокий риск" value={s ? String(s.risk.high) : '—'} color="red" />
      </div>

      <section className="card">
        <div className="card--pad" style={{ paddingBottom: 0 }}>
          <h2 className="card__title">Рейтинг классов {showGrade ? '(вся школа)' : `(${parallel} параллель)`} · {year}</h2>
        </div>
        {rating.loading ? (
          <div className="card--pad"><EmptyState message="Загрузка…" /></div>
        ) : rating.error ? (
          <div className="card--pad"><EmptyState message={rating.error} /></div>
        ) : rows.length === 0 ? (
          <div className="card--pad"><EmptyState message="Нет данных за выбранный период." /></div>
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--center">
              <thead>
                <tr>
                  <th>Место</th><th>Класс</th>{showGrade && <th>Параллель</th>}
                  <th>Итоговый балл (из 100)</th><th>Динамика за неделю</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td><Medal place={i + 1} /></td>
                    <td className="td-strong">{row.name}</td>
                    {showGrade && <td>{row.grade} класс</td>}
                    <td className={scoreClass(row.finalScore)}>{row.finalScore.toFixed(1)}</td>
                    <td><TrendArrow trend={row.trend} delta={row.weeklyDelta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PageFooter />
    </div>
  )
}

function MiniStat({ label, value, color }: {
  label: string; value: string; color: 'blue' | 'green' | 'orange' | 'red' | 'purple'
}) {
  return (
    <div className="card card--pad">
      <div className="stat-box__label">{label}</div>
      <div className={`stat-box__value stat-box__value--${color}`} style={{ marginTop: 8 }}>{value}</div>
    </div>
  )
}
