import fs from 'fs'
import path from 'path'
import { ENV } from '../config/env'
import type { AppNotification, AppSettings, OlympiadApplication, ReportHistoryItem, User } from '../types'

// Простое JSON-хранилище для изменяемого состояния прототипа
// (пользователи, настройки, уведомления, история отчётов).
// Большие синтетические данные генерируются детерминированно в data/generate.ts.
// Структуру легко заменить на SQLite/Prisma без изменения API.

export interface StoreShape {
  users: User[]
  settings: AppSettings
  notifications: AppNotification[]
  olympiadApplications: OlympiadApplication[]
  reports: ReportHistoryItem[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    schoolName: 'Школа №123',
    defaultYear: new Date().getFullYear(),
    defaultGrade: 11,
    theme: 'light',
    language: 'ru',
    percentFormat: 'oneDecimal',
    ratingMode: 'classes',
  },
  notifications: {
    enabled: true,
    highRisk: true,
    ratingDrop: true,
    newReports: true,
    attendanceSpike: true,
    minRiskLevel: 'средний',
  },
  reports: {
    defaultFormat: 'xlsx',
    defaultPeriod: new Date().getFullYear(),
    includeMlRisk: true,
    includeCityRegion: true,
  },
}

const EMPTY: StoreShape = {
  users: [],
  settings: DEFAULT_SETTINGS,
  notifications: [],
  olympiadApplications: [],
  reports: [],
}

let cache: StoreShape | null = null

function ensureDir() {
  const dir = path.dirname(ENV.DB_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function load(): StoreShape {
  if (cache) return cache
  if (fs.existsSync(ENV.DB_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(ENV.DB_FILE, 'utf-8')) as StoreShape
      cache.olympiadApplications ??= []
    } catch {
      cache = structuredClone(EMPTY)
    }
  } else {
    cache = structuredClone(EMPTY)
  }
  return cache
}

export function save(next?: StoreShape): void {
  if (next) cache = next
  if (!cache) return
  ensureDir()
  fs.writeFileSync(ENV.DB_FILE, JSON.stringify(cache, null, 2), 'utf-8')
}

export function update<T>(mutator: (s: StoreShape) => T): T {
  const s = load()
  const result = mutator(s)
  save(s)
  return result
}

export function isInitialized(): boolean {
  return fs.existsSync(ENV.DB_FILE) && load().users.length > 0
}
