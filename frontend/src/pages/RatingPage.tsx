import { useState } from 'react'
import type { ParallelFilterValue } from '../types'
import { getClasses } from '../data/classes'
import { IconInfo } from '../components/icons'
import {
  EmptyState, Medal, PageFooter, ParallelFilter, TrendArrow, scoreClass,
} from '../components/ui'

export function RatingPage() {
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const rows = getClasses(parallel)
  const showGrade = parallel === 'all'

  return (
    <div className="page">
      <div className="toolbar">
        <ParallelFilter value={parallel} onChange={setParallel} />
        <button className="btn btn--ghost-blue toolbar__spacer">
          <IconInfo /> Как рассчитывается рейтинг?
        </button>
      </div>

      <section className="card">
        {rows.length === 0 ? (
          <EmptyState message="Для выбранной параллели нет данных." />
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--center">
              <thead>
                <tr>
                  <th>Место</th>
                  <th>Класс</th>
                  {showGrade && <th>Параллель</th>}
                  <th>Итоговый балл (из 100)</th>
                  <th>Динамика за неделю</th>
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
