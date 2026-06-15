import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ParallelFilterValue } from '../types'
import { dashboardService, olympiadsService, risksService } from '../services'
import { useAuth } from '../auth/AuthContext'
import { useFilters } from '../context/FiltersContext'
import { useApi } from '../hooks/useApi'
import { IconInfo } from '../components/icons'
import { Card, EmptyState, ParallelFilter, TrendArrow, scoreClass } from '../components/ui'
import { KpiInfoPanel } from '../components/KpiInfoPanel'
import { DashboardSections } from '../components/DashboardSections'
import { loadDashboardTimeseries } from '../data/syntheticTimeseries'
import { buildSectionLegends, calculateDashboardKpis, type KpiLegend } from '../data/dashboardKpis'
import { loadSyntheticRequests, calculateRequestKpis } from '../data/syntheticRequests'

export function HomePage() {
  const { user } = useAuth()
  const { year } = useFilters()
  const [parallel, setParallel] = useState<ParallelFilterValue>('all')
  const [showFormula, setShowFormula] = useState(false)
  // Выбранный блок для детальной боковой панели (null — панель закрыта).
  const [selectedLegend, setSelectedLegend] = useState<KpiLegend | null>(null)
  const grade = parallel === 'all' ? 'all' : parallel

  const rating = useApi(() => dashboardService.classRating({ year, grade }), [year, grade])
  const applications = useApi(() => olympiadsService.applications(), [])
  const ownRisk = useApi(() => risksService.list({ year }), [year])
  const rows = rating.data ?? []

  // KPI считаются из синтетического датасета с временной динамикой
  // (см. syntheticTimeseries.ts), а не из захардкоженных значений.
  const synthetic = useApi(() => loadDashboardTimeseries(), [])
  // Фильтр по параллели применяется к каждому временному срезу.
  const ts = synthetic.data
  const filteredTs = ts && {
    currentWeek: ts.currentWeek.filter((r) => grade === 'all' || r.grade === grade),
    previousWeek: ts.previousWeek.filter((r) => grade === 'all' || r.grade === grade),
    currentMonth: ts.currentMonth.filter((r) => grade === 'all' || r.grade === grade),
    previousMonth: ts.previousMonth.filter((r) => grade === 'all' || r.grade === grade),
    currentYear: ts.currentYear.filter((r) => grade === 'all' || r.grade === grade),
    previousYear: ts.previousYear.filter((r) => grade === 'all' || r.grade === grade),
  }
  const kpis = filteredTs && calculateDashboardKpis(filteredTs)

  // Заявки — отдельный административный поток (олимпиады, СПД), НЕ риски.
  const requestsApi = useApi(() => loadSyntheticRequests(), [])
  const requestKpis = requestsApi.data ? calculateRequestKpis(requestsApi.data) : null
  const legends = kpis && requestKpis && buildSectionLegends(kpis, requestKpis)
  const avgDelta = rows.length ? rows.reduce((sum, row) => sum + row.weeklyDelta, 0) / rows.length : 0
  const trend = avgDelta > 0.2 ? 'up' : avgDelta < -0.2 ? 'down' : 'stable'
  const strong = rows.slice(0, 3)
  const problem = [...rows].sort((a, b) => a.finalScore - b.finalScore).slice(0, 3)
  const quickActions = getQuickActions(user?.role)

  if (user?.role === 'STUDENT') {
    // Берём риски строго по studentId профиля, а не первый элемент массива.
    const risk = (ownRisk.data ?? []).find((r) => r.studentId === user.studentId) ?? ownRisk.data?.[0]
    const apps = applications.data ?? []
    return (
      <div className="page">
        <div className="toolbar">
          <button className="btn btn--ghost-blue toolbar__spacer" onClick={() => setShowFormula(true)}><IconInfo /> Как рассчитывается рейтинг?</button>
        </div>
        <div className="grid grid-4">
          <MiniStat label="Мой риск" value={risk ? risk.riskLevel : '—'} color={risk?.riskLevel === 'высокий' ? 'red' : risk?.riskLevel === 'средний' ? 'orange' : 'green'} />
          <MiniStat label="riskScore" value={risk ? String(risk.riskScore) : '—'} color="blue" />
          <MiniStat label="Мои заявки" value={String(apps.length)} color="purple" />
          <MiniStat label="На проверке" value={String(apps.filter((a) => a.status === 'pending').length)} color="orange" />
        </div>
        <div className="grid grid-2-wide">
          <Card title="Личная сводка">
            {ownRisk.loading ? <EmptyState message="Загрузка личных данных…" /> : risk ? (
              <>
                <div className="flex-between"><span className="text-muted">Класс {risk.classId.replace(/^\d+-/, '')}</span><span className={risk.riskLevel === 'высокий' ? 'badge badge--risk-high' : risk.riskLevel === 'средний' ? 'badge badge--risk-mid' : 'badge badge--risk-low'}>{risk.riskLevel}</span></div>
                <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Рекомендации</h3>
                <ul className="reco-list">{risk.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
              </>
            ) : <EmptyState message="У этого ученика пока нет зафиксированных рисков" />}
          </Card>
          <Card title="Быстрые действия">
            <div className="quick-actions">
              {quickActions.map((a) => <Link key={a.to} to={a.to} className="quick-action">{a.label}</Link>)}
            </div>
          </Card>
        </div>
        {showFormula && <RatingModal onClose={() => setShowFormula(false)} />}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="toolbar">
        <ParallelFilter value={parallel} onChange={setParallel} />
        <button className="btn btn--ghost-blue toolbar__spacer" onClick={() => setShowFormula(true)}><IconInfo /> Как рассчитывается рейтинг?</button>
      </div>

      {/* Смысловые блоки дашборда: состояние школы, риски, посещаемость,
          охват данных. Значения и динамика берутся из синтетических данных. */}
      {synthetic.loading || requestsApi.loading ? (
        <Card><EmptyState message="Загрузка показателей…" /></Card>
      ) : synthetic.error ? (
        <Card><EmptyState message={synthetic.error} /></Card>
      ) : kpis && requestKpis && legends ? (
        <DashboardSections kpis={kpis} requests={requestKpis} legends={legends} onShowLegend={setSelectedLegend} />
      ) : null}

      {rating.loading ? <Card><EmptyState message="Загрузка…" /></Card> : rating.error ? <Card><EmptyState message={rating.error} /></Card> : (
        <div className="grid grid-3">
          <TopClasses title="Проблемные классы" rows={problem} muted="Низкий индекс, проверьте пропуски и оценки" />
          <TopClasses title="Сильные классы" rows={strong} muted="Лучшие показатели за выбранный период" />
          <Card title="Быстрые действия">
            <div className="quick-actions">
              {quickActions.map((a) => <Link key={a.to} to={a.to} className="quick-action">{a.label}</Link>)}
            </div>
            <div className="note note--blue" style={{ marginTop: 14 }}>
              <TrendArrow trend={trend} delta={avgDelta} />
              <span>Средняя динамика по выбранной группе относительно прошлой недели.</span>
            </div>
          </Card>
        </div>
      )}

      {showFormula && <RatingModal onClose={() => setShowFormula(false)} />}
      {selectedLegend && <KpiInfoPanel legend={selectedLegend} onClose={() => setSelectedLegend(null)} />}
    </div>
  )
}

function MiniStat({ label, value, color }: {
  label: string; value: string; color: 'blue' | 'green' | 'orange' | 'red' | 'purple'
}) {
  return (
    <div className="card card--pad">
      <div className="stat-box__label">{label}</div>
      <div className={`stat-box__value stat-box__value--${color}`} style={{ marginTop: 8 }}>{value}</div>
    </div>
  )
}

function TopClasses({ title, rows, muted }: { title: string; rows: { id: string; name: string; finalScore: number; trend: 'up' | 'down' | 'stable'; weeklyDelta: number }[]; muted: string }) {
  return (
    <Card title={title}>
      <div className="class-list">
        {rows.map((row, i) => (
          <div className="class-list__row" key={row.id}>
            <span className="class-list__place">{i + 1}</span>
            <span className="class-list__name">{row.name}</span>
            <span className={scoreClass(row.finalScore)}>{row.finalScore.toFixed(1)}</span>
            <TrendArrow trend={row.trend} delta={row.weeklyDelta} />
          </div>
        ))}
      </div>
      <p className="text-muted" style={{ margin: '12px 0 0' }}>{muted}</p>
    </Card>
  )
}

function getQuickActions(role?: string) {
  if (role === 'ADMIN') return [
    { to: '/olympiads', label: 'Проверить олимпиады' },
    { to: '/users', label: 'Управлять пользователями' },
    { to: '/settings', label: 'Открыть настройки' },
  ]
  if (role === 'STUDENT') return [
    { to: '/olympiads', label: 'Подать заявку на олимпиаду' },
    { to: '/grades', label: 'Посмотреть оценки' },
    { to: '/attendance', label: 'Посмотреть пропуски' },
  ]
  if (role === 'TEACHER') return [
    { to: '/students', label: 'Ученики моих классов' },
    { to: '/risks', label: 'Проверить риски' },
    { to: '/attendance', label: 'Разобрать пропуски' },
  ]
  return [
    { to: '/risks', label: 'Открыть риски' },
    { to: '/classes', label: 'Рейтинг классов' },
    { to: '/reports', label: 'Сформировать отчёт' },
  ]
}

function RatingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal modal--wide" role="dialog" aria-modal="true" aria-label="Как рассчитывается рейтинг" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <h2>Как рассчитывается рейтинг</h2>
            <p>Формула и интерпретация риска</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <p>Итоговый рейтинг рассчитывается как взвешенная сумма нескольких компонентов:</p>
        <ul className="modal-list">
          <li><strong>Оценки — 35%.</strong> Учитывается средняя оценка ученика/класса за выбранный период. Значение нормируется к шкале 0–100.</li>
          <li><strong>Пропуски — 30%.</strong> Учитывается количество пропусков и доля пропусков без уважительной причины.</li>
          <li><strong>Активность — 20%.</strong> Учитывается участие в школьных активностях, проектах, мероприятиях и учебной активности.</li>
          <li><strong>Олимпиады — 10%.</strong> Учитывается участие, уровень олимпиады и результат.</li>
          <li><strong>Динамика — 5%.</strong> Учитывается изменение показателей относительно предыдущего периода.</li>
        </ul>
        <pre className="formula">rating = gradesScore * 0.35 + attendanceScore * 0.30 + activityScore * 0.20 + olympiadScore * 0.10 + dynamicsScore * 0.05</pre>
        <p>Рейтинг не является итоговой оценкой ученика. Это аналитический показатель для раннего выявления проблем и помощи ученикам.</p>
        <div className="risk-help">
          <span><strong>Высокий риск</strong> — ученик требует внимания.</span>
          <span><strong>Средний риск</strong> — есть негативная динамика или отдельные проблемы.</span>
          <span><strong>Низкий риск</strong> — критичных отклонений не обнаружено.</span>
        </div>
      </section>
    </div>
  )
}
