import { useMemo, useState } from 'react'
import type { ParallelFilterValue } from '../types'
import { olympiadsService } from '../services'
import { useFilters } from '../context/FiltersContext'
import { useApi } from '../hooks/useApi'
import { IconInfo } from '../components/icons'
import { Card, ComparisonTable, EmptyState, Medal, PageFooter, ParallelFilter, scoreClass } from '../components/ui'

export function OlympiadsPage() {
  const { year } = useFilters()
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const grade = parallel === 'all' ? 'all' : parallel

  const comparison = useApi(() => olympiadsService.comparison({ year, grade }), [year, grade])
  const rating = useApi(() => olympiadsService.rating({ year, grade }), [year, grade])
  const rows = comparison.data?.rows ?? []
  const ranking = rating.data ?? []

  const avgIndex = useMemo(
    () => (ranking.length ? Math.round((ranking.reduce((s, r) => s + r.index, 0) / ranking.length) * 10) / 10 : 0),
    [ranking],
  )

  return (
    <div className="page">
      <div className="toolbar"><ParallelFilter value={parallel} onChange={setParallel} /></div>

      <div className="grid grid-4">
        <MiniStat label="Классов в рейтинге" value={String(ranking.length)} color="blue" />
        <MiniStat label="Средний олимп. индекс" value={`${avgIndex}%`} color="purple" />
        <MiniStat label="Лучший класс" value={ranking[0]?.classId ?? '—'} color="green" />
        <MiniStat label="Направлений" value={String(rows.length)} color="orange" />
      </div>

      <div className="grid grid-2-wide">
        <Card title={`Сравнение с городом и регионом · ${year}`}>
          {comparison.loading ? <EmptyState message="Загрузка…" /> : comparison.error ? <EmptyState message={comparison.error} /> : (
            <>
              <ComparisonTable subjectHeader="Предмет / направление" rows={rows} />
              <div className="note" style={{ marginTop: 14 }}>
                <IconInfo width={16} height={16} />
                Олимпиадный индекс — сводный показатель по направлению. Синтетические данные для прототипа.
              </div>
            </>
          )}
        </Card>

        <Card title="Рейтинг классов по олимпиадному индексу">
          {rating.loading ? <EmptyState message="Загрузка…" /> : rating.error ? <EmptyState message={rating.error} /> : ranking.length === 0 ? (
            <EmptyState message="Нет данных за выбранный период." />
          ) : (
            <div className="table-wrap">
              <table className="tbl tbl--compact">
                <thead>
                  <tr><th className="td-num">Место</th><th>Класс</th><th className="td-num">Участие</th><th className="td-num">Призёры</th><th className="td-num">Индекс</th></tr>
                </thead>
                <tbody>
                  {ranking.slice(0, 16).map((r, i) => (
                    <tr key={r.classId + i}>
                      <td className="td-num"><Medal place={i + 1} /></td>
                      <td className="td-strong">{r.classId}</td>
                      <td className="td-num text-muted">{r.participationPct}%</td>
                      <td className="td-num text-muted">{r.awardPct}%</td>
                      <td className={'td-num ' + scoreClass(r.index)}>{r.index}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <PageFooter />
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: 'blue' | 'green' | 'orange' | 'red' | 'purple' }) {
  return (
    <div className="card card--pad">
      <div className="stat-box__label">{label}</div>
      <div className={`stat-box__value stat-box__value--${color}`} style={{ marginTop: 8 }}>{value}</div>
    </div>
  )
}
