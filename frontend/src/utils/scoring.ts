// Единая точка расчёта итогового рейтинга. Расчёт НЕ дублируется в компонентах —
// страницы только отображают значения, полученные отсюда.

export interface FinalScoreInput {
  academicScore: number // 0..100
  olympiadScore: number // 0..100
  attendanceScore: number // 0..100
  activityScore: number // 0..100
  riskScore: number // 0..100 (чем выше — тем хуже)
}

/** Веса компонентов итогового рейтинга. Сумма = 1.0 */
export const FINAL_SCORE_WEIGHTS = {
  academic: 0.35,
  olympiad: 0.25,
  attendance: 0.15,
  activity: 0.15,
  risk: 0.1,
} as const

/** Описание компонентов для UI (подписи и цвета). */
export const FINAL_SCORE_COMPONENTS = [
  { key: 'academic', label: 'Академический результат', weight: FINAL_SCORE_WEIGHTS.academic, color: '#2563eb' },
  { key: 'olympiad', label: 'Олимпиады', weight: FINAL_SCORE_WEIGHTS.olympiad, color: '#16a34a' },
  { key: 'attendance', label: 'Посещаемость', weight: FINAL_SCORE_WEIGHTS.attendance, color: '#9333ea' },
  { key: 'activity', label: 'Активность', weight: FINAL_SCORE_WEIGHTS.activity, color: '#f59e0b' },
  { key: 'risk', label: 'Риск (инвертированный)', weight: FINAL_SCORE_WEIGHTS.risk, color: '#dc2626' },
] as const

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

/** Чем выше риск, тем меньше вклад: riskAdjustedScore = 100 - riskScore. */
export function riskAdjustedScore(riskScore: number): number {
  return clampScore(100 - riskScore)
}

/** Итоговый балл 0..100, округлённый до 1 знака. */
export function computeFinalScore(input: FinalScoreInput): number {
  const w = FINAL_SCORE_WEIGHTS
  const raw =
    w.academic * input.academicScore +
    w.olympiad * input.olympiadScore +
    w.attendance * input.attendanceScore +
    w.activity * input.activityScore +
    w.risk * riskAdjustedScore(input.riskScore)
  return Math.round(clampScore(raw) * 10) / 10
}

/** Сортировка по итоговому баллу по убыванию (для рейтинга). */
export function sortByFinalScore<T extends { finalScore: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.finalScore - a.finalScore)
}
