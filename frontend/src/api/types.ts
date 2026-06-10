// Типы, отражающие ответы backend API.
export type Role = 'ADMIN' | 'DIRECTOR' | 'HEAD_TEACHER' | 'TEACHER' | 'ANALYST'
export const ROLES: Role[] = ['ADMIN', 'DIRECTOR', 'HEAD_TEACHER', 'TEACHER', 'ANALYST']

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Администратор',
  DIRECTOR: 'Директор',
  HEAD_TEACHER: 'Завуч',
  TEACHER: 'Учитель',
  ANALYST: 'Аналитик',
}

export type RiskLevel = 'низкий' | 'средний' | 'высокий'
export type TrendDirection = 'up' | 'down' | 'stable'

export interface PublicUser {
  id: string
  email: string
  fullName: string
  role: Role
  classIds?: string[]
  createdAt: string
}

export interface ApiClassInfo {
  id: string
  year: number
  grade: number
  letter: string
  name: string
  studentCount: number
  academicScore: number
  olympiadScore: number
  attendanceScore: number
  activityScore: number
  riskScore: number
  finalScore: number
  weeklyDelta: number
  trend: TrendDirection
}

export interface ApiStudent {
  id: string
  year: number
  classId: string
  grade: number
  fullName: string
  gender: 'м' | 'ж'
  averageGrade: number
  previousAverageGrade: number
  attendanceRate: number
  absenceCount: number
  olympiadParticipation: boolean
  olympiadAwards: number
  activityScore: number
  projectCount: number
  riskScore: number
  riskLevel: RiskLevel
  riskReasons: string[]
  recommendations: string[]
}

export interface ComparisonRow {
  subject: string
  school: number
  city: number
  region: number
}

export interface OlympiadRatingRow {
  classId: string
  grade: number
  participationPct: number
  awardPct: number
  avgScore: number
  index: number
}

export interface RiskPrediction {
  studentId: string
  fullName: string
  classId: string
  grade: number
  year: number
  riskScore: number
  riskLevel: RiskLevel
  factors: { label: string; value: number }[]
  reasons: string[]
  recommendations: string[]
}

export interface DashboardSummary {
  year: number
  grade: number | null
  classCount: number
  studentCount: number
  avgFinalScore: number
  avgAttendance: number
  avgOlympiadIndex: number
  topClass: { name: string; finalScore: number } | null
  risk: { high: number; medium: number; low: number }
}

export type NotificationType = 'risk' | 'rating' | 'report' | 'attendance' | 'system'
export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  createdAt: string
  read: boolean
}

export interface AppSettings {
  general: {
    schoolName: string
    defaultYear: number
    defaultGrade: number
    theme: 'light' | 'dark' | 'system'
    language: 'ru'
    percentFormat: 'integer' | 'oneDecimal'
    ratingMode: 'classes' | 'students'
  }
  notifications: {
    enabled: boolean
    highRisk: boolean
    ratingDrop: boolean
    newReports: boolean
    attendanceSpike: boolean
    minRiskLevel: 'средний' | 'высокий'
  }
  reports: {
    defaultFormat: 'xlsx'
    defaultPeriod: number
    includeMlRisk: boolean
    includeCityRegion: boolean
  }
}

export type ReportType = 'final-rating' | 'exams' | 'olympiads' | 'attendance' | 'risks' | 'full'
export interface ReportHistoryItem {
  id: string
  type: ReportType
  typeLabel?: string
  year: number
  grade: number | null
  classId: string | null
  status: 'done' | 'pending' | 'failed'
  createdAt: string
  createdBy: string
  fileName: string
}

export interface ExamComparisonResponse {
  year: number
  grade: number
  examType: string
  rows: ComparisonRow[]
}

export interface OlympiadComparisonResponse {
  year: number
  grade: number | null
  rows: ComparisonRow[]
}
