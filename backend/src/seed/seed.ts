import bcrypt from 'bcryptjs'
import { DEFAULT_SETTINGS, save, type StoreShape } from '../db/store'
import type { AppNotification, ReportHistoryItem, User } from '../types'

// =====================================================================
// ДЕМО-ДОСТУПЫ ДЛЯ ЛОКАЛЬНОГО ПРОТОТИПА.
// Пароли НЕ хранятся в открытом виде — в базу пишется только bcrypt-хэш.
// Для реального продакшена эти учётки и пароли необходимо удалить/заменить.
// =====================================================================
const DEMO_USERS: { email: string; password: string; fullName: string; role: User['role']; classIds?: string[] }[] = [
  { email: 'admin@school123.local', password: 'Admin_2026_Dashboard!', fullName: 'Администратор Системы', role: 'ADMIN' },
  { email: 'director@school123.local', password: 'Director_2026_IBS!', fullName: 'Директор Школы', role: 'DIRECTOR' },
  { email: 'headteacher@school123.local', password: 'Zavuch_2026_School!', fullName: 'Завуч По УВР', role: 'HEAD_TEACHER' },
  { email: 'analyst@school123.local', password: 'Analyst_2026_Data!', fullName: 'Аналитик Данных', role: 'ANALYST' },
  { email: 'teacher@school123.local', password: 'Teacher_2026_Class!', fullName: 'Учитель Предметник', role: 'TEACHER', classIds: ['2026-11А', '2026-11Б'] },
]

const now = new Date()
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString()

const NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'risk', title: 'Рост среднего риска', message: 'В 8Б выявлен рост доли учеников со средним риском', createdAt: iso(0), read: false },
  { id: 'n2', type: 'report', title: 'Отчёт сформирован', message: 'Сформирован отчёт по итоговому рейтингу за 2026 год', createdAt: iso(1), read: false },
  { id: 'n3', type: 'rating', title: 'Рост олимпиадного индекса', message: 'В 11А вырос олимпиадный индекс', createdAt: iso(2), read: false },
  { id: 'n4', type: 'risk', title: 'Высокий риск ученика', message: 'У ученика 9В высокий прогноз риска', createdAt: iso(3), read: true },
  { id: 'n5', type: 'attendance', title: 'Рост пропусков', message: 'В 7Б резко выросла доля пропусков за неделю', createdAt: iso(4), read: true },
  { id: 'n6', type: 'system', title: 'Добро пожаловать', message: 'Прототип дашборда школы №123 готов к работе', createdAt: iso(7), read: true },
]

const REPORTS: ReportHistoryItem[] = [
  { id: 'r1', type: 'final-rating', year: 2026, grade: 11, classId: null, status: 'done', createdAt: iso(1), createdBy: 'director@school123.local', fileName: 'final-rating-2026-11.xlsx' },
  { id: 'r2', type: 'risks', year: 2026, grade: null, classId: null, status: 'done', createdAt: iso(3), createdBy: 'headteacher@school123.local', fileName: 'risks-2026.xlsx' },
]

async function main() {
  const users: User[] = []
  for (const u of DEMO_USERS) {
    users.push({
      id: u.role.toLowerCase(),
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      passwordHash: await bcrypt.hash(u.password, 10),
      classIds: u.classIds,
      createdAt: iso(30),
    })
  }

  const store: StoreShape = {
    users,
    settings: DEFAULT_SETTINGS,
    notifications: NOTIFICATIONS,
    reports: REPORTS,
  }
  save(store)

  console.log('✓ Seed выполнен. Демо-пользователи:')
  for (const u of DEMO_USERS) console.log(`  ${u.role.padEnd(12)} ${u.email}  /  ${u.password}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
