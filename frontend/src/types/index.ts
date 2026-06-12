// Shared domain types for the IBS school dashboard.
// Mock data in src/data is typed against these so it can later be swapped for an API.

// ===================== Базовые =====================
export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
export const GRADE_LEVELS: GradeLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

/** Значение фильтра по параллели: конкретная параллель или «Все». */
export type ParallelFilterValue = GradeLevel | 'all'

export type TrendDirection = 'up' | 'down' | 'stable'

export type RiskLevel = 'низкий' | 'средний' | 'высокий'

// ===================== Классы и ученики =====================
export interface ClassInfo {
  id: string // совпадает с name, напр. "7Б"
  name: string
  grade: GradeLevel
  studentCount: number
  academicScore: number // 0..100
  olympiadScore: number // 0..100
  attendanceScore: number // 0..100
  activityScore: number // 0..100
  riskScore: number // 0..100 (выше — хуже)
  finalScore: number // 0..100 (рассчитан в utils/scoring)
  weeklyDelta: number // изменение балла за неделю
  trend: TrendDirection
}

export interface Student {
  id: string
  fullName: string
  classId: string
  grade: GradeLevel
  averageGrade: number // средний балл (по 5-балльной шкале)
  attendanceRate: number // % присутствия
  olympiadParticipation: boolean
  olympiadAwards: number // число призовых мест/дипломов
  activityScore: number // 0..100
  riskScore: number // 0..100
  riskLevel: RiskLevel
  riskReasons: string[]
}

// ===================== Экзамены (ЕГЭ/ОГЭ) =====================
export type ExamSubject =
  | 'Русский язык'
  | 'Математика профильная'
  | 'Математика базовая'
  | 'Информатика'
  | 'Физика'
  | 'Химия'
  | 'Биология'
  | 'Обществознание'
  | 'История'
  | 'География'
  | 'Литература'
  | 'Английский язык'

export interface ExamComparisonResult {
  subject: ExamSubject
  school: number // % от максимального балла
  city: number
  region: number
}

// ===================== Олимпиады =====================
export type OlympiadSubject =
  | 'Математика'
  | 'Информатика'
  | 'Физика'
  | 'Химия'
  | 'Биология'
  | 'Обществознание'
  | 'История'
  | 'География'
  | 'Литература'
  | 'Английский язык'
  | 'Экономика'
  | 'Право'

export interface OlympiadComparisonResult {
  subject: OlympiadSubject
  school: number // олимпиадный индекс, %
  city: number
  region: number
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

/** Олимпиадный индекс класса (для рейтинга по параллели). */
export interface ClassOlympiadIndex {
  classId: string
  grade: GradeLevel
  participationPct: number // доля участников от параллели
  awardPct: number // доля призёров/победителей
  avgScore: number // средний олимпиадный балл
  index: number // итоговый олимпиадный индекс, %
}

// ===================== Риски (ML-прототип) =====================
export interface RiskFactorBreakdown {
  label: string
  value: number // 0..100
}

export interface RiskPrediction {
  studentId: string
  fullName: string
  classId: string
  grade: GradeLevel
  riskScore: number
  riskLevel: RiskLevel
  factors: RiskFactorBreakdown[]
  reasons: string[]
  recommendations: string[]
}

// ===================== Оценки (страница «Оценки») =====================
export interface SubjectAverage {
  subject: string
  average: number
}

export type GradeValue = 2 | 3 | 4 | 5

export type GradeType = 'Контрольная' | 'Домашняя работа' | 'Самостоятельная работа' | 'Устный ответ'

/** Одна оценка ученика. Школьная шкала: 2–5. */
export interface GradeRecord {
  id: string
  studentId: string
  classId: string
  subject: string
  date: string // ISO, напр. "2024-05-12"
  grade: GradeValue
  type: GradeType
}

// ===================== Волонтёрство / активность =====================
export interface VolunteerEvent {
  title: string
  date: string
  hours: number
}

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

// ===================== Посещаемость =====================
/** Сводка посещаемости ученика за месяц (в учебных днях). */
export interface AttendanceSummary {
  totalDays: number
  present: number
  absent: number
  truancy: number
}

export type AttendanceMark = 'present' | 'absent' | 'truancy' | 'weekend'

export interface AttendanceDay {
  day: number
  mark: AttendanceMark
  outside?: boolean
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

// ===================== Экзамены: вспомогательное =====================
export interface ExamComparePoint {
  period: string
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

// ===================== Итоговый рейтинг учеников =====================
export interface StudentRatingRow {
  place: number
  fullName: string
  className: string
  total: number
  grades: number
  olympiads: number
  volunteering: number
  attendance: number
}

export interface RatingDistribution {
  label: string
  range: string
  percent: number
  count: number
  color: string
}
