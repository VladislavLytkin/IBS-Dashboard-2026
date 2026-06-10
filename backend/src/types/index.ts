import type { RiskLevel } from '../utils/riskModel'

export type Role = 'ADMIN' | 'DIRECTOR' | 'HEAD_TEACHER' | 'TEACHER' | 'ANALYST'
export const ROLES: Role[] = ['ADMIN', 'DIRECTOR', 'HEAD_TEACHER', 'TEACHER', 'ANALYST']

export type TrendDirection = 'up' | 'down' | 'stable'

export const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026] as const
export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const

export interface User {
  id: string
  email: string
  fullName: string
  role: Role
  passwordHash: string
  classIds?: string[] // для роли TEACHER — закреплённые классы
  createdAt: string
}

export type PublicUser = Omit<User, 'passwordHash'>

export interface ClassInfo {
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

export interface Student {
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

export interface RiskFactorBreakdown {
  label: string
  value: number
}

export interface RiskPrediction {
  studentId: string
  fullName: string
  classId: string
  grade: number
  year: number
  riskScore: number
  riskLevel: RiskLevel
  factors: RiskFactorBreakdown[]
  reasons: string[]
  recommendations: string[]
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
  year: number
  grade: number | null
  classId: string | null
  status: 'done' | 'pending' | 'failed'
  createdAt: string
  createdBy: string
  fileName: string
}
