import type { GradeRecord, GradeType, GradeValue, SubjectAverage } from '../types'
import { between, hashSeed, pick, rngFor, round1 } from '../utils/random'
import { MAY_ISO, SCHOOL_DAYS_MAY } from './attendance'
import { STUDENTS } from './students'

export const SUBJECTS = [
  'Русский язык', 'Математика', 'Английский язык', 'Физика', 'Химия', 'История',
  'Обществознание', 'Биология', 'География', 'Информатика', 'Литература', 'Физкультура',
]

export const GRADE_TYPES: GradeType[] = [
  'Контрольная', 'Домашняя работа', 'Самостоятельная работа', 'Устный ответ',
]

export const GRADE_VALUES: GradeValue[] = [2, 3, 4, 5]

// ===================== Базовая генерация =====================
// Оценки детерминированно генерируются от studentId: у каждого ученика свой
// общий уровень (averageGrade из data/students), а по предметам — свой сдвиг,
// поэтому у одного ученика может быть сильная математика и слабая физика.

function baseAverageFor(studentId: string): number {
  const s = STUDENTS.find((x) => x.id === studentId)
  if (s) return s.averageGrade
  return 3.3 + ((hashSeed(`avg:${studentId}`) % 1000) / 1000) * 1.4
}

function classIdFor(studentId: string): string {
  return STUDENTS.find((x) => x.id === studentId)?.classId ?? studentId.replace(/-\d+$/, '')
}

function pickDays(rnd: () => number, count: number): number[] {
  const pool = [...SCHOOL_DAYS_MAY]
  const out: number[] = []
  while (out.length < count && pool.length) {
    out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
  }
  return out.sort((a, b) => a - b)
}

function buildBaseGrades(studentId: string): GradeRecord[] {
  const avg = baseAverageFor(studentId)
  const classId = classIdFor(studentId)
  const out: GradeRecord[] = []

  for (const subject of SUBJECTS) {
    const rnd = rngFor(`grades:${studentId}:${subject}`)
    // Уровень по предмету: общий уровень ученика ± предметный сдвиг.
    const target = Math.min(4.9, Math.max(2.7, avg + between(rnd, -0.7, 0.7)))
    const count = 5 + Math.floor(rnd() * 4) // 5–8 оценок за месяц

    for (const day of pickDays(rnd, count)) {
      let grade = Math.round(target + between(rnd, -0.85, 0.85))
      if (rnd() < 0.05) grade -= 1 // редкая неудача — так появляются двойки
      grade = Math.min(5, Math.max(2, grade))
      out.push({
        id: `base-${studentId}-${subject}-${day}`,
        studentId,
        classId,
        subject,
        date: MAY_ISO(day),
        grade: grade as GradeValue,
        type: pick(rnd, GRADE_TYPES),
      })
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
    return { added: raw.added ?? [], updated: raw.updated ?? {}, deleted: raw.deleted ?? [] }
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

export function addGrade(data: Omit<GradeRecord, 'id'>): GradeRecord {
  const edits = loadEdits()
  const record: GradeRecord = { ...data, id: `add-${Date.now()}-${Math.floor(Math.random() * 1e6)}` }
  edits.added.push(record)
  saveEdits(edits)
  return record
}

export function updateGrade(id: string, patch: Partial<Pick<GradeRecord, 'subject' | 'date' | 'grade' | 'type'>>) {
  const edits = loadEdits()
  const added = edits.added.find((g) => g.id === id)
  if (added) Object.assign(added, patch)
  else edits.updated[id] = { ...(edits.updated[id] ?? {}), ...patch }
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
