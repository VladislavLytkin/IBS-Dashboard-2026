// Типы, отражающие ответы backend API.
export type Role = 'ADMIN' | 'DIRECTOR' | 'HEAD_TEACHER' | 'TEACHER' | 'STUDENT' | 'ANALYST'
export const ROLES: Role[] = ['ADMIN', 'DIRECTOR', 'HEAD_TEACHER', 'TEACHER', 'STUDENT', 'ANALYST']

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Администратор',
  DIRECTOR: 'Директор',
  HEAD_TEACHER: 'Завуч',
  TEACHER: 'Учитель',
  STUDENT: 'Ученик',
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
  subjects?: string[]
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

export type NotificationType = 'risk' | 'rating' | 'report' | 'attendance' | 'system' | 'olympiad' | 'grades'
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

export type OlympiadApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface OlympiadApplication {
  id: string
  createdBy: string
  studentName: string
  classId: string
  title: string
  level: string
  subject: string
  participationDate: string
  result: string
  placeOrDegree: string
  confirmationUrl: string
  studentComment: string
  status: OlympiadApplicationStatus
  rejectionReason?: string
  createdAt: string
  reviewedAt?: string
  reviewedBy?: string
}

export type InternalMessageType =
  | 'message'
  | 'office_call'
  | 'academic_debt'
  | 'risk_comment'
  | 'absence_comment'
  | 'system'
  | 'support'

export interface InternalMessage {
  id: string
  fromUserId: string
  toUserId: string
  fromRole: Role
  toRole: Role
  type: InternalMessageType
  title: string
  text: string
  createdAt: string
  isRead: boolean
  replyToId?: string
  meta?: Record<string, string>
}

export type SupportTicketStatus = 'new' | 'in_progress' | 'resolved' | 'rejected'
export type SupportTicketPriority = 'low' | 'medium' | 'high'

export interface SupportTicket {
  id: string
  createdBy: string
  createdByRole: Role
  subject: string
  category: 'data_error' | 'access_problem' | 'ui_error' | 'notifications_problem' | 'other'
  description: string
  priority: SupportTicketPriority
  status: SupportTicketStatus
  createdAt: string
  adminReply?: string
  updatedAt?: string
}

export type AcademicDebtStatus = 'assigned' | 'in_progress' | 'closed' | 'overdue'
export interface AcademicDebt {
  id: string
  studentId: string
  studentName: string
  classId: string
  subject: string
  topic: string
  reason: string
  dueDate: string
  comment: string
  status: AcademicDebtStatus
  createdBy: string
  createdAt: string
}

export type AbsenceType = 'excused' | 'truancy'
export interface AbsenceRecord {
  id: string
  studentId: string
  studentName: string
  classId: string
  date: string
  lesson: string
  subject: string
  type: AbsenceType
  reasonOrComment: string
  createdBy: string
  createdAt: string
}

export type ExpulsionStatus = 'initiated' | 'review' | 'confirmed' | 'cancelled'
export interface ExpulsionRequest {
  id: string
  studentId: string
  studentName: string
  classId: string
  writtenReason: string
  status: ExpulsionStatus
  createdBy: string
  createdAt: string
}

export interface ActionLogEntry {
  id: string
  userId: string
  role: Role
  actionType: string
  target: string
  description: string
  createdAt: string
}
