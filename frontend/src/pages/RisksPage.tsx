import { useMemo, useState } from 'react'
import type { ParallelFilterValue, RiskLevel } from '../types'
import { getRiskPredictions, getRiskSummary } from '../data/riskPredictions'
import { RISK_WEIGHTS } from '../utils/riskModel'
import { IconInfo, IconRisk, IconSpark } from '../components/icons'
import { Card, EmptyState, LevelBar, PageFooter, ParallelFilter } from '../components/ui'

const RISK_BADGE: Record<RiskLevel, string> = {
  'высокий': 'badge badge--risk-high',
  'средний': 'badge badge--risk-mid',
  'низкий': 'badge badge--risk-low',
}

export function RisksPage() {
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const predictions = useMemo(() => getRiskPredictions(parallel), [parallel])
  const summary = useMemo(() => getRiskSummary(parallel), [parallel])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = predictions.find((p) => p.studentId === selectedId) ?? predictions[0]

  return (
    <div className="page">
      <div className="info-banner">
        <IconSpark width={18} height={18} />
        <strong>ML-модель: прототип на синтетических данных.</strong>
        <span>Не является реальным педагогическим заключением.</span>
      </div>

      <div className="toolbar">
        <ParallelFilter value={parallel} onChange={setParallel} />
      </div>

      <div className="grid grid-4">
        <MiniStat label="Учеников в анализе" value={String(summary.total)} color="blue" />
        <MiniStat label="Высокий риск" value={String(summary.high)} color="red" />
        <MiniStat label="Средний риск" value={String(summary.medium)} color="orange" />
        <MiniStat label="Низкий риск" value={String(summary.low)} color="green" />
      </div>

      {predictions.length === 0 ? (
        <Card><EmptyState message="Для выбранной параллели нет данных." /></Card>
      ) : (
        <div className="grid grid-2-wide">
          <Card
            title="ML-прогноз риска"
            headerRight={<span className="flex text-muted" style={{ fontSize: 13 }}><IconRisk width={16} height={16} /> отсортировано по риску</span>}
          >
            <div className="table-wrap">
              <table className="tbl tbl--compact">
                <thead>
                  <tr><th>Ученик</th><th>Класс</th><th>Уровень</th><th style={{ minWidth: 140 }}>riskScore</th></tr>
                </thead>
                <tbody>
                  {predictions.slice(0, 14).map((p) => (
                    <tr
                      key={p.studentId}
                      className={`row-select${selected?.studentId === p.studentId ? ' is-selected' : ''}`}
                      onClick={() => setSelectedId(p.studentId)}
                    >
                      <td className="td-strong">{p.fullName}</td>
                      <td>{p.classId}</td>
                      <td><span className={RISK_BADGE[p.riskLevel]}>{p.riskLevel}</span></td>
                      <td><LevelBar value={p.riskScore} suffix="" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {selected && (
            <Card title={`Детализация прогноза — ${selected.fullName}`}>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <span className="text-muted">Класс {selected.classId}</span>
                <span className={RISK_BADGE[selected.riskLevel]}>
                  {selected.riskLevel} риск · {selected.riskScore}/100
                </span>
              </div>

              <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Факторы риска (вклад в модель)</h3>
              {selected.factors.map((f) => (
                <div className="factor-row" key={f.label}>
                  <span className="factor-row__label">{f.label}</span>
                  <div style={{ flex: 1 }}><LevelBar value={f.value} /></div>
                </div>
              ))}

              <h3 style={{ fontSize: 14, margin: '18px 0 10px' }}>Основные причины</h3>
              <ul className="reco-list">
                {selected.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>

              <h3 style={{ fontSize: 14, margin: '18px 0 10px' }}>Рекомендации, что проверить</h3>
              <ul className="reco-list">
                {selected.recommendations.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </Card>
          )}
        </div>
      )}

      <div className="note note--blue">
        <IconInfo width={16} height={16} />
        Веса модели риска: снижение оценок {Math.round(RISK_WEIGHTS.gradeDrop * 100)}%, пропуски {Math.round(RISK_WEIGHTS.absence * 100)}%,
        низкая активность {Math.round(RISK_WEIGHTS.lowActivity * 100)}%, отсутствие олимпиад {Math.round(RISK_WEIGHTS.noOlympiad * 100)}%,
        отрицательная динамика {Math.round(RISK_WEIGHTS.negativeTrend * 100)}%. Расчёт — в <code>src/utils/riskModel.ts</code>.
      </div>

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
