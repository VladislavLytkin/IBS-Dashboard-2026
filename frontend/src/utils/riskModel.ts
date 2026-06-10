// Прототип ML-модели прогноза риска на синтетических данных.
// ВАЖНО: это не настоящая ML-модель и не педагогическое заключение —
// просто прозрачная взвешенная эвристика для демонстрации интерфейса.

import type { RiskLevel } from '../types'
import { clampScore } from './scoring'

/** Все факторы нормализованы в диапазон 0..100 (чем больше — тем выше риск). */
export interface RiskFactors {
  gradeDropFactor: number // снижение средней оценки
  absenceFactor: number // рост пропусков
  lowActivityFactor: number // низкая активность
  noOlympiadFactor: number // отсутствие олимпиад/проектов
  negativeTrendFactor: number // резкая отрицательная динамика
}

export const RISK_WEIGHTS = {
  gradeDrop: 0.35,
  absence: 0.3,
  lowActivity: 0.2,
  noOlympiad: 0.1,
  negativeTrend: 0.05,
} as const

export const RISK_FACTOR_LABELS: Record<keyof RiskFactors, string> = {
  gradeDropFactor: 'Снижение средней оценки',
  absenceFactor: 'Рост пропусков',
  lowActivityFactor: 'Низкая активность',
  noOlympiadFactor: 'Отсутствие олимпиад/проектов',
  negativeTrendFactor: 'Отрицательная динамика за недели',
}

/** Итоговый riskScore 0..100. */
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

/** riskScore — обратный показатель рейтинга: чем выше, тем хуже. */
export function riskLevelFromScore(score: number): RiskLevel {
  if (score <= 50) return 'низкий'
  if (score <= 75) return 'средний'
  return 'высокий'
}

/** Человекочитаемые причины риска по факторам выше порога. */
export function riskReasons(f: RiskFactors): string[] {
  const reasons: string[] = []
  if (f.gradeDropFactor >= 45) reasons.push('Снижение средней оценки за последние недели')
  if (f.absenceFactor >= 45) reasons.push('Повышенное количество пропусков')
  if (f.lowActivityFactor >= 55) reasons.push('Низкая внеучебная активность')
  if (f.noOlympiadFactor >= 60) reasons.push('Нет участия в олимпиадах и проектах')
  if (f.negativeTrendFactor >= 50) reasons.push('Устойчивая отрицательная динамика показателей')
  return reasons.length ? reasons : ['Критических факторов не выявлено']
}

/** Рекомендации, что стоит проверить, по доминирующим факторам. */
export function riskRecommendations(f: RiskFactors): string[] {
  const recs: string[] = []
  if (f.gradeDropFactor >= 45) recs.push('Обсудить с учителями-предметниками причины снижения оценок')
  if (f.absenceFactor >= 45) recs.push('Связаться с родителями по поводу пропусков')
  if (f.lowActivityFactor >= 55) recs.push('Предложить участие в кружках или школьных мероприятиях')
  if (f.noOlympiadFactor >= 60) recs.push('Вовлечь в предметную олимпиаду или проектную работу')
  if (f.negativeTrendFactor >= 50) recs.push('Поставить ученика на еженедельный мониторинг')
  return recs.length ? recs : ['Поддерживать текущую траекторию']
}
