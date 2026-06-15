import type {
  ExamBenchmark, ExamThreshold, StudentExamResult, StudentExamStatus, StudentExamType,
} from '../types'
import { between, hashSeed, rngFor, round1 } from '../utils/random'
import { academicYearLabel, getStudentAcademicInfo } from './grades'
import { STUDENTS, getCurrentAcademicYearStart } from './students'

export const STUDENT_EXAM_TYPES: StudentExamType[] = ['ЕГЭ', 'ОГЭ', 'ВПР', 'Внутренний экзамен']

// ===================== Справочник порогов (examThresholds) =====================
// ЕГЭ — тестовая шкала 0–100, пороги аттестата/вуза и вузов Минобрнауки.
// ОГЭ — первичные баллы и порог оценки «3» (рекомендации ФИПИ).
// ВПР и внутренние экзамены — демо-шкалы с явной пометкой «демо-данные».

const EGE_SOURCE = { sourceName: 'Рособрнадзор / приказ Минобрнауки', sourceYear: 2024 }
const OGE_SOURCE = { sourceName: 'ФИПИ, рекомендации по переводу баллов', sourceYear: 2024 }
const DEMO_SOURCE = { sourceName: 'демо-данные', sourceYear: 2026 }

// [минимум аттестат/сдача, минимум вуз, минимум вузов Минобрнауки]
const EGE_THRESHOLDS: Record<string, [number, number, number]> = {
  'Русский язык': [24, 36, 40],
  'Математика': [27, 27, 39],
  'Математика профильная': [27, 27, 39],
  'Математика базовая': [27, 27, 39],
  'Физика': [36, 36, 39],
  'Химия': [36, 36, 39],
  'Информатика': [40, 40, 44],
  'Биология': [36, 36, 39],
  'История': [32, 32, 35],
  'Обществознание': [42, 42, 45],
  'География': [37, 37, 40],
  'Литература': [32, 32, 40],
  'Английский язык': [22, 22, 30],
}

// [порог оценки «3» (первичный балл), максимальный первичный балл]
const OGE_THRESHOLDS: Record<string, [number, number]> = {
  'Русский язык': [15, 33],
  'Математика': [8, 31],
  'Физика': [11, 45],
  'Химия': [10, 40],
  'Информатика': [5, 19],
  'Биология': [13, 48],
  'История': [11, 37],
  'Обществознание': [14, 37],
  'География': [12, 31],
  'Литература': [16, 45],
  'Английский язык': [29, 68],
}

const VPR_SCALE: [number, number] = [11, 30] // [порог сдачи, максимум] — демо
// Внутренний экзамен: шкала и минимум задаются правилами школы.
const INTERNAL_SCALE: [number, number] = [20, 40] // [minSchoolScore, максимум]
const INTERNAL_SOURCE = { sourceName: 'Правила внутреннего экзамена школы', sourceYear: 2026 }

export const EGE_SUBJECTS = Object.keys(EGE_THRESHOLDS)
export const OGE_SUBJECTS = Object.keys(OGE_THRESHOLDS)
const VPR_SUBJECTS = ['Русский язык', 'Математика', 'Физика', 'Биология', 'История', 'Обществознание', 'География']
const INTERNAL_SUBJECTS = ['Русский язык', 'Математика', 'Физика', 'Химия', 'История', 'Информатика', 'Английский язык']

// ОГЭ по математике: модуль «геометрия» (демо-разбивка первичных баллов).
export const OGE_MATH_GEOMETRY_MAX = 12
const OGE_MATH_MIN_GEOMETRY = 2

const OGE_MATH_PROFILES = [
  { profile: 'Естественно-научный', minTotalScore: 18, minGeometryScore: 6 },
  { profile: 'Экономический', minTotalScore: 18, minGeometryScore: 5 },
  { profile: 'Физико-математический', minTotalScore: 19, minGeometryScore: 7 },
]

export function getExamThreshold(examType: StudentExamType, subject: string, year: number): ExamThreshold | null {
  const base = {
    examType, year, subject,
    minSchoolScore: null as number | null,
    minGeometryScore: null as number | null,
    minUniversityScore: null as number | null,
    minMinobrnaukiScore: null as number | null,
    profileThresholds: null as ExamThreshold['profileThresholds'],
    sourceUrl: null as string | null,
  }
  if (examType === 'ЕГЭ') {
    const t = EGE_THRESHOLDS[subject]
    if (!t) return null
    return {
      ...base,
      maxScore: 100, minTotalScore: t[0], minUniversityScore: t[1], minMinobrnaukiScore: t[2],
      ...EGE_SOURCE,
    }
  }
  if (examType === 'ОГЭ') {
    const t = OGE_THRESHOLDS[subject]
    if (!t) return null
    if (subject === 'Математика') {
      return {
        ...base,
        maxScore: t[1], minTotalScore: t[0],
        minGeometryScore: OGE_MATH_MIN_GEOMETRY,
        profileThresholds: OGE_MATH_PROFILES,
        sourceName: 'Справочник шкал ОГЭ (рекомендации ФИПИ)', sourceYear: 2024,
      }
    }
    return { ...base, maxScore: t[1], minTotalScore: t[0], ...OGE_SOURCE }
  }
  if (examType === 'Внутренний экзамен') {
    const [minSchool, max] = INTERNAL_SCALE
    return { ...base, maxScore: max, minTotalScore: minSchool, minSchoolScore: minSchool, ...INTERNAL_SOURCE }
  }
  const [min, max] = VPR_SCALE
  return { ...base, maxScore: max, minTotalScore: min, ...DEMO_SOURCE }
}

/** Перевод первичного балла ОГЭ в школьную оценку (примерная демо-шкала на основе рекомендаций ФИПИ). */
export function ogeGradeFromScore(subject: string, score: number): 2 | 3 | 4 | 5 {
  const t = OGE_THRESHOLDS[subject]
  if (!t) return 3
  const [min, max] = t
  if (score < min) return 2
  if (score >= min + (max - min) * 0.6) return 5
  if (score >= min + (max - min) * 0.3) return 4
  return 3
}

// ===================== Справочник средних (examBenchmarks) =====================
// Средние по стране для ЕГЭ — публикуемые значения; всё остальное — «демо-данные».
// Средний по школе здесь всегда null: он считается по результатам учеников.

const EGE_COUNTRY_AVG: Record<string, number> = {
  'Русский язык': 64, 'Математика': 62, 'Математика профильная': 62, 'Математика базовая': 62,
  'Физика': 63, 'Химия': 56, 'Информатика': 55,
  'Биология': 54, 'История': 56, 'Обществознание': 55, 'География': 55, 'Литература': 64,
  'Английский язык': 63,
}

export function getExamBenchmark(examType: StudentExamType, subject: string, year: number): ExamBenchmark | null {
  // Внутренний экзамен проводится внутри школы — городской и федеральной статистики для него нет.
  if (examType === 'Внутренний экзамен') return null

  // Небольшой стабильный сдвиг по годам и предметам для демо-значений.
  const drift = (key: string, spread: number) => ((hashSeed(key) % 1000) / 1000 - 0.5) * 2 * spread

  if (examType === 'ЕГЭ') {
    const country = EGE_COUNTRY_AVG[subject]
    if (!country) return null
    const isRealYear = year === 2024
    return {
      examType, year, subject,
      schoolAverage: null,
      cityAverage: round1(country + 1.5 + drift(`city:ЕГЭ:${subject}:${year}`, 3)),
      countryAverage: isRealYear ? country : round1(country + drift(`country:ЕГЭ:${subject}:${year}`, 2.5)),
      sourceName: isRealYear ? 'Рособрнадзор (средние тестовые баллы)' : 'демо-данные (на основе Рособрнадзор, 2024)',
      sourceYear: 2024,
    }
  }
  const t = getExamThreshold(examType, subject, year)
  if (!t) return null
  const span = t.maxScore - t.minTotalScore
  return {
    examType, year, subject,
    schoolAverage: null,
    cityAverage: round1(t.minTotalScore + span * 0.52 + drift(`city:${examType}:${subject}:${year}`, span * 0.06)),
    countryAverage: round1(t.minTotalScore + span * 0.48 + drift(`country:${examType}:${subject}:${year}`, span * 0.06)),
    ...DEMO_SOURCE,
  }
}

// ===================== Генерация результатов (studentExamResults) =====================
// Детерминированно от studentId. Расписание по классам:
// ОГЭ — конец 9-го класса, ЕГЭ — конец 11-го, ВПР — ежегодно в 4–8 классах,
// внутренний экзамен — каждый декабрь. Результатов нет после выбытия и в будущем.

function pickSome<T>(rnd: () => number, items: T[], count: number): T[] {
  const pool = [...items]
  const out: T[] = []
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
  return out
}

function studentById(studentId: string) {
  return STUDENTS.find((x) => x.id === studentId)
}

function mathSubjectFor(studentId: string): string {
  const rnd = rngFor(`ege-math:${studentId}`)
  const s = studentById(studentId)
  const technicalTilt = abilityFor(studentId, 'Математика') >= ((s?.averageGrade ?? 3.5) - 2.7) / 2.2
  return technicalTilt || rnd() > 0.35 ? 'Математика профильная' : 'Математика базовая'
}

function getProfileEgePool(studentId: string): string[] {
  const rnd = rngFor(`ege-pool:${studentId}`)
  const stem = ['Информатика', 'Физика', 'Химия']
  const humanities = ['Обществознание', 'История', 'Литература', 'Английский язык']
  const natural = ['Биология', 'География', 'Химия']
  if (abilityFor(studentId, 'Математика') > abilityFor(studentId, 'Русский язык') + 0.08) return stem
  if (rnd() > 0.55) return humanities
  return natural
}

export function assignEgeSubjects(studentId: string): string[] {
  const s = studentById(studentId)
  if (!s || s.grade !== 11) return []
  const rnd = rngFor(`ege-assignment:${studentId}`)
  const subjectCount = s.hasVserosBenefit ? 2 : 3 + Math.floor(rnd() * 2)
  const required = ['Русский язык', mathSubjectFor(studentId)]
  const pool = getProfileEgePool(studentId).filter((subject) => !required.includes(subject))
  return [...required, ...pickSome(rnd, pool, Math.max(0, subjectCount - required.length))]
}

export function assignOgeSubjects(studentId: string): string[] {
  const s = studentById(studentId)
  if (!s || s.grade !== 9) return []
  const rnd = rngFor(`oge-assignment:${studentId}`)
  return ['Русский язык', 'Математика', ...pickSome(rnd, OGE_SUBJECTS.slice(2), 2)]
}

export function getAssignedExamSubjects(studentId: string, examType: StudentExamType, academicYear?: string): string[] {
  const currentYear = academicYearLabel(getCurrentAcademicYearStart())
  if (academicYear && academicYear !== currentYear) return []
  if (examType === 'ЕГЭ') return assignEgeSubjects(studentId)
  if (examType === 'ОГЭ') return assignOgeSubjects(studentId)
  return []
}

function abilityFor(studentId: string, subject: string): number {
  const s = studentById(studentId)
  const avg = s?.averageGrade ?? 3.3 + ((hashSeed(`avg:${studentId}`) % 1000) / 1000) * 1.4
  // Тот же предметный сдвиг, что и в журнале оценок, — профиль ученика согласован.
  const offset = between(rngFor(`subj:${studentId}:${subject}`), -0.7, 0.7)
  const target = Math.min(4.9, Math.max(2.7, avg + offset))
  return (target - 2.7) / 2.2 // 0..1
}

function gradeLevelFor(studentId: string): number {
  const s = studentById(studentId)
  return s?.grade ?? 9
}

type RawExam = Omit<StudentExamResult, 'status'>

function buildRawExams(studentId: string): RawExam[] {
  const { enrollmentYear, exitDate, years } = getStudentAcademicInfo(studentId)
  const lastYearStart = enrollmentYear + years.length - 1
  const currentStart = getCurrentAcademicYearStart()
  const currentGrade = gradeLevelFor(studentId)
  const classId = studentById(studentId)?.classId ?? studentId.replace(/-\d+$/, '')
  const todayIso = new Date().toISOString().slice(0, 10)
  const dateLimit = exitDate && exitDate < todayIso ? exitDate : todayIso
  const out: RawExam[] = []

  const push = (examType: StudentExamType, subject: string, examDate: string, yearStart: number, rnd: () => number) => {
    if (examDate > dateLimit) return
    const t = getExamThreshold(examType, subject, Number(examDate.slice(0, 4)))
    if (!t) return
    const ability = abilityFor(studentId, subject)
    const low = examType === 'ЕГЭ' ? 18 : t.maxScore * 0.25
    const score = Math.max(0, Math.min(t.maxScore,
      Math.round(low + ability * (t.maxScore - low) + between(rnd, -0.08, 0.08) * t.maxScore)))

    // ОГЭ по математике: разбивка первичного балла на алгебру и геометрию.
    let algebraScore: number | null = null
    let geometryScore: number | null = null
    if (examType === 'ОГЭ' && subject === 'Математика') {
      const geometryShare = OGE_MATH_GEOMETRY_MAX / t.maxScore
      geometryScore = Math.max(0, Math.min(OGE_MATH_GEOMETRY_MAX, score,
        Math.round(score * geometryShare + between(rnd, -1.5, 1.5))))
      algebraScore = score - geometryScore
    }

    out.push({
      id: `exam-${studentId}-${examType}-${subject}-${examDate}`,
      studentId, classId,
      academicYear: academicYearLabel(yearStart),
      examType, subject, examDate,
      score, maxScore: t.maxScore,
      algebraScore, geometryScore,
    })
  }

  for (let y = enrollmentYear; y <= lastYearStart; y++) {
    const gradeInYear = currentGrade - (currentStart - y)
    if (gradeInYear < 1) continue
    const rnd = rngFor(`exams:${studentId}:${y}`)

    // Внутренний экзамен — каждый декабрь начиная с 5-го класса, 1–2 предмета.
    if (gradeInYear >= 5) {
      for (const subject of pickSome(rnd, INTERNAL_SUBJECTS, 1 + Math.floor(rnd() * 2))) {
        push('Внутренний экзамен', subject, `${y}-12-${15 + Math.floor(rnd() * 7)}`, y, rnd)
      }
    }
    // ВПР — апрель, 4–8 классы.
    if (gradeInYear >= 4 && gradeInYear <= 8) {
      for (const subject of ['Русский язык', 'Математика', ...pickSome(rnd, VPR_SUBJECTS.slice(2), 1)]) {
        push('ВПР', subject, `${y + 1}-04-${10 + Math.floor(rnd() * 12)}`, y, rnd)
      }
    }
    // ОГЭ — конец 9-го класса: русский, математика + 2 предмета по выбору.
    if (gradeInYear === 9) {
      for (const subject of assignOgeSubjects(studentId)) {
        push('ОГЭ', subject, `${y + 1}-05-${20 + Math.floor(rnd() * 9)}`, y, rnd)
      }
    }
    // ЕГЭ — только выпускной 11-й класс: 2 предмета при льготе ВсОШ, иначе 3–4.
    if (gradeInYear === 11) {
      for (const subject of assignEgeSubjects(studentId)) {
        push('ЕГЭ', subject, `${y + 1}-06-0${1 + Math.floor(rnd() * 9)}`, y, rnd)
      }
    }
  }
  return out.sort((a, b) => a.examDate.localeCompare(b.examDate))
}

// ===================== Средний балл школы =====================
// Не задаётся вручную: агрегируется по результатам всех учеников
// за (тип экзамена, предмет, календарный год экзамена).

let schoolAggregates: Map<string, { sum: number; count: number }> | null = null

function aggKey(examType: StudentExamType, subject: string, year: number) {
  return `${examType}|${subject}|${year}`
}

function getSchoolAggregates(): Map<string, { sum: number; count: number }> {
  if (!schoolAggregates) {
    schoolAggregates = new Map()
    for (const s of STUDENTS) {
      for (const r of buildRawExams(s.id)) {
        const key = aggKey(r.examType, r.subject, Number(r.examDate.slice(0, 4)))
        const agg = schoolAggregates.get(key) ?? { sum: 0, count: 0 }
        agg.sum += r.score
        agg.count += 1
        schoolAggregates.set(key, agg)
      }
    }
  }
  return schoolAggregates
}

export function getSchoolAverage(examType: StudentExamType, subject: string, year: number): number | null {
  const agg = getSchoolAggregates().get(aggKey(examType, subject, year))
  return agg && agg.count > 0 ? round1(agg.sum / agg.count) : null
}

/** Динамика среднего балла школы по предмету и типу экзамена за годы, где есть результаты. */
export function getSchoolAverageByYears(examType: StudentExamType, subject: string): { year: number; average: number }[] {
  const out: { year: number; average: number }[] = []
  const currentYear = getCurrentAcademicYearStart() + 1
  for (let year = currentYear - 8; year <= currentYear; year++) {
    const avg = getSchoolAverage(examType, subject, year)
    if (avg != null) out.push({ year, average: avg })
  }
  return out
}

// ===================== Обогащённые строки для таблицы =====================

export interface StudentExamRow extends StudentExamResult {
  threshold: ExamThreshold | null
  benchmark: ExamBenchmark | null
  schoolAverage: number | null
}

function computeStatus(row: Omit<StudentExamRow, 'status'>): StudentExamStatus {
  // Внутренний экзамен: «не сдал» только если школа задала минимум (minSchoolScore).
  const min = row.examType === 'Внутренний экзамен' ? row.threshold?.minSchoolScore : row.threshold?.minTotalScore
  if (min != null && row.score < min) return 'Не сдал'
  // ОГЭ по математике: сдан только если набран и минимум по модулю «геометрия».
  const minGeometry = row.threshold?.minGeometryScore
  if (minGeometry != null && row.geometryScore != null && row.geometryScore < minGeometry) return 'Не сдал'
  const country = row.benchmark?.countryAverage
  if (country != null && row.score > country) return 'Выше среднего по стране'
  const city = row.benchmark?.cityAverage
  if (city != null && row.score > city) return 'Выше среднего по городу'
  if (row.schoolAverage != null && row.score > row.schoolAverage) return 'Выше среднего по школе'
  return 'Сдал'
}

export function getStudentExamRows(studentId: string): StudentExamRow[] {
  return buildRawExams(studentId).map((r) => {
    const year = Number(r.examDate.slice(0, 4))
    const partial = {
      ...r,
      threshold: getExamThreshold(r.examType, r.subject, year),
      benchmark: getExamBenchmark(r.examType, r.subject, year),
      schoolAverage: getSchoolAverage(r.examType, r.subject, year),
    }
    return { ...partial, status: computeStatus(partial) }
  })
}
