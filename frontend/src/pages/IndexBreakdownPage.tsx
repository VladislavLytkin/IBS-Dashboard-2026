import { useApi } from '../hooks/useApi'
import { loadSyntheticClasses } from '../data/syntheticDataset'
import { aggregateSnapshot } from '../data/dashboardKpis'
import { Card, EmptyState } from '../components/ui'
import { SyntheticClassTable } from '../components/SyntheticClassTable'

/**
 * Раздел «Индекс школы» (/index-breakdown).
 * Показывает, из чего складывается средний индекс: список классов,
 * отсортированный по интегральному индексу rating_score_100 (по убыванию).
 */
export function IndexBreakdownPage() {
  const { data, loading, error } = useApi(() => loadSyntheticClasses(), [])
  const all = data ?? []
  const rows = [...all].sort((a, b) => b.ratingScore100 - a.ratingScore100)
  const kpis = aggregateSnapshot(all)

  return (
    <div className="page">
      <Card title="Индекс школы — разбор по классам">
        <p className="text-muted" style={{ marginTop: -8 }}>
          Средневзвешенный индекс школы:{' '}
          <strong>{kpis.schoolIndex.toFixed(1)}</strong> (среднее rating_score_100
          по числу учеников). Ниже — классы по убыванию индекса.
        </p>
        {loading ? <EmptyState message="Загрузка…" />
          : error ? <EmptyState message={error} />
          : <SyntheticClassTable rows={rows} />}
      </Card>
    </div>
  )
}
