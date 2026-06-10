import type { ClassRating, RiskLevel, Trend } from '../types'

// Параллели, доступные в дашборде (как на дизайне — 5–11 класс).
export const GRADES = [5, 6, 7, 8, 9, 10, 11] as const

function risk(score: number): RiskLevel {
  if (score >= 75) return 'низкий'
  if (score >= 65) return 'средний'
  return 'высокий'
}

// Сырые баллы по классам каждой параллели (синтетика в духе датасета аналитики).
// Для 7 класса значения совпадают с дизайном.
const RAW: Record<number, { letter: string; score: number; trend: Trend; students: number }[]> = {
  5: [
    { letter: 'А', score: 84.2, trend: 'up', students: 26 },
    { letter: 'Б', score: 80.5, trend: 'flat', students: 25 },
    { letter: 'В', score: 77.1, trend: 'up', students: 28 },
    { letter: 'Г', score: 71.9, trend: 'down', students: 24 },
    { letter: 'Д', score: 66.3, trend: 'flat', students: 27 },
  ],
  6: [
    { letter: 'А', score: 83.0, trend: 'up', students: 27 },
    { letter: 'Б', score: 81.4, trend: 'up', students: 26 },
    { letter: 'В', score: 75.6, trend: 'down', students: 25 },
    { letter: 'Г', score: 72.0, trend: 'flat', students: 28 },
    { letter: 'Д', score: 68.7, trend: 'down', students: 24 },
    { letter: 'Е', score: 63.1, trend: 'down', students: 26 },
  ],
  7: [
    { letter: 'Б', score: 85.6, trend: 'up', students: 27 },
    { letter: 'А', score: 82.1, trend: 'up', students: 26 },
    { letter: 'В', score: 78.3, trend: 'flat', students: 28 },
    { letter: 'Г', score: 73.2, trend: 'down', students: 25 },
    { letter: 'Д', score: 69.4, trend: 'flat', students: 27 },
    { letter: 'Е', score: 64.8, trend: 'down', students: 24 },
  ],
  8: [
    { letter: 'А', score: 86.1, trend: 'up', students: 28 },
    { letter: 'Б', score: 79.9, trend: 'flat', students: 27 },
    { letter: 'В', score: 74.3, trend: 'up', students: 26 },
    { letter: 'Г', score: 70.5, trend: 'down', students: 25 },
    { letter: 'Д', score: 62.4, trend: 'down', students: 24 },
  ],
  9: [
    { letter: 'Б', score: 88.0, trend: 'up', students: 26 },
    { letter: 'А', score: 84.6, trend: 'up', students: 27 },
    { letter: 'В', score: 80.2, trend: 'flat', students: 25 },
    { letter: 'Г', score: 72.8, trend: 'down', students: 28 },
    { letter: 'Д', score: 67.1, trend: 'flat', students: 24 },
  ],
  10: [
    { letter: 'А', score: 85.3, trend: 'up', students: 24 },
    { letter: 'Б', score: 78.6, trend: 'flat', students: 23 },
    { letter: 'В', score: 71.2, trend: 'down', students: 25 },
  ],
  11: [
    { letter: 'А', score: 87.4, trend: 'up', students: 23 },
    { letter: 'Б', score: 81.0, trend: 'up', students: 24 },
    { letter: 'В', score: 73.5, trend: 'down', students: 22 },
  ],
}

export const CLASS_RATINGS: Record<number, ClassRating[]> = Object.fromEntries(
  GRADES.map((grade) => {
    const rows = [...RAW[grade]]
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({
        place: i + 1,
        className: `${grade}${r.letter}`,
        grade,
        score: r.score,
        trend: r.trend,
        studentsCount: r.students,
        riskLevel: risk(r.score),
      }))
    return [grade, rows]
  }),
) as Record<number, ClassRating[]>

export function getClassRatings(grade: number): ClassRating[] {
  return CLASS_RATINGS[grade] ?? []
}

// Полный список классов (для выпадающих списков «Выберите класс»).
export const ALL_CLASSES: string[] = GRADES.flatMap((g) =>
  [...RAW[g]].sort((a, b) => a.letter.localeCompare(b.letter)).map((r) => `${g}${r.letter}`),
)
