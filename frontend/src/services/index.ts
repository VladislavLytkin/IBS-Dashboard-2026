import { apiDelete, apiDownload, apiGet, apiPatch, apiPost, buildQuery } from '../api/client'
import type {
  ApiClassInfo, ApiStudent, AppNotification, AppSettings, DashboardSummary,
  ExamComparisonResponse, OlympiadComparisonResponse, OlympiadRatingRow, PublicUser,
  ReportHistoryItem, ReportType, RiskPrediction, Role,
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
