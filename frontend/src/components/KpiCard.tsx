import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { KpiCardConfig } from '../data/dashboardKpis'
import { IconInfo } from './icons'

/**
 * Кликабельная KPI-карточка главного экрана.
 * - вся карточка ведёт на href (мышь + клавиатура Enter/Space);
 * - кнопка «i» в правом верхнем углу: на hover показывает короткий tooltip
 *   (1–2 строки), по клику открывает боковую панель с полной информацией;
 * - клик/Enter по «i» не вызывает переход (stopPropagation);
 * - карточка фиксированной высоты — описание не рендерится внутри, поэтому
 *   сетка не «прыгает».
 */
export function KpiCard({
  card,
  onInfoClick,
}: {
  card: KpiCardConfig
  onInfoClick: (event: MouseEvent, card: KpiCardConfig) => void
}) {
  const navigate = useNavigate()
  const go = () => navigate(card.href)

  return (
    <div
      className="kpi-card"
      role="button"
      tabIndex={0}
      aria-label={`${card.title}: ${card.value}. ${card.shortDescription}. Открыть раздел.`}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          go()
        }
      }}
    >
      {/* Кнопка info: короткий tooltip на hover + детальная панель по клику.
          stopPropagation — чтобы не сработал переход по карточке. */}
      <button
        type="button"
        className="kpi-info-btn"
        aria-label={`Подробнее о показателе «${card.title}»`}
        data-tooltip={card.shortDescription}
        onClick={(e) => {
          e.stopPropagation()
          onInfoClick(e, card)
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <IconInfo width={16} height={16} />
      </button>

      <span className="kpi-card__label">{card.title}</span>
      <div className={`stat-box__value stat-box__value--${card.color}`} style={{ marginTop: 8 }}>
        {card.value}
      </div>
      <span className="kpi-card__short">{card.shortDescription}</span>
    </div>
  )
}
