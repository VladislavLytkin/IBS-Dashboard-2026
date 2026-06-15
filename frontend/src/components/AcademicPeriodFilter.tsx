// Переиспользуемый фильтр учебного периода: Город / Учебный год / Семестр.
// Заменяет старый фильтр «Месяц: Май 2024» на семестровую систему.
//
// Город и семестр-фильтры опциональны: страница ученика, например, не
// показывает выбор города (он жёстко фиксирован), а где-то нужен только год.

export type SemesterValue = 'all' | 1 | 2

export interface AcademicPeriodFilterProps {
  // Город (опционально — например, ученику не показываем).
  cities?: string[]
  city?: string
  onCityChange?: (city: string) => void

  // Учебный год — обязателен. Метки в формате "2025/2026".
  years: string[]
  year: string
  onYearChange: (year: string) => void

  // Семестр.
  semester: SemesterValue
  onSemesterChange: (semester: SemesterValue) => void
  /** Показывать ли вариант «Весь год» (по умолчанию — да). */
  includeSemesterAll?: boolean
}

export const SEMESTER_LABEL: Record<1 | 2, string> = {
  1: '1 семестр',
  2: '2 семестр',
}

export function AcademicPeriodFilter({
  cities,
  city,
  onCityChange,
  years,
  year,
  onYearChange,
  semester,
  onSemesterChange,
  includeSemesterAll = true,
}: AcademicPeriodFilterProps) {
  const showCity = cities && cities.length > 0 && onCityChange
  return (
    <>
      {showCity && (
        <div className="field">
          <span className="field__label">Город:</span>
          <select className="select" value={city} onChange={(e) => onCityChange!(e.target.value)}>
            {cities!.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <span className="field__label">Учебный год:</span>
        <select className="select" value={year} onChange={(e) => onYearChange(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="field">
        <span className="field__label">Семестр:</span>
        <select
          className="select"
          value={String(semester)}
          onChange={(e) => onSemesterChange(e.target.value === 'all' ? 'all' : (Number(e.target.value) as 1 | 2))}
        >
          {includeSemesterAll && <option value="all">Весь год</option>}
          <option value="1">1 семестр</option>
          <option value="2">2 семестр</option>
        </select>
      </div>
    </>
  )
}
