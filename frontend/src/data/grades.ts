import type { GradePeriod, GradeRecord, GradeType, GradeValue, StudentStatus, SubjectAverage } from '../types'
import { between, hashSeed, pick, rngFor, round1 } from '../utils/random'
import { STUDENTS, getAcademicYearStart, getCurrentAcademicYearStart } from './students'

export const SUBJECTS = [
  'Русский язык', 'Математика', 'Английский язык', 'Физика', 'Химия', 'История',
  'Обществознание', 'Биология', 'География', 'Информатика', 'Литература', 'Физкультура',
]

export const GRADE_TYPES: GradeType[] = [
  'Контрольная', 'Домашняя работа', 'Самостоятельная работа', 'Устный ответ',
]

export const GRADE_VALUES: GradeValue[] = [2, 3, 4, 5]

// ===================== Учебные годы и периоды =====================

export const academicYearLabel = (start: number) => `${start}/${start + 1}`

export const PERIOD_OPTIONS: { value: GradePeriod; label: string }[] = [
  { value: 'year', label: 'Весь учебный год' },
  { value: 'sem1', label: '1 семестр' },
  { value: 'sem2', label: '2 семестр' },
  { value: 'month', label: 'Месяц' },
  { value: 'all', label: 'Весь период обучения' },
]

const MONTH_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

/** Месяцы учебного года (сентябрь–май) в хронологическом порядке. */
function academicMonths(startYear: number): { y: number; m: number }[] {
  return [
    ...[9, 10, 11, 12].map((m) => ({ y: startYear, m })),
    ...[1, 2, 3, 4, 5].map((m) => ({ y: startYear + 1, m })),
  ]
}

/** Опции селекта «Месяц» внутри выбранного учебного года: Сентябрь 2023 … Май 2024. */
export function getAcademicMonthOptions(academicYear: string): { value: string; label: string }[] {
  const startYear = Number(academicYear.split('/')[0])
  return academicMonths(startYear).map(({ y, m }) => ({
    value: `${y}-${String(m).padStart(2, '0')}`,
    label: `${MONTH_RU[m - 1]} ${y}`,
  }))
}

/** Год поступления: из синтетических данных ученика либо детерминированный фолбэк. */
function getEnrollmentYear(studentId: string): number {
  const s = STUDENTS.find((x) => x.id === studentId)
  if (s) return s.enrollmentYear
  return getCurrentAcademicYearStart() - 2 - (hashSeed(`enroll:${studentId}`) % 3)
}

export interface StudentAcademicInfo {
  enrollmentYear: number
  status: StudentStatus
  exitDate: string | null
  exitReason: string | null
  /** Учебные годы: от года поступления до текущего (если обучается) либо до года выбытия. */
  years: string[]
}

/**
 * Учебные годы строятся по статусу ученика, а не по имеющимся оценкам:
 * активный — до текущего учебного года, выбывший — до учебного года exitDate.
 */
export function getStudentAcademicInfo(studentId: string): StudentAcademicInfo {
  const s = STUDENTS.find((x) => x.id === studentId)
  const enrollmentYear = getEnrollmentYear(studentId)
  const status = s?.status ?? 'active'
  const exitDate = s?.exitDate ?? null
  const endYear = status !== 'active' && exitDate
    ? getAcademicYearStart(exitDate)
    : getCurrentAcademicYearStart()
  const years: string[] = []
  for (let y = enrollmentYear; y <= endYear; y++) years.push(academicYearLabel(y))
  return { enrollmentYear, status, exitDate, exitReason: s?.exitReason ?? null, years }
}

/** Учебный год и семестр по дате: сентябрь–декабрь — 1-й семестр, январь–май — 2-й. */
export function academicInfoFor(dateIso: string): { academicYear: string; semester: 1 | 2 } {
  const [y, m] = dateIso.split('-').map(Number)
  if (m >= 9) return { academicYear: academicYearLabel(y), semester: 1 }
  return { academicYear: academicYearLabel(y - 1), semester: 2 }
}

export interface GradeFilter {
  academicYear: string
  period: GradePeriod
  month?: string // 'YYYY-MM', только при period === 'month'
}

export function filterGradesByPeriod(records: GradeRecord[], f: GradeFilter): GradeRecord[] {
  if (f.period === 'all') return records
  const inYear = records.filter((g) => g.academicYear === f.academicYear)
  if (f.period === 'sem1') return inYear.filter((g) => g.semester === 1)
  if (f.period === 'sem2') return inYear.filter((g) => g.semester === 2)
  if (f.period === 'month') return f.month ? inYear.filter((g) => g.date.startsWith(f.month!)) : inYear
  return inYear
}

// ===================== Базовая генерация =====================
// Оценки детерминированно генерируются от studentId за все учебные годы с момента
// поступления: общий уровень ученика (averageGrade из data/students) + стабильный
// сдвиг по предмету (сильная математика — слабая физика) + небольшой дрейф по годам.

function baseAverageFor(studentId: string): number {
  const s = STUDENTS.find((x) => x.id === studentId)
  if (s) return s.averageGrade
  return 3.3 + ((hashSeed(`avg:${studentId}`) % 1000) / 1000) * 1.4
}

function classIdFor(studentId: string): string {
  return STUDENTS.find((x) => x.id === studentId)?.classId ?? studentId.replace(/-\d+$/, '')
}

/** Учебная дата в месяце: день 2–26, суббота/воскресенье сдвигаются на понедельник. */
function schoolDate(y: number, m: number, rnd: () => number): string {
  let day = 2 + Math.floor(rnd() * 25)
  const dow = new Date(y, m - 1, day).getDay()
  if (dow === 0) day += 1
  else if (dow === 6) day += 2
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildBaseGrades(studentId: string): GradeRecord[] {
  const avg = baseAverageFor(studentId)
  const classId = classIdFor(studentId)
  const { enrollmentYear, exitDate, years } = getStudentAcademicInfo(studentId)
  const lastYearStart = enrollmentYear + years.length - 1
  // Оценок нет после выбытия и после сегодняшней даты.
  const todayIso = new Date().toISOString().slice(0, 10)
  const dateLimit = exitDate && exitDate < todayIso ? exitDate : todayIso
  const out: GradeRecord[] = []

  for (const subject of SUBJECTS) {
    // Сдвиг по предмету стабилен между годами — профиль «сильных» и «слабых» предметов.
    const subjectOffset = between(rngFor(`subj:${studentId}:${subject}`), -0.7, 0.7)

    for (let startYear = enrollmentYear; startYear <= lastYearStart; startYear++) {
      const rnd = rngFor(`grades:${studentId}:${subject}:${startYear}`)
      const target = Math.min(4.9, Math.max(2.7, avg + subjectOffset + between(rnd, -0.25, 0.25)))
      const yearLabel = academicYearLabel(startYear)

      for (const { y, m } of academicMonths(startYear)) {
        const count = 2 + Math.floor(rnd() * 2) // 2–3 оценки в месяц по предмету
        for (let i = 0; i < count; i++) {
          let grade = Math.round(target + between(rnd, -0.85, 0.85))
          if (rnd() < 0.05) grade -= 1 // редкая неудача — так появляются двойки
          grade = Math.min(5, Math.max(2, grade))
          const date = schoolDate(y, m, rnd)
          const type = pick(rnd, GRADE_TYPES)
          if (date > dateLimit) continue
          out.push({
            id: `base-${studentId}-${subject}-${y}-${m}-${i}`,
            studentId,
            classId,
            subject,
            date,
            grade: grade as GradeValue,
            type,
            academicYear: yearLabel,
            semester: m >= 9 ? 1 : 2,
          })
        }
      }
    }
  }
  return out
}

// ===================== Правки учителя (localStorage) =====================

const EDITS_KEY = 'ibs-grade-edits'

interface GradeEdits {
  added: GradeRecord[]
  updated: Record<string, Partial<GradeRecord>>
  deleted: string[]
}

function loadEdits(): GradeEdits {
  try {
    const raw = JSON.parse(localStorage.getItem(EDITS_KEY) ?? '{}') as Partial<GradeEdits>
    const added = raw.added ?? []
    // Миграция: у оценок, добавленных до появления учебных периодов, нет academicYear/semester.
    for (const g of added) if (!g.academicYear) Object.assign(g, academicInfoFor(g.date))
    return { added, updated: raw.updated ?? {}, deleted: raw.deleted ?? [] }
  } catch {
    return { added: [], updated: {}, deleted: [] }
  }
}

function saveEdits(edits: GradeEdits) {
  localStorage.setItem(EDITS_KEY, JSON.stringify(edits))
}

/** Все оценки ученика: база + правки учителя, по возрастанию даты. */
export function getStudentGrades(studentId: string): GradeRecord[] {
  const edits = loadEdits()
  const base = buildBaseGrades(studentId)
    .filter((g) => !edits.deleted.includes(g.id))
    .map((g) => (edits.updated[g.id] ? { ...g, ...edits.updated[g.id] } : g))
  const added = edits.added.filter((g) => g.studentId === studentId)
  return [...base, ...added].sort((a, b) => a.date.localeCompare(b.date) || a.subject.localeCompare(b.subject))
}

/** Учебный год и семестр вычисляются по дате автоматически. */
export function addGrade(data: Omit<GradeRecord, 'id' | 'academicYear' | 'semester'>): GradeRecord {
  const edits = loadEdits()
  const record: GradeRecord = {
    ...data,
    ...academicInfoFor(data.date),
    id: `add-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  }
  edits.added.push(record)
  saveEdits(edits)
  return record
}

export function updateGrade(id: string, patch: Partial<Pick<GradeRecord, 'subject' | 'date' | 'grade' | 'type'>>) {
  const full: Partial<GradeRecord> = patch.date ? { ...patch, ...academicInfoFor(patch.date) } : { ...patch }
  const edits = loadEdits()
  const added = edits.added.find((g) => g.id === id)
  if (added) Object.assign(added, full)
  else edits.updated[id] = { ...(edits.updated[id] ?? {}), ...full }
  saveEdits(edits)
}

export function deleteGrade(id: string) {
  const edits = loadEdits()
  if (edits.added.some((g) => g.id === id)) {
    edits.added = edits.added.filter((g) => g.id !== id)
  } else {
    edits.deleted.push(id)
    delete edits.updated[id]
  }
  saveEdits(edits)
}

// ===================== Агрегация =====================

/** Средний балл по предметам = среднее арифметическое оценок ученика (шкала 2–5). */
export function getAverageBySubject(records: GradeRecord[]): SubjectAverage[] {
  return SUBJECTS.flatMap((subject) => {
    const values = records.filter((g) => g.subject === subject).map((g) => g.grade)
    if (!values.length) return []
    return [{ subject, average: round1(values.reduce((sum, v) => sum + v, 0) / values.length) }]
  })
}
