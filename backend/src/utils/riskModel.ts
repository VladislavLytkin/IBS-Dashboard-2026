// Прототип ML-модели прогноза риска (взвешенная эвристика на синтетике).
// НЕ является педагогическим заключением.
import { clampScore } from './scoring'

export type RiskLevel = 'низкий' | 'средний' | 'высокий'

export interface RiskFactors {
  gradeDropFactor: number
  absenceFactor: number
  lowActivityFactor: number
  noOlympiadFactor: number
  negativeTrendFactor: number
}

export const RISK_WEIGHTS = {
  gradeDrop: 0.35,
  absence: 0.3,
  lowActivity: 0.2,
  noOlympiad: 0.1,
  negativeTrend: 0.05,
} as const

export const RISK_FACTOR_LABELS: Record<keyof RiskFactors, string> = {
  gradeDropFactor: 'Снижение среднего балла',
  absenceFactor: 'Рост пропусков',
  lowActivityFactor: 'Низкая активность',
  noOlympiadFactor: 'Отсутствие олимпиад/проектов',
  negativeTrendFactor: 'Отрицательная динамика за недели',
}

export function computeRiskScore(f: RiskFactors): number {
  const w = RISK_WEIGHTS
  const raw =
    w.gradeDrop * f.gradeDropFactor +
    w.absence * f.absenceFactor +
    w.lowActivity * f.lowActivityFactor +
    w.noOlympiad * f.noOlympiadFactor +
    w.negativeTrend * f.negativeTrendFactor
  return Math.round(clampScore(raw))
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score <= 33) return 'низкий'
  if (score <= 66) return 'средний'
  return 'высокий'
}

export function riskReasons(f: RiskFactors): string[] {
  const r: string[] = []
  if (f.gradeDropFactor >= 45) r.push('Снижение среднего балла за последние недели')
  if (f.absenceFactor >= 45) r.push('Повышенное количество пропусков')
  if (f.lowActivityFactor >= 55) r.push('Низкая внеучебная активность')
  if (f.noOlympiadFactor >= 60) r.push('Нет участия в олимпиадах и проектах')
  if (f.negativeTrendFactor >= 50) r.push('Устойчивая отрицательная динамика показателей')
  return r.length ? r : ['Критических факторов не выявлено']
}

export function riskRecommendations(f: RiskFactors): string[] {
  const r: string[] = []
  if (f.gradeDropFactor >= 45) r.push('Обсудить с учителями-предметниками причины снижения оценок')
  if (f.absenceFactor >= 45) r.push('Связаться с родителями по поводу пропусков')
  if (f.lowActivityFactor >= 55) r.push('Предложить участие в кружках или школьных мероприятиях')
  if (f.noOlympiadFactor >= 60) r.push('Вовлечь в предметную олимпиаду или проектную работу')
  if (f.negativeTrendFactor >= 50) r.push('Поставить ученика на еженедельный мониторинг')
  return r.length ? r : ['Поддерживать текущую траекторию']
}
