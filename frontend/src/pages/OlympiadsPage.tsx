import { useState } from 'react'
import type { OlympiadLevel } from '../types'
import { OLYMPIADS, OLYMPIADS_TOTAL, OLYMPIAD_LEVELS } from '../data/olympiads'
import { ALL_CLASSES } from '../data/classes'
import { IconDownload, IconReset } from '../components/icons'
import { Pagination, PageFooter } from '../components/ui'

const LEVEL_BADGE: Record<OlympiadLevel, string> = {
  'Всероссийская': 'badge badge--vseros',
  'Городская': 'badge badge--gorod',
  'Школьная': 'badge badge--school',
}
const AWARD_CLASS = { gold: 'award-gold', silver: 'award-silver', bronze: 'award-bronze' } as const

export function OlympiadsPage() {
  const [klass, setKlass] = useState('Все классы')
  const [level, setLevel] = useState('Все уровни')

  const rows = OLYMPIADS.filter(
    (o) =>
      (klass === 'Все классы' || o.className === klass) &&
      (level === 'Все уровни' || o.level === level),
  )

  const reset = () => { setKlass('Все классы'); setLevel('Все уровни') }

  return (
    <div className="page">
      <div className="toolbar">
        <span className="field__label">Фильтры:</span>
        <div className="field">
          <span className="field__label">Класс:</span>
          <select className="select" value={klass} onChange={(e) => setKlass(e.target.value)}>
            <option>Все классы</option>
            {ALL_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field__label">Уровень олимпиады:</span>
          <select className="select" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option>Все уровни</option>
            {OLYMPIAD_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button className="btn toolbar__spacer" onClick={reset}><IconReset /> Сбросить фильтры</button>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>№</th>
                <th>Ученик</th>
                <th>Класс</th>
                <th>Уровень олимпиады</th>
                <th>Название олимпиады</th>
                <th>Предмет</th>
                <th>Место / Диплом</th>
                <th>Дата проведения</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="text-muted">{o.id}</td>
                  <td className="td-strong">{o.student}</td>
                  <td>{o.className}</td>
                  <td><span className={LEVEL_BADGE[o.level]}>{o.level}</span></td>
                  <td>{o.title}</td>
                  <td>{o.subject}</td>
                  <td className={AWARD_CLASS[o.awardKind]}>{o.award}</td>
                  <td className="text-muted">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-between" style={{ marginTop: 18 }}>
          <span className="text-muted">Показано 1–{rows.length} из {OLYMPIADS_TOTAL} записей</span>
          <Pagination total={OLYMPIADS_TOTAL} />
        </div>
      </section>

      <div className="flex-between">
        <span />
        <button className="btn btn--ghost-blue"><IconDownload /> Скачать в Excel</button>
      </div>

      <PageFooter />
    </div>
  )
}
