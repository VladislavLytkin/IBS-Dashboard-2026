import type {
  ClassInfo, ComparisonRow, OlympiadRatingRow, RiskPrediction, Student, TrendDirection,
} from '../types'
import { GRADES, YEARS } from '../types'
import { between, hashSeed, pick, round1, rngFor } from '../utils/random'
import { clampScore, computeFinalScore } from '../utils/scoring'
import {
  RISK_FACTOR_LABELS, computeRiskScore, riskLevelFromScore, riskRecommendations, riskReasons,
  type RiskFactors,
} from '../utils/riskModel'

const LETTERS = ['А', 'Б', 'В']
const LETTER_BOOST: Record<string, number> = { А: 8, Б: 0, В: -8 }

const FIRST_M = ['Иван', 'Кирилл', 'Дмитрий', 'Алексей', 'Никита', 'Михаил', 'Артём', 'Максим', 'Егор', 'Павел', 'Роман', 'Глеб']
const FIRST_F = ['Анна', 'Мария', 'Елизавета', 'София', 'Дарья', 'Полина', 'Виктория', 'Ксения', 'Алиса', 'Вера', 'Ольга', 'Алина']
const LAST_M = ['Иванов', 'Сидоров', 'Васильев', 'Попов', 'Фёдоров', 'Григорьев', 'Кузнецов', 'Волков', 'Морозов', 'Соколов', 'Лебедев', 'Новиков']
const LAST_F = ['Петрова', 'Кузнецова', 'Смирнова', 'Лебедева', 'Андреева', 'Николаева', 'Морозова', 'Зайцева', 'Орлова', 'Павлова', 'Волкова', 'Соколова']

// ===================== Предметы по параллелям =====================
const EGE = ['Русский язык', 'Математика профильная', 'Математика базовая', 'Информатика', 'Физика', 'Химия', 'Биология', 'Обществознание', 'История', 'География', 'Литература', 'Английский язык']
const OGE = ['Русский язык', 'Математика', 'Информатика', 'Физика', 'Химия', 'Биология', 'Обществознание', 'История', 'География', 'Литература', 'Английский язык']
const DIAG = ['Русский язык', 'Математика', 'Английский язык', 'Информатика', 'История', 'География', 'Биология']
const PRIMARY = ['Русский язык', 'Математика', 'Литературное чтение', 'Окружающий мир', 'Английский язык']

export function examSubjectsFor(grade: number): string[] {
  if (grade === 11) return EGE
  if (grade === 9) return OGE
  if (grade >= 5) return DIAG
  return PRIMARY
}

export function examTypeFor(grade: number): string {
  if (grade === 11) return 'ЕГЭ'
  if (grade === 9) return 'ОГЭ'
  if (grade >= 5) return 'Диагностические работы'
  return 'Базовые показатели'
}

export const OLYMPIAD_SUBJECTS = ['Математика', 'Информатика', 'Физика', 'Химия', 'Биология', 'Обществознание', 'История', 'География', 'Литература', 'Английский язык', 'Экономика', 'Право']

// ===================== Факторы риска (чистая функция) =====================
export function deriveRiskFactors(s: {
  id: string
  averageGrade: number
  previousAverageGrade: number
  attendanceRate: number
  activityScore: number
  olympiadParticipation: boolean
}): RiskFactors {
  const seedFrac = (hashSeed(`trend:${s.id}`) % 1000) / 1000
  const drop = Math.max(0, s.previousAverageGrade - s.averageGrade)
  return {
    gradeDropFactor: clampScore(drop * 130 + (4.4 - s.averageGrade) * 22),
    absenceFactor: clampScore((96 - s.attendanceRate) * 4),
    lowActivityFactor: clampScore(100 - s.activityScore),
    noOlympiadFactor: s.olympiadParticipation ? 15 : 85,
    negativeTrendFactor: clampScore(20 + seedFrac * 70),
  }
}

// ===================== Классы =====================
function trendFromDelta(delta: number): TrendDirection {
  if (delta > 0.6) return 'up'
  if (delta < -0.6) return 'down'
  return 'stable'
}

function buildClass(year: number, grade: number, letter: string): ClassInfo {
  const name = `${grade}${letter}`
  const id = `${year}-${name}`
  const rnd = rngFor(`class:${id}`)
  const boost = LETTER_BOOST[letter] ?? 0
  // Лёгкий тренд по годам (школа улучшается) + влияние параллели и буквы.
  const academicScore = round1(clampScore(70 + boost + (grade - 6) * 0.4 + (year - 2023) * 0.7 + between(rnd, -6, 6)))
  const olympiadScore = round1(clampScore(0.7 * academicScore + boost * 0.6 - 8 + between(rnd, -10, 8)))
  const attendanceScore = round1(clampScore(90 + boost * 0.5 + between(rnd, -10, 6)))
  const activityScore = round1(clampScore(0.45 * academicScore + between(rnd, 20, 55)))
  const riskScore = Math.round(clampScore(58 - (attendanceScore - 86) * 1.6 - (academicScore - 72) * 0.9 + between(rnd, -8, 10)))
  const finalScore = computeFinalScore({ academicScore, olympiadScore, attendanceScore, activityScore, riskScore })
  const weeklyDelta = round1(between(rnd, -2.6, 2.8))
  return {
    id, year, grade, letter, name,
    studentCount: Math.round(between(rnd, 20, 32)),
    academicScore, olympiadScore, attendanceScore, activityScore, riskScore, finalScore,
    weeklyDelta, trend: trendFromDelta(weeklyDelta),
  }
}

const classCache = new Map<number, ClassInfo[]>()
function classesForYear(year: number): ClassInfo[] {
  let list = classCache.get(year)
  if (!list) {
    list = GRADES.flatMap((g) => LETTERS.map((l) => buildClass(year, g, l)))
    classCache.set(year, list)
  }
  return list
}

export function listClasses(year: number, grade?: number): ClassInfo[] {
  const list = classesForYear(year)
  return grade ? list.filter((c) => c.grade === grade) : list
}

export function getClass(id: string): ClassInfo | undefined {
  const year = Number(id.split('-')[0])
  return classesForYear(year).find((c) => c.id === id)
}

export function classRating(year: number, grade?: number): ClassInfo[] {
  return [...listClasses(year, grade)].sort((a, b) => b.finalScore - a.finalScore)
}

// ===================== Ученики =====================
function buildStudents(cls: ClassInfo): Student[] {
  const out: Student[] = []
  for (let i = 0; i < cls.studentCount; i++) {
    const rnd = rngFor(`student:${cls.id}:${i}`)
    const female = rnd() > 0.5
    const first = pick(rnd, female ? FIRST_F : FIRST_M)
    const last = pick(rnd, female ? LAST_F : LAST_M)
    const id = `${cls.id}-s${i + 1}`

    const profile = i / cls.studentCount
    const highRiskProfile = profile < 0.08
    const mediumRiskProfile = !highRiskProfile && profile < 0.31
    const averageGrade = highRiskProfile
      ? round1(between(rnd, 2.4, 3.0))
      : mediumRiskProfile
        ? round1(between(rnd, 3.35, 3.85))
        : round1(Math.min(5, Math.max(3.6, 3.2 + (cls.academicScore / 100) * 1.7 + between(rnd, -0.25, 0.35))))
    const previousAverageGrade = highRiskProfile
      ? round1(Math.min(5, averageGrade + between(rnd, 0.7, 1.2)))
      : mediumRiskProfile
        ? round1(Math.min(5, averageGrade + between(rnd, 0.15, 0.45)))
        : round1(Math.min(5, Math.max(3.4, averageGrade + between(rnd, -0.15, 0.25))))
    const attendanceRate = highRiskProfile
      ? round1(between(rnd, 58, 72))
      : mediumRiskProfile
        ? round1(between(rnd, 80, 88))
        : round1(clampScore(cls.attendanceScore + between(rnd, -4, 6)))
    const absenceCount = Math.round(((100 - attendanceRate) / 100) * 180)
    const activityScore = highRiskProfile
      ? round1(between(rnd, 8, 32))
      : mediumRiskProfile
        ? round1(between(rnd, 45, 65))
        : round1(clampScore(cls.activityScore + between(rnd, -10, 20)))
    const olympiadParticipation = highRiskProfile ? false : mediumRiskProfile ? rnd() < 0.2 : rnd() < cls.olympiadScore / 105
    const olympiadAwards = olympiadParticipation ? Math.round(between(rnd, 0, 3)) : 0
    const projectCount = Math.round(between(rnd, 0, 5) * (activityScore / 80))

    const factors = deriveRiskFactors({ id, averageGrade, previousAverageGrade, attendanceRate, activityScore, olympiadParticipation })
    const riskScore = computeRiskScore(factors)

    out.push({
      id, year: cls.year, classId: cls.id, grade: cls.grade,
      fullName: `${last} ${first}`, gender: female ? 'ж' : 'м',
      averageGrade, previousAverageGrade, attendanceRate, absenceCount,
      olympiadParticipation, olympiadAwards, activityScore, projectCount,
      riskScore, riskLevel: riskLevelFromScore(riskScore),
      riskReasons: riskReasons(factors), recommendations: riskRecommendations(factors),
    })
  }
  return out
}

const studentCache = new Map<string, Student[]>()
function studentsForClass(cls: ClassInfo): Student[] {
  let list = studentCache.get(cls.id)
  if (!list) {
    list = buildStudents(cls)
    studentCache.set(cls.id, list)
  }
  return list
}

export function listStudents(year: number, grade?: number, classId?: string): Student[] {
  let classes = listClasses(year, grade)
  if (classId) classes = classes.filter((c) => c.id === classId)
  return classes.flatMap(studentsForClass)
}

export function getStudent(id: string): Student | undefined {
  const classId = id.replace(/-s\d+$/, '')
  const cls = getClass(classId)
  if (!cls) return undefined
  return studentsForClass(cls).find((s) => s.id === id)
}

// ===================== Экзамены =====================
const EXAM_BASE: Record<string, number> = {
  'Русский язык': 84, 'Математика профильная': 71, 'Математика базовая': 88, 'Математика': 76,
  'Информатика': 79, 'Физика': 64, 'Химия': 58, 'Биология': 61, 'Обществознание': 67,
  'История': 55, 'География': 49, 'Литература': 74, 'Английский язык': 82,
  'Литературное чтение': 86, 'Окружающий мир': 83,
}

export function examComparison(year: number, grade: number): ComparisonRow[] {
  return examSubjectsFor(grade).map((subject) => {
    const rnd = rngFor(`exam:${year}:${grade}:${subject}`)
    const base = (EXAM_BASE[subject] ?? 65) + (year - 2023) * 0.8
    const school = Math.round(clampScore(base + between(rnd, -4, 6)))
    const city = Math.round(clampScore(school - between(rnd, 3, 9)))
    const region = Math.round(clampScore(city - between(rnd, 1, 6)))
    return { subject, school, city, region }
  })
}

export function examByClass(year: number, grade: number, classId: string): ComparisonRow[] {
  const cls = getClass(classId)
  const shift = cls ? (cls.academicScore - 72) * 0.5 : 0
  return examComparison(year, grade).map((r) => ({
    ...r,
    school: Math.round(clampScore(r.school + shift)),
  }))
}

// ===================== Олимпиады =====================
const OLYMP_BASE: Record<string, number> = {
  'Математика': 78, 'Информатика': 81, 'Физика': 69, 'Химия': 62, 'Биология': 57,
  'Обществознание': 66, 'История': 54, 'География': 48, 'Литература': 71,
  'Английский язык': 76, 'Экономика': 59, 'Право': 52,
}

export function olympiadComparison(year: number, grade: number): ComparisonRow[] {
  return OLYMPIAD_SUBJECTS.map((subject) => {
    const rnd = rngFor(`olymp:${year}:${grade}:${subject}`)
    const base = OLYMP_BASE[subject] + (year - 2023) * 0.7
    const school = Math.round(clampScore(base + between(rnd, -4, 7)))
    const city = Math.round(clampScore(school - between(rnd, 3, 9)))
    const region = Math.round(clampScore(city - between(rnd, 1, 6)))
    return { subject, school, city, region }
  })
}

export function olympiadRating(year: number, grade?: number): OlympiadRatingRow[] {
  return listClasses(year, grade)
    .map((c) => {
      const rnd = rngFor(`olymp-class:${c.id}`)
      return {
        classId: c.name,
        grade: c.grade,
        participationPct: round1(clampScore(c.olympiadScore * 0.7 + between(rnd, 5, 20))),
        awardPct: round1(clampScore(c.olympiadScore * 0.35 + between(rnd, 2, 12))),
        avgScore: round1(clampScore(c.olympiadScore + between(rnd, -6, 8))),
        index: round1(c.olympiadScore),
      }
    })
    .sort((a, b) => b.index - a.index)
}

export function olympiadByClass(year: number, grade: number, classId: string): ComparisonRow[] {
  const cls = getClass(classId)
  const shift = cls ? (cls.olympiadScore - 60) * 0.4 : 0
  return olympiadComparison(year, grade).map((r) => ({ ...r, school: Math.round(clampScore(r.school + shift)) }))
}

// ===================== Риски =====================
export function risks(year: number, grade?: number, classId?: string): RiskPrediction[] {
  return listStudents(year, grade, classId)
    .map((s) => {
      const f = deriveRiskFactors(s)
      return {
        studentId: s.id, fullName: s.fullName, classId: s.classId, grade: s.grade, year: s.year,
        riskScore: s.riskScore, riskLevel: s.riskLevel,
        factors: (Object.keys(f) as (keyof RiskFactors)[]).map((k) => ({ label: RISK_FACTOR_LABELS[k], value: Math.round(f[k]) })),
        reasons: s.riskReasons, recommendations: s.recommendations,
      }
    })
    .sort((a, b) => b.riskScore - a.riskScore)
}

export function riskByStudent(studentId: string): RiskPrediction | undefined {
  const s = getStudent(studentId)
  if (!s) return undefined
  const f = deriveRiskFactors(s)
  return {
    studentId: s.id, fullName: s.fullName, classId: s.classId, grade: s.grade, year: s.year,
    riskScore: s.riskScore, riskLevel: s.riskLevel,
    factors: (Object.keys(f) as (keyof RiskFactors)[]).map((k) => ({ label: RISK_FACTOR_LABELS[k], value: Math.round(f[k]) })),
    reasons: s.riskReasons, recommendations: s.recommendations,
  }
}

// ===================== Дашборд =====================
export function dashboardSummary(year: number, grade?: number, allowedClassIds?: string[] | null) {
  let classes = classRating(year, grade)
  let students = listStudents(year, grade)
  if (allowedClassIds) {
    const allowed = new Set(allowedClassIds)
    classes = classes.filter((c) => allowed.has(c.id))
    students = students.filter((s) => allowed.has(s.classId))
  }
  const riskRows = students
  const avgFinal = classes.length ? round1(classes.reduce((s, c) => s + c.finalScore, 0) / classes.length) : 0
  const avgAttendance = classes.length ? round1(classes.reduce((s, c) => s + c.attendanceScore, 0) / classes.length) : 0
  const avgOlympiad = classes.length ? round1(classes.reduce((s, c) => s + c.olympiadScore, 0) / classes.length) : 0
  return {
    year,
    grade: grade ?? null,
    classCount: classes.length,
    studentCount: students.length,
    avgFinalScore: avgFinal,
    avgAttendance,
    avgOlympiadIndex: avgOlympiad,
    topClass: classes[0] ? { name: classes[0].name, finalScore: classes[0].finalScore } : null,
    risk: {
      high: riskRows.filter((s) => s.riskLevel === 'высокий').length,
      medium: riskRows.filter((s) => s.riskLevel === 'средний').length,
      low: riskRows.filter((s) => s.riskLevel === 'низкий').length,
    },
  }
}

export const META = { years: [...YEARS], grades: [...GRADES] }
