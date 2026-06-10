// Синтетические данные внеучебной активности класса (кружки, проекты, мероприятия).
// Используется как один из компонентов итогового рейтинга (activityScore).

import { between, round1, rngFor } from '../utils/random'
import { clampScore } from '../utils/scoring'

export interface ClassActivity {
  classId: string
  eventsCount: number // мероприятий за период
  projectsCount: number // проектов
  extraPoints: number // дополнительные баллы
  activityScore: number // 0..100
}

/** Детерминированный activityScore класса по его названию и силе (academicHint 0..100). */
export function activityScoreFor(className: string, academicHint: number): number {
  const rnd = rngFor(`activity:${className}`)
  // Активность слабо коррелирует с академическим результатом, но не равна ему.
  const base = 0.45 * academicHint + between(rnd, 20, 55)
  return round1(clampScore(base))
}

export function classActivityFor(className: string, activityScore: number): ClassActivity {
  const rnd = rngFor(`activity-detail:${className}`)
  return {
    classId: className,
    eventsCount: Math.round(between(rnd, 3, 12) * (activityScore / 70)),
    projectsCount: Math.round(between(rnd, 1, 6) * (activityScore / 70)),
    extraPoints: Math.round(between(rnd, 10, 60) * (activityScore / 70)),
    activityScore,
  }
}
