import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis,
} from 'recharts'
import type { ParallelFilterValue } from '../types'
import { examsService } from '../services'
import { useFilters } from '../context/FiltersContext'
import { useApi } from '../hooks/useApi'
import { IconInfo } from '../components/icons'
import { Card, ComparisonTable, EmptyState, PageFooter, ParallelFilter } from '../components/ui'

export function ExamsPage() {
  const { year } = useFilters()
  const [parallel, setParallel] = useState<ParallelFilterValue>(11)
  const [scope, setScope] = useState<'key' | 'all'>('key')
  const grade = parallel === 'all' ? 11 : parallel

  const { data, loading, error } = useApi(() => examsService.comparison({ year, grade }), [year, grade])
  const rows = data?.rows ?? []
  const shown = scope === 'key' ? rows.slice(0, 6) : rows

  const avg = useMemo(() => {
    if (!rows.length) return null
    const a = (k: 'school' | 'city' | 'region') => Math.round(rows.reduce((s, r) => s + r[k], 0) / rows.length)
    return { school: a('school'), city: a('city'), region: a('region') }
  }, [rows])

  return (
    <div className="page">
      <div className="toolbar">
        <ParallelFilter value={parallel} onChange={setParallel} includeAll={false} />
        {data && <span className="badge badge--gorod" style={{ marginLeft: 8 }}>{data.examType}</span>}
      </div>

      {loading ? (
        <Card><EmptyState message="Загрузка…" /></Card>
      ) : error ? (
        <Card><EmptyState message={error} /></Card>
      ) : (
        <>
          <div className="grid grid-4">
            <MiniStat label="Средний балл школы" value={avg ? `${avg.school}%` : '—'} color="blue" />
            <MiniStat label="Средний по городу" value={avg ? `${avg.city}%` : '—'} color="green" />
            <MiniStat label="Средний по региону" value={avg ? `${avg.region}%` : '—'} color="orange" />
            <MiniStat label="Предметов" value={String(rows.length)} color="purple" />
          </div>

          <Card title={`Результаты по предметам (${data?.examType}) · ${year}`}
            headerRight={
              <div className="segment">
                <button className={scope === 'key' ? 'is-active' : ''} onClick={() => setScope('key')}>Ключевые</button>
                <button className={scope === 'all' ? 'is-active' : ''} onClick={() => setScope('all')}>Все</button>
              </div>
            }>
            <ComparisonTable subjectHeader="Предмет" rows={shown} />
            <div className="note" style={{ marginTop: 14 }}>
              <IconInfo width={16} height={16} />
              Данные представлены в % от максимального первичного или тестового балла. Используются синтетические данные для прототипа.
            </div>
          </Card>

          {rows.length > 0 && (
            <Card title="Сравнение «Школа / Город / Регион» по предметам">
              <div className="chart-box" style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shown} margin={{ top: 24, right: 10, left: -16, bottom: 60 }} barGap={3}>
                    <CartesianGrid vertical={false} stroke="#eef1f5" />
                    <XAxis dataKey="subject" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} height={70} />
                    <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickLine={false} axisLine={false} />
                    <Bar dataKey="school" fill="var(--blue)" radius={[4, 4, 0, 0]} maxBarSize={26}>
                      <LabelList dataKey="school" position="top" fontSize={10} />
                    </Bar>
                    <Bar dataKey="city" fill="var(--green)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                    <Bar dataKey="region" fill="var(--orange)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="legend-row" style={{ marginTop: 8 }}>
                <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--blue)' }} /> Школа №123</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--green)' }} /> Город</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--orange)' }} /> Регион</span>
                <span className="legend-item text-muted" style={{ marginLeft: 'auto' }}>
                  уровень: <span className="text-green">высокий</span> / <span style={{ color: 'var(--orange)' }}>средний</span> / <span className="text-red">низкий</span>
                </span>
              </div>
            </Card>
          )}
        </>
      )}

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
