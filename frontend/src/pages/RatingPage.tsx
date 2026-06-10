import { useState } from 'react'
import { GRADES, getClassRatings } from '../data/classes'
import { IconInfo } from '../components/icons'
import { Medal, PageFooter, TrendArrow, scoreClass } from '../components/ui'

export function RatingPage() {
  const [grade, setGrade] = useState(7)
  const rows = getClassRatings(grade)

  return (
    <div className="page">
      <div className="toolbar">
        <div className="field">
          <span className="field__label">Выберите параллель:</span>
          <select className="select" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g} класс</option>
            ))}
          </select>
        </div>
        <button className="btn btn--ghost-blue toolbar__spacer">
          <IconInfo /> Как рассчитывается рейтинг?
        </button>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table className="tbl tbl--center">
            <thead>
              <tr>
                <th>Место</th>
                <th>Класс</th>
                <th>Итоговый балл (из 100)</th>
                <th>Динамика за неделю</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.className}>
                  <td><Medal place={row.place} /></td>
                  <td className="td-strong">{row.className}</td>
                  <td className={scoreClass(row.score)}>{row.score.toFixed(1)}</td>
                  <td><TrendArrow trend={row.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <PageFooter />
    </div>
  )
}
