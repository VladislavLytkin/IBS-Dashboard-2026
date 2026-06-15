import { useEffect } from 'react'
import type { KpiCardConfig } from '../data/dashboardKpis'

/**
 * Боковая панель (drawer) с полной информацией о выбранном KPI.
 * - desktop: панель справа шириной ~400px;
 * - mobile: разворачивается на всю ширину (см. CSS);
 * - закрытие: крестик, клик по затемнению, клавиша Esc.
 */
export function KpiInfoPanel({ card, onClose }: { card: KpiCardConfig; onClose: () => void }) {
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
        aria-label={`Информация о показателе «${card.title}»`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="kpi-info-panel__head">
          <h2 className="kpi-info-panel__title">{card.title}</h2>
          <button className="kpi-info-panel__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        <div className={`kpi-info-panel__value stat-box__value--${card.color}`}>{card.value}</div>

        <dl className="kpi-info-panel__list">
          <dt>Что означает показатель</dt>
          <dd>{card.fullDescription}</dd>

          <dt>Правило расчёта</dt>
          <dd><code className="kpi-info-panel__formula">{card.formula}</code></dd>

          <dt>Откуда берутся данные</dt>
          <dd>{card.dataSource}</dd>

          <dt>Переход по карточке</dt>
          <dd><code className="kpi-info-panel__formula">{card.href}</code></dd>
        </dl>
      </aside>
    </div>
  )
}
