import type { ClassActivity } from './activity'
import type { ClassInfo, GradeLevel, ParallelFilterValue, TrendDirection } from '../types'
import { GRADE_LEVELS } from '../types'
import { between, round1, rngFor } from '../utils/random'
import { clampScore, computeFinalScore, sortByFinalScore } from '../utils/scoring'
import { activityScoreFor, classActivityFor } from './activity'

export const GRADES = GRADE_LEVELS

const LETTERS = ['А', 'Б', 'В'] as const

// «Сила» буквы класса: А — обычно сильнее, В — слабее. Это создаёт логичный разброс.
const LETTER_BOOST: Record<string, number> = { А: 8, Б: 0, В: -8 }

function trendFromDelta(delta: number): TrendDirection {
  if (delta > 0.6) return 'up'
  if (delta < -0.6) return 'down'
  return 'stable'
}

function buildClass(grade: GradeLevel, letter: string): ClassInfo {
  const name = `${grade}${letter}`
  const rnd = rngFor(`class:${name}`)
  const boost = LETTER_BOOST[letter] ?? 0

  // Академический результат — база, остальные показатели коррелируют с ним.
  const academicScore = round1(clampScore(72 + boost + between(rnd, -6, 6) + (grade - 8) * 0.6))

  // Сильные классы чаще выше по олимпиадам.
  const olympiadScore = round1(clampScore(0.7 * academicScore + boost * 0.6 + between(rnd, -10, 8) - 8))

  // Посещаемость: у части классов заметно ниже — это повышает риск.
  const attendanceScore = round1(clampScore(90 + boost * 0.5 + between(rnd, -10, 6)))

  const activityScore = activityScoreFor(name, academicScore)

  // Риск тем выше, чем ниже посещаемость и академический результат.
  const riskScore = Math.round(
    clampScore(58 - (attendanceScore - 86) * 1.6 - (academicScore - 72) * 0.9 + between(rnd, -8, 10)),
  )

  const finalScore = computeFinalScore({ academicScore, olympiadScore, attendanceScore, activityScore, riskScore })
  const weeklyDelta = round1(between(rnd, -2.6, 2.8))

  return {
    id: name,
    name,
    grade,
    studentCount: Math.round(between(rnd, 22, 31)),
    academicScore,
    olympiadScore,
    attendanceScore,
    activityScore,
    riskScore,
    finalScore,
    weeklyDelta,
    trend: trendFromDelta(weeklyDelta),
  }
}

export const CLASSES: ClassInfo[] = GRADES.flatMap((grade) =>
  LETTERS.map((letter) => buildClass(grade, letter)),
)

export const ALL_CLASSES: string[] = CLASSES.map((c) => c.name)

/** Классы выбранной параллели (или все), отсортированные по итоговому баллу по убыванию. */
export function getClasses(parallel: ParallelFilterValue): ClassInfo[] {
  const filtered = parallel === 'all' ? CLASSES : CLASSES.filter((c) => c.grade === parallel)
  return sortByFinalScore(filtered)
}

export function getClassById(id: string): ClassInfo | undefined {
  return CLASSES.find((c) => c.id === id)
}

export const CLASS_ACTIVITY: ClassActivity[] = CLASSES.map((c) => classActivityFor(c.name, c.activityScore))
