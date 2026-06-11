import { apiDelete, apiDownload, apiGet, apiPatch, apiPost, buildQuery } from '../api/client'
import type {
  ApiClassInfo, ApiStudent, AppNotification, AppSettings, DashboardSummary,
  AcademicDebt, ActionLogEntry, AbsenceRecord, ExamComparisonResponse, ExpulsionRequest, InternalMessage,
  InternalMessageType, OlympiadApplication, OlympiadCatalogItem, OlympiadComparisonResponse,
  OlympiadRatingRow, PublicUser, ReportHistoryItem, ReportType, RiskPrediction, Role,
  SpdApplication, SpdEvent, SupportTicket, SupportTicketStatus,
} from '../api/types'

export interface Filters {
  year: number
  grade?: number | 'all'
  classId?: string
}

const q = (f: Filters) =>
  buildQuery({ year: f.year, grade: f.grade === 'all' ? undefined : f.grade, classId: f.classId })

// ===================== Auth =====================
export const authService = {
  login: (email: string, password: string) =>
    apiPost<{ user: PublicUser; token: string }>('/auth/login', { email, password }),
  logout: () => apiPost<{ ok: true }>('/auth/logout'),
  me: () => apiGet<{ user: PublicUser }>('/auth/me'),
}

// ===================== Dashboard =====================
export const dashboardService = {
  summary: (f: Filters) => apiGet<DashboardSummary>(`/dashboard/summary${q(f)}`),
  classRating: (f: Filters) => apiGet<ApiClassInfo[]>(`/dashboard/class-rating${q(f)}`),
  finalRating: (f: Filters) => apiGet<ApiClassInfo[]>(`/dashboard/final-rating${q(f)}`),
  olympiadRating: (f: Filters) => apiGet<OlympiadRatingRow[]>(`/dashboard/olympiad-rating${q(f)}`),
}

// ===================== Classes / Students =====================
export const classesService = {
  list: (f: Filters) => apiGet<ApiClassInfo[]>(`/classes${q(f)}`),
  byId: (id: string) => apiGet<ApiClassInfo>(`/classes/${id}`),
}

export const studentsService = {
  list: (f: Filters) => apiGet<ApiStudent[]>(`/students${q(f)}`),
  byId: (id: string) => apiGet<ApiStudent>(`/students/${id}`),
}

// ===================== Exams / Olympiads =====================
export const examsService = {
  comparison: (f: Filters) => apiGet<ExamComparisonResponse>(`/exams/comparison${q(f)}`),
}

export const olympiadsService = {
  comparison: (f: Filters) => apiGet<OlympiadComparisonResponse>(`/olympiads/comparison${q(f)}`),
  rating: (f: Filters) => apiGet<OlympiadRatingRow[]>(`/olympiads/rating${q(f)}`),
  applications: () => apiGet<OlympiadApplication[]>('/olympiads/applications'),
  createApplication: (data: Omit<OlympiadApplication, 'id' | 'createdBy' | 'createdAt' | 'status' | 'reviewedAt' | 'reviewedBy' | 'rejectionReason'>) =>
    apiPost<OlympiadApplication>('/olympiads/applications', data),
  reviewApplication: (id: string, status: 'approved' | 'rejected', rejectionReason?: string) =>
    apiPatch<OlympiadApplication>(`/olympiads/applications/${id}`, { status, rejectionReason }),
  catalog: () => apiGet<OlympiadCatalogItem[]>('/olympiads/catalog'),
  addToCatalog: (data: { name: string; subject: string; officialWebsiteUrl: string }) =>
    apiPost<OlympiadCatalogItem>('/olympiads/catalog', data),
}

// ===================== СПД (социально полезная деятельность) =====================
export const spdService = {
  events: () => apiGet<SpdEvent[]>('/spd/events'),
  applications: () => apiGet<SpdApplication[]>('/spd/applications'),
  createApplication: (data: { eventId: string; comment?: string }) =>
    apiPost<SpdApplication>('/spd/applications', data),
  reviewApplication: (id: string, status: 'approved' | 'rejected', rejectionReason?: string) =>
    apiPatch<SpdApplication>(`/spd/applications/${id}`, { status, rejectionReason }),
}

// ===================== Risks =====================
export const risksService = {
  list: (f: Filters) => apiGet<RiskPrediction[]>(`/risks${q(f)}`),
  byStudent: (id: string) => apiGet<RiskPrediction>(`/risks/${id}`),
}

// ===================== Settings =====================
export const settingsService = {
  get: () => apiGet<AppSettings>('/settings'),
  update: (patch: Partial<AppSettings>) => apiPatch<AppSettings>('/settings', patch),
}

// ===================== Notifications =====================
export const notificationsService = {
  list: () => apiGet<{ items: AppNotification[]; unread: number }>('/notifications'),
  markRead: (id: string) => apiPatch<AppNotification>(`/notifications/${id}/read`),
  markAllRead: () => apiPatch<{ ok: true }>('/notifications/read-all'),
}

// ===================== Workflow: messages / support / action log =====================
export const workflowService = {
  recipients: () => apiGet<PublicUser[]>('/workflow/recipients'),
  messages: (type: InternalMessageType | 'all' = 'all') => apiGet<InternalMessage[]>(`/workflow/messages${buildQuery({ type })}`),
  sendMessage: (data: { toUserId: string; type: InternalMessageType; title: string; text: string; replyToId?: string; meta?: Record<string, string> }) =>
    apiPost<InternalMessage>('/workflow/messages', data),
  markMessageRead: (id: string) => apiPatch<InternalMessage>(`/workflow/messages/${id}/read`),
  support: (filters?: { status?: string; role?: string }) => apiGet<SupportTicket[]>(`/workflow/support${buildQuery({ status: filters?.status, role: filters?.role })}`),
  createSupport: (data: { subject: string; category: SupportTicket['category']; description: string; priority: SupportTicket['priority'] }) =>
    apiPost<SupportTicket>('/workflow/support', data),
  updateSupport: (id: string, status: SupportTicketStatus, adminReply?: string) =>
    apiPatch<SupportTicket>(`/workflow/support/${id}`, { status, adminReply }),
  absences: (year: number) => apiGet<AbsenceRecord[]>(`/workflow/absences${buildQuery({ year })}`),
  createAbsence: (data: { studentId: string; date: string; lesson: string; subject: string; type: AbsenceRecord['type']; reasonOrComment: string }) =>
    apiPost<AbsenceRecord>('/workflow/absences', data),
  debts: (year: number) => apiGet<AcademicDebt[]>(`/workflow/debts${buildQuery({ year })}`),
  createDebt: (data: { studentId: string; subject: string; topic: string; reason: string; dueDate: string; comment: string }) =>
    apiPost<AcademicDebt>('/workflow/debts', data),
  expulsions: () => apiGet<ExpulsionRequest[]>('/workflow/expulsions'),
  createExpulsion: (data: { studentId: string; writtenReason: string }) => apiPost<ExpulsionRequest>('/workflow/expulsions', data),
  actionLog: () => apiGet<ActionLogEntry[]>('/workflow/action-log'),
}

// ===================== Reports =====================
export const reportsService = {
  history: () => apiGet<ReportHistoryItem[]>('/reports/history'),
  export: (payload: { type: ReportType; year: number; grade?: number | null }) =>
    apiDownload('/reports/export', 'POST', payload),
  download: (id: string) => apiDownload(`/reports/${id}/download`, 'GET'),
}

// ===================== Users (ADMIN) =====================
export interface UserInput {
  email: string
  fullName: string
  role: Role
  password?: string
  classIds?: string[]
  subjects?: string[]
}
export const usersService = {
  list: () => apiGet<PublicUser[]>('/users'),
  create: (data: UserInput) => apiPost<PublicUser>('/users', data),
  update: (id: string, data: Partial<UserInput>) => apiPatch<PublicUser>(`/users/${id}`, data),
  remove: (id: string) => apiDelete<{ ok: true }>(`/users/${id}`),
}

/** Утилита: скачать Blob как файл в браузере. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
