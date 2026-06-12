import type {
  AbsenceDetail,
  AttendanceDay,
  AttendanceMark,
  AttendanceSummary,
  AttendanceTrendPoint,
} from '../types'
import { hashSeed, pick, rngFor } from '../utils/random'
import { STUDENTS } from './students'

export const ATTENDANCE_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Русские подписи статусов — на интерфейсе только они, не present/absent/truancy. */
export const ATTENDANCE_LABELS: Record<Exclude<AttendanceMark, 'weekend'>, string> = {
  present: 'Присутствие',
  absent: 'Отсутствие',
  truancy: 'Прогулы',
}

// Май 2024: 1 мая — среда; выходные — сб/вс.
const WEEKENDS = new Set([4, 5, 11, 12, 18, 19, 25, 26])

/** Учебные дни мая (используются и генератором оценок). */
export const SCHOOL_DAYS_MAY: number[] = Array.from({ length: 31 }, (_, i) => i + 1)
  .filter((d) => !WEEKENDS.has(d))

export const MAY_ISO = (day: number) => `2024-05-${String(day).padStart(2, '0')}`
export const MAY_LABEL = (day: number) => `${day} мая`

// ===================== База + правки учителя =====================
// Базовые статусы генерируются детерминированно от studentId, правки учителя
// хранятся поверх в localStorage (по конвенции ibs-*).

const EDITS_KEY = 'ibs-attendance-edits'

type AttendanceEdits = Record<string, Record<number, Exclude<AttendanceMark, 'weekend'>>>

function loadEdits(): AttendanceEdits {
  try {
    return JSON.parse(localStorage.getItem(EDITS_KEY) ?? '{}') as AttendanceEdits
  } catch {
    return {}
  }
}

function attendanceRateFor(studentId: string): number {
  const s = STUDENTS.find((x) => x.id === studentId)
  if (s) return s.attendanceRate
  return 84 + ((hashSeed(`att-rate:${studentId}`) % 1000) / 1000) * 13
}

function baseMark(studentId: string, day: number): Exclude<AttendanceMark, 'weekend'> {
  const rnd = rngFor(`att:${studentId}:${day}`)
  const rate = attendanceRateFor(studentId)
  if (rnd() * 100 < Math.min(97, rate)) return 'present'
  return rnd() < 0.62 ? 'absent' : 'truancy'
}

/** Статусы ученика по учебным дням мая (база + правки учителя). */
export function getStudentMarks(studentId: string): Record<number, Exclude<AttendanceMark, 'weekend'>> {
  const edits = loadEdits()[studentId] ?? {}
  const out: Record<number, Exclude<AttendanceMark, 'weekend'>> = {}
  for (const day of SCHOOL_DAYS_MAY) out[day] = edits[day] ?? baseMark(studentId, day)
  return out
}

export function setAttendanceMark(studentId: string, day: number, mark: Exclude<AttendanceMark, 'weekend'>) {
  const edits = loadEdits()
  edits[studentId] = { ...(edits[studentId] ?? {}), [day]: mark }
  localStorage.setItem(EDITS_KEY, JSON.stringify(edits))
}

// ===================== Производные представления =====================

/** Календарная сетка мая 2024 (пн 29 апр — вс 2 июн) для выбранного ученика. */
export function getStudentCalendar(studentId: string): AttendanceDay[] {
  const marks = getStudentMarks(studentId)
  const cells: AttendanceDay[] = [
    { day: 29, mark: 'weekend', outside: true },
    { day: 30, mark: 'weekend', outside: true },
  ]
  for (let day = 1; day <= 31; day++) {
    cells.push({ day, mark: WEEKENDS.has(day) ? 'weekend' : marks[day] })
  }
  cells.push({ day: 1, mark: 'weekend', outside: true }, { day: 2, mark: 'weekend', outside: true })
  return cells
}

/** Сводка по ученику в учебных днях. */
export function getStudentSummary(studentId: string): AttendanceSummary {
  const marks = Object.values(getStudentMarks(studentId))
  return {
    totalDays: marks.length,
    present: marks.filter((m) => m === 'present').length,
    absent: marks.filter((m) => m === 'absent').length,
    truancy: marks.filter((m) => m === 'truancy').length,
  }
}

/** Динамика по классу: доля статусов среди учеников класса на каждый учебный день. */
export function getClassTrend(studentIds: string[]): AttendanceTrendPoint[] {
  if (!studentIds.length) return []
  const perStudent = studentIds.map((id) => getStudentMarks(id))
  return SCHOOL_DAYS_MAY.map((day) => {
    const marks = perStudent.map((m) => m[day])
    const pct = (k: AttendanceMark) => Math.round((marks.filter((m) => m === k).length / marks.length) * 100)
    return { label: MAY_LABEL(day), present: pct('present'), absent: pct('absent'), truancy: pct('truancy') }
  })
}

// ===================== Детализация пропусков =====================

const EXCUSED_REASONS = ['Болезнь', 'Справка от врача', 'Семейные обстоятельства', 'Соревнования']
const ABSENCE_SUBJECTS = [
  'Математика', 'Русский язык', 'Физика', 'Химия', 'История',
  'Английский язык', 'Информатика', 'География', 'Биология', 'Литература',
]

export function getAbsenceDetails(studentId: string): { excused: AbsenceDetail[]; truancy: AbsenceDetail[] } {
  const marks = getStudentMarks(studentId)
  const excused: AbsenceDetail[] = []
  const truancy: AbsenceDetail[] = []
  for (const day of SCHOOL_DAYS_MAY) {
    if (marks[day] === 'present') continue
    const rnd = rngFor(`att-detail:${studentId}:${day}`)
    const date = `${String(day).padStart(2, '0')}.05.2024`
    const lesson = 1 + Math.floor(rnd() * 6)
    const subject = pick(rnd, ABSENCE_SUBJECTS)
    if (marks[day] === 'absent') {
      excused.push({ date, lessons: String(lesson), subject, reason: pick(rnd, EXCUSED_REASONS) })
    } else {
      truancy.push({ date, lessons: String(lesson), subject, reason: 'Без уважительной причины' })
    }
  }
  return { excused, truancy }
}
