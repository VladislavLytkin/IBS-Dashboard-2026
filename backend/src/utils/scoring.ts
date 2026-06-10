// Единая формула итогового рейтинга (та же, что на фронтенде).
export interface FinalScoreInput {
  academicScore: number
  olympiadScore: number
  attendanceScore: number
  activityScore: number
  riskScore: number
}

export const FINAL_SCORE_WEIGHTS = {
  academic: 0.35,
  olympiad: 0.25,
  attendance: 0.15,
  activity: 0.15,
  risk: 0.1,
} as const

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

export function riskAdjustedScore(riskScore: number): number {
  return clampScore(100 - riskScore)
}

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
