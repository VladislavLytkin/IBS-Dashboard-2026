import { useApi } from '../hooks/useApi'
import { loadSyntheticClasses } from '../data/syntheticDataset'
import { needsReview } from '../data/dashboardKpis'
import { Card, EmptyState } from '../components/ui'
import { SyntheticClassTable } from '../components/SyntheticClassTable'

/**
 * Раздел «Заявки на проверку» (/review-requests).
 * Готового флага в датасете нет, поэтому показываем классы, которые система
 * предлагает проверить вручную: высокий риск (risk_score ≥ 75) или
 * аномально низкая посещаемость (< 90%).
 */
export function ReviewRequestsPage() {
  const { data, loading, error } = useApi(() => loadSyntheticClasses(), [])
  const rows = (data ?? []).filter(needsReview)

  return (
    <div className="page">
      <Card title="Заявки на проверку">
        <p className="text-muted" style={{ marginTop: -8 }}>
          Случаи, которые система предлагает проверить вручную: резкие ухудшения,
          спорные данные или нестабильная динамика. Признак рассчитан как
          высокий риск (risk_score ≥ 75) ИЛИ посещаемость &lt; 90%.
        </p>
        {loading ? <EmptyState message="Загрузка…" />
          : error ? <EmptyState message={error} />
          : <SyntheticClassTable rows={rows} />}
      </Card>
    </div>
  )
}
