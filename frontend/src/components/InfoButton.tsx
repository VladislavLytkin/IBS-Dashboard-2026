import { IconInfo } from './icons'

/**
 * Кнопка «i» для заголовка блока KPI.
 * - на hover показывает короткий tooltip (1–2 строки) через data-tooltip;
 * - по клику вызывает onClick (открытие боковой панели);
 * - stopPropagation — чтобы клик по «i» не запускал переход по блоку.
 */
export function InfoButton({ tooltip, onClick, label }: {
  tooltip: string
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      className="kpi-info-btn"
      aria-label={label}
      data-tooltip={tooltip}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <IconInfo width={16} height={16} />
    </button>
  )
}
