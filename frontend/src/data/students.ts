import type { ParallelFilterValue, Student } from '../types'
import { CLASSES } from './classes'
import { between, hashSeed, pick, round1, rngFor } from '../utils/random'
import { clampScore, computeFinalScore } from '../utils/scoring'
import { computeRiskScore, riskLevelFromScore, riskReasons, type RiskFactors } from '../utils/riskModel'

const FIRST_M = ['Иван', 'Кирилл', 'Дмитрий', 'Алексей', 'Никита', 'Михаил', 'Артём', 'Максим', 'Егор', 'Павел']
const FIRST_F = ['Анна', 'Мария', 'Елизавета', 'София', 'Дарья', 'Полина', 'Виктория', 'Ксения', 'Алиса', 'Вера']
const LAST_M = ['Иванов', 'Сидоров', 'Васильев', 'Попов', 'Фёдоров', 'Григорьев', 'Кузнецов', 'Волков', 'Морозов', 'Соколов']
const LAST_F = ['Петрова', 'Кузнецова', 'Смирнова', 'Лебедева', 'Андреева', 'Николаева', 'Морозова', 'Зайцева', 'Орлова', 'Павлова']

const STUDENTS_PER_CLASS = 6

/**
 * Факторы риска ученика — ЧИСТАЯ детерминированная функция от сохранённых показателей.
 * Благодаря этому riskScore одинаков на всех страницах (рейтинг и страница «Риски»).
 */
export function deriveRiskFactors(s: {
  id: string
  averageGrade: number
  attendanceRate: number
  activityScore: number
  olympiadParticipation: boolean
}): RiskFactors {
  const seedFrac = (hashSeed(`trend:${s.id}`) % 1000) / 1000 // 0..1, стабильно
  return {
    // Низкий средний балл → выше фактор снижения оценок.
    gradeDropFactor: clampScore((4.4 - s.averageGrade) * 45),
    // Чем ниже посещаемость, тем выше фактор пропусков.
    absenceFactor: clampScore((96 - s.attendanceRate) * 4),
    lowActivityFactor: clampScore(100 - s.activityScore),
    noOlympiadFactor: s.olympiadParticipation ? 15 : 85,
    negativeTrendFactor: clampScore(20 + seedFrac * 70),
  }
}

function buildStudents(): Student[] {
  const out: Student[] = []

  for (const cls of CLASSES) {
    for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
      const rnd = rngFor(`student:${cls.id}:${i}`)
      const female = rnd() > 0.5
      const first = pick(rnd, female ? FIRST_F : FIRST_M)
      const last = pick(rnd, female ? LAST_F : LAST_M)

      // Показатели ученика тяготеют к показателям его класса.
      const averageGrade = round1(
        Math.min(5, Math.max(2.8, 2.6 + (cls.academicScore / 100) * 2.2 + between(rnd, -0.4, 0.4))),
      )
      const attendanceRate = round1(clampScore(cls.attendanceScore + between(rnd, -8, 6)))
      const activityScore = round1(clampScore(cls.activityScore + between(rnd, -18, 18)))
      const olympiadParticipation = rnd() < cls.olympiadScore / 110
      const olympiadAwards = olympiadParticipation ? Math.round(between(rnd, 0, 3)) : 0

      const id = `${cls.id}-${i + 1}`
      const factors = deriveRiskFactors({ id, averageGrade, attendanceRate, activityScore, olympiadParticipation })
      const riskScore = computeRiskScore(factors)
      const riskLevel = riskLevelFromScore(riskScore)

      out.push({
        id,
        fullName: `${last} ${first}`,
        classId: cls.id,
        grade: cls.grade,
        averageGrade,
        attendanceRate,
        olympiadParticipation,
        olympiadAwards,
        activityScore,
        riskScore,
        riskLevel,
        riskReasons: riskReasons(factors),
      })
    }
  }
  return out
}

export const STUDENTS: Student[] = buildStudents()

export function getStudents(classId: string): Student[] {
  return STUDENTS.filter((s) => s.classId === classId)
}

// ===================== Итоговый рейтинг учеников =====================
// Компоненты приводятся к шкале 0..100, итог считается единой формулой из utils/scoring.
export interface StudentRank {
  place: number
  student: Student
  academic: number
  olympiad: number
  attendance: number
  activity: number
  finalScore: number
}

function studentComponents(s: Student) {
  const academic = round1(clampScore((s.averageGrade / 5) * 100))
  const olympiad = round1(clampScore((s.olympiadParticipation ? 35 : 8) + s.olympiadAwards * 22))
  const attendance = round1(clampScore(s.attendanceRate))
  const activity = round1(clampScore(s.activityScore))
  const finalScore = computeFinalScore({
    academicScore: academic,
    olympiadScore: olympiad,
    attendanceScore: attendance,
    activityScore: activity,
    riskScore: s.riskScore,
  })
  return { academic, olympiad, attendance, activity, finalScore }
}

export function getStudentRanking(parallel: ParallelFilterValue): StudentRank[] {
  const pool = parallel === 'all' ? STUDENTS : STUDENTS.filter((s) => s.grade === parallel)
  return pool
    .map((student) => ({ student, ...studentComponents(student) }))
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((row, i) => ({ place: i + 1, ...row }))
}
