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

/** Статус ученика: обучается / отчислен / переведён / выпущен. */
export type StudentStatus = 'active' | 'withdrawn' | 'transferred' | 'graduated'

export interface Student {
  id: string
  fullName: string
  classId: string
  grade: GradeLevel
  enrollmentYear: number // год поступления в школу, напр. 2018
  enrollmentDate: string // ISO, напр. "2018-09-01"
  status: StudentStatus
  exitDate: string | null // ISO, только если ученик выбыл
  exitReason: string | null
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
  date: string // ISO, напр. "2024-02-12"
  grade: GradeValue
  type: GradeType
  academicYear: string // напр. "2023/2024"
  semester: 1 | 2 // 1 — сентябрь–декабрь, 2 — январь–май
}

/** Период фильтрации оценок. */
export type GradePeriod = 'year' | 'sem1' | 'sem2' | 'month' | 'all'

// ===================== Экзамены ученика (вкладка в карточке) =====================
export type StudentExamType = 'ЕГЭ' | 'ОГЭ' | 'ВПР' | 'Внутренний экзамен'

export type StudentExamStatus =
  | 'Не сдал'
  | 'Сдал'
  | 'Выше среднего по школе'
  | 'Выше среднего по городу'
  | 'Выше среднего по стране'

export interface StudentExamResult {
  id: string
  studentId: string
  classId: string
  academicYear: string // напр. "2023/2024"
  examType: StudentExamType
  subject: string
  examDate: string // ISO
  score: number
  maxScore: number
  algebraScore: number | null // только ОГЭ по математике
  geometryScore: number | null // только ОГЭ по математике
  status: StudentExamStatus
}

/** Порог зачисления в профильный класс (ОГЭ по математике). */
export interface ExamProfileThreshold {
  profile: string
  minTotalScore: number
  minGeometryScore: number | null
}

/** Пороговые баллы экзамена. Каждое значение сопровождается источником (или пометкой «демо-данные»). */
export interface ExamThreshold {
  examType: StudentExamType
  year: number // календарный год экзамена
  subject: string
  maxScore: number
  minTotalScore: number // минимум для аттестата/сдачи (ЕГЭ/ОГЭ/ВПР)
  minSchoolScore: number | null // внутренний экзамен: минимум, заданный правилами школы
  minGeometryScore: number | null // ОГЭ по математике: минимум по модулю «геометрия»
  minUniversityScore: number | null // минимум для поступления (ЕГЭ)
  minMinobrnaukiScore: number | null // минимум вузов Минобрнауки (ЕГЭ)
  profileThresholds: ExamProfileThreshold[] | null
  sourceName: string
  sourceYear: number
  sourceUrl: string | null
}

/** Средние баллы для сравнения. schoolAverage не задаётся вручную — считается по studentExamResults. */
export interface ExamBenchmark {
  examType: StudentExamType
  year: number
  subject: string
  schoolAverage: number | null
  cityAverage: number | null
  countryAverage: number | null
  sourceName: string
  sourceYear: number
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
