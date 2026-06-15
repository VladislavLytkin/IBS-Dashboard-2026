// ============================================================
// Синтетическая посещаемость по учебным периодам.
//
// Заменяет старую жёсткую привязку к «Май 2024»: данные генерируются по всем
// учебным годам ученика, по учебным дням (пн–пт, сентябрь–май), с полями
// город / учебный год / семестр.
//
// Логика статусов (по ТЗ):
//   Присутствовал = status === 'present'
//   Отсутствовал  = status === 'absent'
//   Прогул        = status === 'absent' && absenceType === 'unexcused'
// ============================================================

import { hashSeed, pick, rngFor } from '../utils/random'
import { STUDENTS } from './students'
import { academicYearLabel, getStudentAcademicInfo } from './grades'
import { cityForStudent, type City } from './cities'

/** Одна запись посещаемости — один ученик, один учебный день. */
export interface AttendanceRecordRow {
  date: string                 // ISO, напр. "2026-03-12"
  city: City
  academicYear: string         // напр. "2025/2026"
  semester: 1 | 2
  studentId: string
  studentName: string
  classId: string              // имя класса, напр. "10А"
  status: 'present' | 'absent'
  absenceType: 'excused' | 'unexcused' | null
}

export interface AttendanceStats {
  totalDays: number
  present: number
  absent: number
  truancy: number // прогулы — отсутствия без уважительной причины
}

/** Точка графика динамики: количество дней каждого статуса за период (месяц). */
export interface AttendanceTrendBar {
  label: string       // короткая подпись месяца, напр. "Мар"
  fullLabel: string   // полная подпись для tooltip, напр. "Март 2026"
  present: number
  absent: number
  truancy: number
}

const MONTH_FULL = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const MONTH_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

const pad = (n: number) => String(n).padStart(2, '0')

/** Месяцы учебного года в хронологическом порядке: сентябрь–май. */
function academicMonths(startYear: number): { y: number; m: number }[] {
  return [
    ...[9, 10, 11, 12].map((m) => ({ y: startYear, m })),
    ...[1, 2, 3, 4, 5].map((m) => ({ y: startYear + 1, m })),
  ]
}

/** Учебные дни месяца (пн–пт), выходные исключены. */
function schoolDaysOfMonth(year: number, month: number): string[] {
  const days = new Date(year, month, 0).getDate()
  const out: string[] = []
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow === 0 || dow === 6) continue
    out.push(`${year}-${pad(month)}-${pad(d)}`)
  }
  return out
}

const EXCUSED_REASONS = ['Болезнь', 'Справка от врача', 'Семейные обстоятельства', 'Соревнования']

function attendanceRateFor(studentId: string): number {
  const s = STUDENTS.find((x) => x.id === studentId)
  if (s) return s.attendanceRate
  return 84 + ((hashSeed(`att-rate:${studentId}`) % 1000) / 1000) * 13
}

const cache = new Map<string, AttendanceRecordRow[]>()

/**
 * Полный набор записей посещаемости ученика за все его учебные годы.
 * Детерминированно от studentId; кешируется.
 */
export function getStudentAttendance(studentId: string): AttendanceRecordRow[] {
  const cached = cache.get(studentId)
  if (cached) return cached

  const s = STUDENTS.find((x) => x.id === studentId)
  const studentName = s?.fullName ?? 'Ученик'
  const classId = s?.classId ?? studentId.replace(/-\d+$/, '')
  const city = cityForStudent(studentId)
  const rate = attendanceRateFor(studentId)

  const { enrollmentYear, exitDate, years } = getStudentAcademicInfo(studentId)
  const lastYearStart = enrollmentYear + years.length - 1
  const todayIso = new Date().toISOString().slice(0, 10)
  const dateLimit = exitDate && exitDate < todayIso ? exitDate : todayIso

  const out: AttendanceRecordRow[] = []
  for (let startYear = enrollmentYear; startYear <= lastYearStart; startYear++) {
    const academicYear = academicYearLabel(startYear)
    for (const { y, m } of academicMonths(startYear)) {
      const semester: 1 | 2 = m >= 9 ? 1 : 2
      for (const date of schoolDaysOfMonth(y, m)) {
        if (date > dateLimit) continue
        const rnd = rngFor(`att2:${studentId}:${date}`)
        const present = rnd() * 100 < Math.min(98, rate)
        const absenceType = present ? null : rnd() < 0.62 ? 'excused' : 'unexcused'
        out.push({
          date, city, academicYear, semester, studentId, studentName, classId,
          status: present ? 'present' : 'absent',
          absenceType,
        })
      }
    }
  }
  cache.set(studentId, out)
  return out
}

/** Записи группы учеников (для агрегированной статистики класса/города). */
export function getAttendanceForStudents(studentIds: string[]): AttendanceRecordRow[] {
  return studentIds.flatMap((id) => getStudentAttendance(id))
}

export interface AttendanceFilter {
  academicYear?: string
  semester?: 1 | 2 | 'all'
}

/** Фильтрация записей по учебному году и семестру. */
export function filterAttendance(rows: AttendanceRecordRow[], f: AttendanceFilter): AttendanceRecordRow[] {
  return rows.filter((r) =>
    (!f.academicYear || r.academicYear === f.academicYear)
    && (!f.semester || f.semester === 'all' || r.semester === f.semester))
}

/** Сводка в учебных днях. */
export function calculateAttendanceStats(rows: AttendanceRecordRow[]): AttendanceStats {
  let present = 0, absent = 0, truancy = 0
  for (const r of rows) {
    if (r.status === 'present') present++
    else {
      absent++
      if (r.absenceType === 'unexcused') truancy++
    }
  }
  return { totalDays: rows.length, present, absent, truancy }
}

/** Динамика по месяцам: количество дней каждого статуса. */
export function calculateMonthlyTrend(rows: AttendanceRecordRow[]): AttendanceTrendBar[] {
  const byMonth = new Map<string, AttendanceTrendBar>()
  for (const r of rows) {
    const [y, m] = r.date.split('-').map(Number)
    const key = `${y}-${pad(m)}`
    let bar = byMonth.get(key)
    if (!bar) {
      bar = { label: MONTH_SHORT[m - 1], fullLabel: `${MONTH_FULL[m - 1]} ${y}`, present: 0, absent: 0, truancy: 0 }
      byMonth.set(key, bar)
    }
    if (r.status === 'present') bar.present++
    else {
      bar.absent++
      if (r.absenceType === 'unexcused') bar.truancy++
    }
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

export interface AttendanceAbsenceDetail {
  date: string
  subject: string
  lessons: string
  reason: string
}

const ABSENCE_SUBJECTS = [
  'Математика', 'Русский язык', 'Физика', 'Химия', 'История',
  'Английский язык', 'Информатика', 'География', 'Биология', 'Литература',
]

const formatRu = (iso: string) => iso.split('-').reverse().join('.')

/** Детализация пропусков: уважительные отдельно от прогулов. */
export function getAbsenceDetailsFromRows(rows: AttendanceRecordRow[]): {
  excused: AttendanceAbsenceDetail[]
  truancy: AttendanceAbsenceDetail[]
} {
  const excused: AttendanceAbsenceDetail[] = []
  const truancy: AttendanceAbsenceDetail[] = []
  for (const r of rows) {
    if (r.status !== 'absent') continue
    const rnd = rngFor(`att2-detail:${r.studentId}:${r.date}`)
    const detail: AttendanceAbsenceDetail = {
      date: formatRu(r.date),
      subject: pick(rnd, ABSENCE_SUBJECTS),
      lessons: String(1 + Math.floor(rnd() * 6)),
      reason: r.absenceType === 'unexcused' ? 'Без уважительной причины' : pick(rnd, EXCUSED_REASONS),
    }
    if (r.absenceType === 'unexcused') truancy.push(detail)
    else excused.push(detail)
  }
  return { excused, truancy }
}

/** Учебные годы, встречающиеся в наборе записей (по убыванию — свежие сверху). */
export function academicYearsOf(rows: AttendanceRecordRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.academicYear))).sort((a, b) => b.localeCompare(a))
}
