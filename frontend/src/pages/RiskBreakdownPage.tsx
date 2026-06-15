import { useSearchParams } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { loadSyntheticClasses } from '../data/syntheticDataset'
import { isHighRisk, isMediumRisk } from '../data/dashboardKpis'
import { Card, EmptyState } from '../components/ui'
import { SyntheticClassTable } from '../components/SyntheticClassTable'

/**
 * Раздел «Риски» с фильтром по уровню из URL: /risk?level=high | medium.
 * high   → классы в критической зоне (risk_score >= 75)
 * medium → классы в зоне внимания (50 <= risk_score < 75)
 */
export function RiskBreakdownPage() {
  const [params] = useSearchParams()
  const level = params.get('level') // 'high' | 'medium' | null
  const { data, loading, error } = useApi(() => loadSyntheticClasses(), [])
  const all = data ?? []

  const rows =
    level === 'high' ? all.filter(isHighRisk)
    : level === 'medium' ? all.filter(isMediumRisk)
    : all.filter((r) => isHighRisk(r) || isMediumRisk(r))

  const title =
    level === 'high' ? 'Классы высокого риска'
    : level === 'medium' ? 'Классы среднего риска'
    : 'Классы с риском'

  const description =
    level === 'high' ? 'Критическая зона: интегральный индекс риска risk_score ≥ 75. Требуют первичной проверки.'
    : level === 'medium' ? 'Зона внимания: 50 ≤ risk_score < 75. Есть признаки отрицательной динамики.'
    : 'Все классы с риском среднего и высокого уровня.'

  return (
    <div className="page">
      <Card title={title}>
        <p className="text-muted" style={{ marginTop: -8 }}>{description}</p>
        {level && (
          <div className="note note--blue" style={{ margin: '12px 0' }}>
            Применён фильтр из ссылки: <strong>level={level}</strong>
          </div>
        )}
        {loading ? <EmptyState message="Загрузка…" />
          : error ? <EmptyState message={error} />
          : <SyntheticClassTable rows={rows} />}
      </Card>
    </div>
  )
}
