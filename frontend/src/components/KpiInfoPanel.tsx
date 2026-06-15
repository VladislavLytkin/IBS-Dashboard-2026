import { useEffect } from 'react'
import type { KpiLegend } from '../data/dashboardKpis'

/**
 * Боковая панель (drawer) с полной расшифровкой выбранного блока KPI.
 * - desktop: панель справа шириной ~400px;
 * - mobile: разворачивается снизу на всю ширину (см. CSS);
 * - закрытие: крестик, клик по затемнению, клавиша Esc.
 */
export function KpiInfoPanel({ legend, onClose }: { legend: KpiLegend; onClose: () => void }) {
  // Закрытие по Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="kpi-panel-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="kpi-info-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Информация: ${legend.title}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="kpi-info-panel__head">
          <h2 className="kpi-info-panel__title">{legend.title}</h2>
          <button className="kpi-info-panel__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        <div className={`kpi-info-panel__value stat-box__value--${legend.color}`}>{legend.valueSummary}</div>

        <dl className="kpi-info-panel__list">
          <dt>Что означает показатель</dt>
          <dd>{legend.fullDescription}</dd>

          <dt>Правило расчёта</dt>
          <dd><code className="kpi-info-panel__formula">{legend.formula}</code></dd>

          {legend.dynamicsNote && (
            <>
              <dt>Динамика</dt>
              <dd>{legend.dynamicsNote}</dd>
            </>
          )}

          <dt>Откуда берутся данные</dt>
          <dd>{legend.dataSource}</dd>

          <dt>Переход по блоку</dt>
          <dd><code className="kpi-info-panel__formula">{legend.href}</code></dd>
        </dl>
      </aside>
    </div>
  )
}
