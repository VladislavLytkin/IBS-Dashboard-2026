import type { SyntheticClassRow } from '../data/syntheticDataset'
import { EmptyState } from './ui'

const RISK_BADGE: Record<string, string> = {
  'высокий': 'badge badge--risk-high',
  'средний': 'badge badge--risk-mid',
  'низкий': 'badge badge--risk-low',
}

/**
 * Компактная таблица классов из синтетического датасета.
 * Используется на страницах-разделах KPI (риски, проверка, индекс, динамика).
 */
export function SyntheticClassTable({ rows }: { rows: SyntheticClassRow[] }) {
  if (!rows.length) return <EmptyState message="Нет классов, удовлетворяющих условию." />
  return (
    <div className="table-wrap">
      <table className="tbl tbl--compact">
        <thead>
          <tr>
            <th>Класс</th>
            <th>Учеников</th>
            <th>Индекс</th>
            <th>Посещаемость</th>
            <th>Риск</th>
            <th>risk_score</th>
            <th>Причина</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.className}>
              <td className="td-strong">{r.className}</td>
              <td>{r.studentsCount}</td>
              <td>{r.ratingScore100.toFixed(1)}</td>
              <td>{r.attendancePct.toFixed(1)}%</td>
              <td><span className={RISK_BADGE[r.riskLevel] ?? 'badge'}>{r.riskLevel}</span></td>
              <td>{r.riskScore100.toFixed(1)}</td>
              <td className="text-muted">{r.riskReason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
