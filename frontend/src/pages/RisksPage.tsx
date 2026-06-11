import { useMemo, useState } from 'react'
import type { ParallelFilterValue, RiskLevel } from '../types'
import { risksService } from '../services'
import { useAuth } from '../auth/AuthContext'
import { useFilters } from '../context/FiltersContext'
import { useApi } from '../hooks/useApi'
import { IconRisk, IconSpark } from '../components/icons'
import { Card, EmptyState, LevelBar, PageFooter, ParallelFilter } from '../components/ui'

const RISK_BADGE: Record<RiskLevel, string> = {
  'высокий': 'badge badge--risk-high', 'средний': 'badge badge--risk-mid', 'низкий': 'badge badge--risk-low',
}

export function RisksPage() {
  const { user } = useAuth()
  const { year } = useFilters()
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const grade = parallel === 'all' ? 'all' : parallel
  const { data, loading, error } = useApi(() => risksService.list({ year, grade }), [year, grade])
  const predictions = data ?? []

  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Ученик видит строго свои риски (по studentId профиля), без фолбэка на первого в списке.
  const selected = user?.role === 'STUDENT'
    ? predictions.find((p) => p.studentId === user.studentId) ?? predictions[0]
    : predictions.find((p) => p.studentId === selectedId) ?? predictions[0]

  const summary = useMemo(() => ({
    total: predictions.length,
    high: predictions.filter((p) => p.riskLevel === 'высокий').length,
    medium: predictions.filter((p) => p.riskLevel === 'средний').length,
    low: predictions.filter((p) => p.riskLevel === 'низкий').length,
  }), [predictions])

  return (
    <div className="page">
      <div className="info-banner">
        <IconSpark width={18} height={18} />
        <strong>ML-прогноз является прототипом на синтетических данных.</strong>
        <span>Не является педагогическим заключением.</span>
      </div>

      <div className="toolbar"><ParallelFilter value={parallel} onChange={setParallel} /></div>

      <div className="grid grid-4">
        <MiniStat label="Учеников в анализе" value={String(summary.total)} color="blue" />
        <MiniStat label="Высокий риск" value={String(summary.high)} color="red" />
        <MiniStat label="Средний риск" value={String(summary.medium)} color="orange" />
        <MiniStat label="Низкий риск" value={String(summary.low)} color="green" />
      </div>

      {loading ? (
        <Card><EmptyState message="Загрузка…" /></Card>
      ) : error ? (
        <Card><EmptyState message={error} /></Card>
      ) : predictions.length === 0 ? (
        <Card><EmptyState message={user?.role === 'STUDENT' ? 'У этого ученика пока нет зафиксированных рисков' : 'Нет данных за выбранный период.'} /></Card>
      ) : (
        <div className="grid grid-2-wide">
          <Card title="ML-прогноз риска" headerRight={<span className="flex text-muted" style={{ fontSize: 13 }}><IconRisk width={16} height={16} /> по убыванию риска</span>}>
            <div className="table-wrap">
              <table className="tbl tbl--compact">
                <thead><tr><th>Ученик</th><th>Класс</th><th>Уровень</th><th style={{ minWidth: 140 }}>riskScore</th></tr></thead>
                <tbody>
                  {predictions.slice(0, 16).map((p) => (
                    <tr key={p.studentId} className={`row-select${selected?.studentId === p.studentId ? ' is-selected' : ''}`} onClick={() => setSelectedId(p.studentId)}>
                      <td className="td-strong">{p.fullName}</td>
                      <td>{p.classId.replace(/^\d+-/, '')}</td>
                      <td><span className={RISK_BADGE[p.riskLevel]}>{p.riskLevel}</span></td>
                      <td><LevelBar value={p.riskScore} suffix="" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {selected && (
            <Card title={`Детализация — ${selected.fullName}`}>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <span className="text-muted">Класс {selected.classId.replace(/^\d+-/, '')}</span>
                <span className={RISK_BADGE[selected.riskLevel]}>{selected.riskLevel} риск · {selected.riskScore}/100</span>
              </div>
              <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Факторы риска</h3>
              {selected.factors.map((f) => (
                <div className="factor-row" key={f.label}>
                  <span className="factor-row__label">{f.label}</span>
                  <div style={{ flex: 1 }}><LevelBar value={f.value} /></div>
                </div>
              ))}
              <h3 style={{ fontSize: 14, margin: '18px 0 10px' }}>Причины</h3>
              <ul className="reco-list">{selected.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              <h3 style={{ fontSize: 14, margin: '18px 0 10px' }}>Рекомендации</h3>
              <ul className="reco-list">{selected.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
            </Card>
          )}
        </div>
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
