import { useEffect, useState } from 'react'
import type { AppSettings } from '../api/types'
import { settingsService } from '../services'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { YEARS } from '../context/FiltersContext'
import { ACCENT_COLORS, BG_COLORS, useTheme, type ColorOption } from '../context/ThemeContext'
import { GRADE_LEVELS } from '../types'
import { Card, EmptyState } from '../components/ui'

/** Компактный ряд цветовых свотчей (как в DuckDuckGo): кружки с подписью-tooltip. */
function SwatchRow({ options, value, onChange, allowReset }: {
  options: ColorOption[]
  value: string | null
  onChange: (v: string | null) => void
  allowReset?: boolean
}) {
  return (
    <div className="swatches" role="radiogroup">
      {allowReset && (
        <button
          type="button"
          className={`swatch swatch--auto${value === null ? ' is-active' : ''}`}
          title="По теме (по умолчанию)"
          aria-label="По теме"
          onClick={() => onChange(null)}
        >
          A
        </button>
      )}
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          className={`swatch${value === o.value ? ' is-active' : ''}`}
          style={{ background: o.value }}
          title={o.name}
          aria-label={o.name}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
        />
      ))}
    </div>
  )
}

function PersonalizationCard() {
  const { accent, setAccent, appBg, setAppBg } = useTheme()
  return (
    <Card title="Персонализация">
      <div className="form-grid">
        <div className="setting-field">
          <span className="field__label">Цвет акцента интерфейса</span>
          <SwatchRow options={ACCENT_COLORS} value={accent} onChange={setAccent} allowReset />
        </div>
        <div className="setting-field">
          <span className="field__label">Цвет фона</span>
          <SwatchRow options={BG_COLORS} value={appBg} onChange={setAppBg} allowReset />
        </div>
      </div>
      <div className="note note--blue" style={{ marginTop: 14 }}>
        Личная настройка: сохраняется в этом браузере и не влияет на других пользователей.
      </div>
    </Card>
  )
}

export function SettingsPage() {
  const { hasRole } = useAuth()
  const { setTheme } = useTheme()
  const canEdit = hasRole('ADMIN', 'DIRECTOR')
  const canViewSystem = hasRole('ADMIN', 'DIRECTOR')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsService.get().then(setSettings).catch((e) => setError(e instanceof ApiError ? e.message : 'Ошибка')).finally(() => setLoading(false))
  }, [])

  // Остальным ролям доступна только личная персонализация.
  if (!canViewSystem) {
    return (
      <div className="page">
        <PersonalizationCard />
      </div>
    )
  }

  if (loading) return <div className="page"><Card><EmptyState message="Загрузка…" /></Card></div>
  if (!settings) return <div className="page"><Card><EmptyState message={error ?? 'Нет настроек'} /></Card></div>

  const g = settings.general
  const n = settings.notifications
  const r = settings.reports
  const set = (patch: Partial<AppSettings>) => setSettings({ ...settings, ...patch })

  const save = async () => {
    setStatus(null); setError(null)
    try {
      const next = await settingsService.update(settings)
      setSettings(next)
      setStatus('Настройки сохранены')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось сохранить')
    }
  }

  return (
    <div className="page">
      {!canEdit && <div className="note note--blue">Просмотр только для чтения. Изменять настройки могут роли ADMIN и DIRECTOR.</div>}

      <PersonalizationCard />

      <Card title="Общие">
        <div className="form-grid">
          <Field label="Название школы">
            <input className="input" value={g.schoolName} disabled={!canEdit}
              onChange={(e) => set({ general: { ...g, schoolName: e.target.value } })} />
          </Field>
          <Field label="Учебный год по умолчанию">
            <select className="select" value={g.defaultYear} disabled={!canEdit}
              onChange={(e) => set({ general: { ...g, defaultYear: Number(e.target.value) } })}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Параллель по умолчанию">
            <select className="select" value={g.defaultGrade} disabled={!canEdit}
              onChange={(e) => set({ general: { ...g, defaultGrade: Number(e.target.value) } })}>
              {GRADE_LEVELS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Тема интерфейса">
            <select className="select" value={g.theme} disabled={!canEdit}
              onChange={(e) => {
                const theme = e.target.value as typeof g.theme
                set({ general: { ...g, theme } })
                setTheme(theme === 'dark' ? 'dark' : 'light')
              }}>
              <option value="light">Светлая</option>
              <option value="dark">Тёмная</option>
              <option value="system">Системная</option>
            </select>
          </Field>
          <Field label="Формат процентов">
            <select className="select" value={g.percentFormat} disabled={!canEdit}
              onChange={(e) => set({ general: { ...g, percentFormat: e.target.value as typeof g.percentFormat } })}>
              <option value="integer">Целые (72%)</option>
              <option value="oneDecimal">С десятыми (72,6%)</option>
            </select>
          </Field>
          <Field label="Режим рейтинга">
            <select className="select" value={g.ratingMode} disabled={!canEdit}
              onChange={(e) => set({ general: { ...g, ratingMode: e.target.value as typeof g.ratingMode } })}>
              <option value="classes">По классам</option>
              <option value="students">По ученикам</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Уведомления внутри приложения">
        <Toggle label="Включить уведомления" checked={n.enabled} disabled={!canEdit} onChange={(v) => set({ notifications: { ...n, enabled: v } })} />
        <Toggle label="Высокий риск ученика" checked={n.highRisk} disabled={!canEdit} onChange={(v) => set({ notifications: { ...n, highRisk: v } })} />
        <Toggle label="Падение итогового рейтинга класса" checked={n.ratingDrop} disabled={!canEdit} onChange={(v) => set({ notifications: { ...n, ratingDrop: v } })} />
        <Toggle label="Новые отчёты" checked={n.newReports} disabled={!canEdit} onChange={(v) => set({ notifications: { ...n, newReports: v } })} />
        <Toggle label="Резкий рост пропусков" checked={n.attendanceSpike} disabled={!canEdit} onChange={(v) => set({ notifications: { ...n, attendanceSpike: v } })} />
        <Field label="Минимальный уровень риска для уведомления">
          <select className="select" value={n.minRiskLevel} disabled={!canEdit}
            onChange={(e) => set({ notifications: { ...n, minRiskLevel: e.target.value as typeof n.minRiskLevel } })}>
            <option value="средний">Средний</option>
            <option value="высокий">Высокий</option>
          </select>
        </Field>
      </Card>

      <Card title="Отчёты">
        <Field label="Формат по умолчанию"><input className="input" value="xlsx" disabled /></Field>
        <Field label="Период по умолчанию">
          <select className="select" value={r.defaultPeriod} disabled={!canEdit}
            onChange={(e) => set({ reports: { ...r, defaultPeriod: Number(e.target.value) } })}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Toggle label="Включать ML-риск в отчёт" checked={r.includeMlRisk} disabled={!canEdit} onChange={(v) => set({ reports: { ...r, includeMlRisk: v } })} />
        <Toggle label="Включать сравнение с городом и регионом" checked={r.includeCityRegion} disabled={!canEdit} onChange={(v) => set({ reports: { ...r, includeCityRegion: v } })} />
      </Card>

      {canEdit && (
        <div className="flex" style={{ gap: 12 }}>
          <button className="btn-primary" onClick={save}>Сохранить настройки</button>
          {status && <span className="text-green">{status}</span>}
          {error && <span className="text-red">{error}</span>}
        </div>
      )}

    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="setting-field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
