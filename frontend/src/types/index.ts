// Shared domain types for the IBS school dashboard.
// Mock data in src/data is typed against these so it can later be swapped for an API.

export type Trend = 'up' | 'down' | 'flat'

export type RiskLevel = 'низкий' | 'средний' | 'высокий'

/** One class row in the parallel rating table (Главный экран). */
export interface ClassRating {
  place: number
  className: string
  grade: number // параллель 5–11
  score: number // итоговый балл из 100
  trend: Trend
  studentsCount: number
  riskLevel: RiskLevel
}

/** A student belonging to a class. */
export interface Student {
  id: string
  fullName: string
  className: string
}

/** Per-subject average for the grades bar chart. */
export interface SubjectAverage {
  subject: string
  average: number // по 10-балльной шкале (как на дизайне)
}

/** One subject row in the term grades table (по неделям). */
export interface SubjectGradeRow {
  subject: string
  weeks: (number | null)[] // null = нет оценки (—)
  final: number
}

export type OlympiadLevel = 'Школьная' | 'Городская' | 'Всероссийская'

export interface OlympiadRecord {
  id: number
  student: string
  className: string
  level: OlympiadLevel
  title: string
  subject: string
  award: string
  awardKind: 'gold' | 'silver' | 'bronze'
  date: string
}

/** Волонтёрское мероприятие. */
export interface VolunteerEvent {
  title: string
  date: string
  hours: number
}

/** Часы волонтёрства по ученику. */
export interface VolunteerStudentHours {
  student: string
  className: string
  month: number
  year: number
}

export interface MonthlyPoint {
  label: string
  value: number
}

/** Сводная статистика посещаемости за месяц. */
export interface AttendanceSummary {
  totalLessons: number
  present: number
  absent: number
  truancy: number
}

export type AttendanceMark = 'present' | 'absent' | 'truancy' | 'weekend'

export interface AttendanceDay {
  day: number
  mark: AttendanceMark
  outside?: boolean // день не из текущего месяца (для сетки календаря)
}

export interface AttendanceTrendPoint {
  label: string
  present: number
  absent: number
  truancy: number
}

export interface AbsenceDetail {
  date: string
  lessons: string
  subject: string
  reason: string
}

/** Сравнение результатов экзамена: школа / город / регион. */
export interface ExamComparePoint {
  period: string
  school: number
  city: number
  region: number
}

export interface ExamCriterion {
  name: string
  school: number
  city: number
  region: number
}

export interface ExamBelowThreshold {
  fullName: string
  className: string
  primaryScore: number
  testScore: number
}

export interface ExamDynamicPoint {
  label: string
  current: number
  previous: number | null
}

/** Итоговый рейтинг ученика с разбивкой по компонентам. */
export interface StudentRatingRow {
  place: number
  fullName: string
  className: string
  total: number
  grades: number // из 40
  olympiads: number // из 30
  volunteering: number // из 10
  attendance: number // из 20
}

export interface RatingDistribution {
  label: string
  range: string
  percent: number
  count: number
  color: string
}
