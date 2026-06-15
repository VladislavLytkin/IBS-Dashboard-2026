import { useApi } from '../hooks/useApi'
import { loadSyntheticClasses } from '../data/syntheticDataset'
import { Card, EmptyState } from '../components/ui'
import { SyntheticClassTable } from '../components/SyntheticClassTable'

/**
 * Раздел «Динамика за неделю» (/dynamics).
 * Честный fallback: в синтетическом датасете нет недельной истории
 * (полей current_week_score / previous_week_score), поэтому недельную
 * динамику посчитать нельзя. Показываем пояснение и текущий срез классов.
 */
export function DynamicsPage() {
  const { data, loading, error } = useApi(() => loadSyntheticClasses(), [])
  const rows = data ?? []

  return (
    <div className="page">
      <Card title="Динамика за неделю">
        <div className="note note--blue" style={{ marginBottom: 12 }}>
          В текущем синтетическом датасете нет недельной истории
          (current_week_score / previous_week_score), поэтому недельная динамика
          недоступна. Когда появятся данные по неделям, показатель будет считаться
          как <strong>current_week_score − previous_week_score</strong>.
        </div>
        <p className="text-muted">Текущий срез классов для контекста:</p>
        {loading ? <EmptyState message="Загрузка…" />
          : error ? <EmptyState message={error} />
          : <SyntheticClassTable rows={rows} />}
      </Card>
    </div>
  )
}
