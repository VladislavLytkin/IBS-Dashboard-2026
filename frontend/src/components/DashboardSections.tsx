import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DashboardKpis, KpiColor, KpiLegend } from '../data/dashboardKpis'
import type { RequestKpis } from '../data/syntheticRequests'
import { InfoButton } from './InfoButton'

// ============================================================
// Вспомогательные элементы
// ============================================================

/** Подпись динамики: «+0.3 за неделю» / «−6 за месяц» / «нет данных…». */
function DeltaText({ value, digits = 0, unit = '', period, positiveIsGood = true }: {
  value: number | null
  digits?: number
  unit?: string
  period: string
  positiveIsGood?: boolean
}) {
  if (value === null) return <span className="delta delta--none">нет данных для сравнения</span>
  const rounded = Number(value.toFixed(digits))
  const sign = rounded > 0 ? '+' : ''
  // зелёный/красный зависят от того, «хорошо» ли движение вверх для показателя
  const tone = rounded === 0 ? 'flat' : (positiveIsGood ? rounded > 0 : rounded < 0) ? 'good' : 'bad'
  return (
    <span className={`delta delta--${tone}`}>
      {sign}{rounded}{unit} {period}
    </span>
  )
}

/** Мини-график (sparkline) из нескольких точек. */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const w = 120, h = 34, pad = 3
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = (w - 2 * pad) / (points.length - 1)
  const coords = points
    .map((p, i) => {
      const x = pad + i * step
      const y = pad + (h - 2 * pad) * (1 - (p - min) / range)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Динамика индекса">
      <polyline points={coords} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** Заголовок секции с кнопкой info. */
function SectionHead({ title, tooltip, onInfo }: { title: string; tooltip: string; onInfo: () => void }) {
  return (
    <div className="section-head">
      <h2 className="section-head__title">{title}</h2>
      <InfoButton tooltip={tooltip} onClick={onInfo} label={`Подробнее: ${title}`} />
    </div>
  )
}

/** Кликабельная строка-метрика внутри блока (риски, охват данных). */
function MetricRow({ label, value, color, href, children }: {
  label: string
  value: string
  color: KpiColor
  href: string
  children?: ReactNode
}) {
  const navigate = useNavigate()
  const go = () => navigate(href)
  return (
    <div
      className="metric-row"
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${value}. Открыть раздел.`}
      onClick={go}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } }}
    >
      <span className="metric-row__label">{label}</span>
      <span className={`metric-row__value stat-box__value--${color}`}>{value}</span>
      <span className="metric-row__delta">{children}</span>
    </div>
  )
}

// ============================================================
// Четыре смысловых блока главного экрана
// ============================================================

export function DashboardSections({ kpis, requests, legends, onShowLegend }: {
  kpis: DashboardKpis
  requests: RequestKpis
  legends: Record<string, KpiLegend>
  onShowLegend: (legend: KpiLegend) => void
}) {
  const navigate = useNavigate()

  return (
    <div className="dash-sections">
      {/* ---- Блок 1. Общее состояние школы ---- */}
      <section
        className="dash-block dash-block--clickable dash-block--span2 dash-block--school"
        role="button"
        tabIndex={0}
        aria-label={`Индекс школы ${kpis.schoolIndex.toFixed(1)}. Открыть разбор.`}
        onClick={() => navigate('/index-breakdown')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/index-breakdown') } }}
      >
        <SectionHead title="Общее состояние школы" tooltip="Средний интегральный индекс школы" onInfo={() => onShowLegend(legends['school-state'])} />
        <div className="school-state">
          <div>
            <div className="stat-box__label">Индекс школы</div>
            <div className="stat-box__value stat-box__value--green school-state__value">{kpis.schoolIndex.toFixed(1)}</div>
            <DeltaText value={kpis.schoolIndexWeeklyDelta} digits={1} period="за неделю" />
            <p className="dash-block__hint">Средний интегральный индекс школы</p>
          </div>
          <div className="school-state__chart" style={{ color: 'var(--green)' }}>
            <Sparkline points={kpis.schoolIndexTrend} />
          </div>
        </div>
      </section>

      {/* ---- Блок 2. Риски (только ученики, без заявок) ---- */}
      <section className="dash-block dash-block--risks">
        <SectionHead title="Риски" tooltip="Ученики, требующие внимания: высокий и средний риск" onInfo={() => onShowLegend(legends['risks'])} />
        <p className="dash-block__hint dash-block__hint--top">
          Показатели рассчитываются на основе интегрального risk_score учеников. Заявки сюда не входят.
        </p>
        <div className="metric-list">
          <MetricRow label="Ученики высокого риска" value={String(kpis.highRiskCount)} color="red" href="/risk?level=high">
            <DeltaText value={kpis.highRiskMonthlyDelta} period="за месяц" positiveIsGood={false} />
          </MetricRow>
          <MetricRow label="Ученики среднего риска" value={String(kpis.mediumRiskCount)} color="orange" href="/risk?level=medium" />
        </div>
      </section>

      {/* ---- Блок 3. Заявки (административные, не риски) ---- */}
      <section className="dash-block dash-block--requests">
        <SectionHead title="Заявки" tooltip="Заявки по олимпиадам и СПД-проектам" onInfo={() => onShowLegend(legends['requests'])} />
        <MetricRow label="Заявок на проверку" value={String(requests.reviewRequestsCount)} color="purple" href="/requests">
          <DeltaText value={requests.reviewRequestsWeeklyDelta} period="за неделю" positiveIsGood={false} />
        </MetricRow>
        <p className="dash-block__hint">Олимпиады, СПД-проекты и заявки на участие</p>
        <div className="metric-list" style={{ marginTop: 12 }}>
          <MetricRow label="Результаты олимпиад" value={String(requests.olympiadRequestsCount)} color="blue" href="/requests?type=olympiad_result" />
          <MetricRow label="Новые СПД-проекты" value={String(requests.spdProjectRegistrationRequestsCount)} color="green" href="/requests?type=spd_project_registration" />
          <MetricRow label="Участие в СПД-проектах" value={String(requests.spdProjectParticipationRequestsCount)} color="orange" href="/requests?type=spd_project_participation" />
        </div>
      </section>

      {/* ---- Блок 4. Посещаемость ---- */}
      <section
        className="dash-block dash-block--clickable dash-block--attendance"
        role="button"
        tabIndex={0}
        aria-label={`Посещаемость ${kpis.attendanceRate.toFixed(1)} процентов. Открыть раздел.`}
        onClick={() => navigate('/attendance')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/attendance') } }}
      >
        <SectionHead title="Посещаемость" tooltip="Средний процент посещаемости за период" onInfo={() => onShowLegend(legends['attendance'])} />
        <div className="stat-box__value stat-box__value--blue school-state__value">{kpis.attendanceRate.toFixed(1)}%</div>
        <DeltaText value={kpis.attendanceWeeklyDelta} digits={1} unit=" п.п." period="за неделю" />
        <p className="dash-block__hint">Средняя посещаемость за выбранный период</p>
      </section>

      {/* ---- Блок 5. Численность учеников школы ---- */}
      <section className="dash-block dash-block--students">
        <SectionHead title="Численность учеников школы" tooltip="Сколько учеников и классов участвуют в расчёте" onInfo={() => onShowLegend(legends['coverage'])} />
        <div className="metric-list">
          <MetricRow label="Учеников в расчёте" value={String(kpis.studentsCount)} color="purple" href="/students">
            <DeltaText value={kpis.studentsYearlyDelta} period="за год" />
          </MetricRow>
          <MetricRow label="Классов в расчёте" value={String(kpis.classesCount)} color="blue" href="/classes" />
        </div>
      </section>
    </div>
  )
}
