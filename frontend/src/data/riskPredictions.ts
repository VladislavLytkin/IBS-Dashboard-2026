import type { ParallelFilterValue, RiskPrediction } from '../types'
import { STUDENTS, deriveRiskFactors } from './students'
import {
  RISK_FACTOR_LABELS, computeRiskScore, riskLevelFromScore, riskRecommendations, riskReasons,
  type RiskFactors,
} from '../utils/riskModel'

// Прогноз риска строится из тех же факторов, что и riskScore ученика —
// значения консистентны между страницами.
export const RISK_PREDICTIONS: RiskPrediction[] = STUDENTS.map((s) => {
  const f = deriveRiskFactors(s)
  const riskScore = computeRiskScore(f)
  return {
    studentId: s.id,
    fullName: s.fullName,
    classId: s.classId,
    grade: s.grade,
    riskScore,
    riskLevel: riskLevelFromScore(riskScore),
    factors: (Object.keys(f) as (keyof RiskFactors)[]).map((k) => ({
      label: RISK_FACTOR_LABELS[k],
      value: Math.round(f[k]),
    })),
    reasons: riskReasons(f),
    recommendations: riskRecommendations(f),
  }
})

export function getRiskPredictions(parallel: ParallelFilterValue): RiskPrediction[] {
  const rows = parallel === 'all' ? RISK_PREDICTIONS : RISK_PREDICTIONS.filter((r) => r.grade === parallel)
  return [...rows].sort((a, b) => b.riskScore - a.riskScore)
}

export interface RiskSummary {
  total: number
  high: number
  medium: number
  low: number
}

export function getRiskSummary(parallel: ParallelFilterValue): RiskSummary {
  const rows = getRiskPredictions(parallel)
  return {
    total: rows.length,
    high: rows.filter((r) => r.riskLevel === 'высокий').length,
    medium: rows.filter((r) => r.riskLevel === 'средний').length,
    low: rows.filter((r) => r.riskLevel === 'низкий').length,
  }
}
