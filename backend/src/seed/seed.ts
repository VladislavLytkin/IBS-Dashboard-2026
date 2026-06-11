import bcrypt from 'bcryptjs'
import { DEFAULT_SETTINGS, save, type StoreShape } from '../db/store'
import { DEFAULT_OLYMPIAD_CATALOG, DEFAULT_SPD_EVENTS } from '../data/defaults'
import type {
  AcademicDebt, AbsenceRecord, ActionLogEntry, AppNotification, InternalMessage,
  OlympiadApplication, ReportHistoryItem, SpdApplication, SupportTicket, User,
} from '../types'

// =====================================================================
// ДЕМО-ДОСТУПЫ ДЛЯ ЛОКАЛЬНОГО ПРОТОТИПА.
// Пароли НЕ хранятся в открытом виде — в базу пишется только bcrypt-хэш.
// Для реального продакшена эти учётки и пароли необходимо удалить/заменить.
// =====================================================================
const DEMO_USERS: { email: string; password: string; fullName: string; role: User['role']; classIds?: string[]; subjects?: string[]; studentId?: string }[] = [
  { email: 'admin@school123.local', password: 'Admin_2026_Dashboard!', fullName: 'Администратор Системы', role: 'ADMIN' },
  { email: 'director@school123.local', password: 'Director_2026_IBS!', fullName: 'Директор Школы', role: 'DIRECTOR' },
  { email: 'headteacher@school123.local', password: 'Zavuch_2026_School!', fullName: 'Завуч По УВР', role: 'HEAD_TEACHER' },
  { email: 'analyst@school123.local', password: 'Analyst_2026_Data!', fullName: 'Аналитик Данных', role: 'ANALYST' },
  { email: 'teacher@school123.local', password: 'Teacher_2026_Class!', fullName: 'Учитель Предметник', role: 'TEACHER', classIds: ['2026-11А', '2026-11Б'], subjects: ['Математика', 'Информатика'] },
  // studentId привязывает учётку к конкретному сгенерированному ученику (2026-11Б-s5 — Соколова Анна),
  // чтобы риски и личные данные показывались строго для этого ученика.
  { email: 'student@school123.local', password: 'Student_2026_Profile!', fullName: 'Соколова Анна', role: 'STUDENT', classIds: ['2026-11Б'], studentId: '2026-11Б-s5' },
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

const OLYMPIAD_APPLICATIONS: OlympiadApplication[] = [
  {
    id: 'oa1',
    createdBy: 'student',
    studentName: 'Соколова Анна',
    classId: '2026-11Б',
    title: 'Высшая проба',
    level: 'перечневая',
    subject: 'Математика',
    participationDate: '2026-02-18',
    result: 'призёр',
    placeOrDegree: 'призёр 3 степени',
    confirmationUrl: 'https://example.edu/olympiad-proof',
    studentComment: 'Добавляю диплом для проверки.',
    status: 'pending',
    createdAt: iso(2),
  },
]

const MESSAGES: InternalMessage[] = [
  { id: 'msg1', fromUserId: 'teacher', toUserId: 'student', fromRole: 'TEACHER', toRole: 'STUDENT', type: 'office_call', title: 'Вызов к учителю', text: 'Подойдите в кабинет 214 после 5 урока.', createdAt: iso(1), isRead: false, meta: { room: '214' } },
  { id: 'msg2', fromUserId: 'head_teacher', toUserId: 'teacher', fromRole: 'HEAD_TEACHER', toRole: 'TEACHER', type: 'message', title: 'Проверьте пропуски', text: 'Пожалуйста, уточните причины пропусков по 11Б.', createdAt: iso(2), isRead: false },
  { id: 'msg3', fromUserId: 'admin', toUserId: 'student', fromRole: 'ADMIN', toRole: 'STUDENT', type: 'system', title: 'Олимпиадная заявка', text: 'Ваша заявка ожидает проверки.', createdAt: iso(3), isRead: true },
]

const DEBTS: AcademicDebt[] = [
  { id: 'debt1', studentId: '2026-11Б-s5', studentName: 'Соколова Анна', classId: '2026-11Б', subject: 'Математика', topic: 'Производная', reason: 'Не закрыта контрольная работа', dueDate: '2026-06-20', comment: 'Подготовить решение задач 1-8', status: 'assigned', createdBy: 'teacher', createdAt: iso(1) },
]

const ABSENCES: AbsenceRecord[] = [
  { id: 'abs1', studentId: '2026-11Б-s5', studentName: 'Соколова Анна', classId: '2026-11Б', date: '2026-06-05', lesson: '3', subject: 'Математика', type: 'truancy', reasonOrComment: 'Без уважительной причины', createdBy: 'teacher', createdAt: iso(1) },
]

const SUPPORT: SupportTicket[] = [
  { id: 'sup1', createdBy: 'teacher', createdByRole: 'TEACHER', subject: 'Ошибка в журнале пропусков', category: 'data_error', description: 'Не совпадает число прогулов за неделю.', priority: 'medium', status: 'new', createdAt: iso(2) },
]

const ACTION_LOG: ActionLogEntry[] = [
  { id: 'log1', userId: 'teacher', role: 'TEACHER', actionType: 'absence_record', target: 'Соколова Анна', description: 'Проставлен прогул по математике', createdAt: iso(1) },
]

const SPD_APPLICATIONS: SpdApplication[] = [
  {
    id: 'spda1',
    studentId: '2026-11Б-s5',
    studentName: 'Соколова Анна',
    classId: '2026-11Б',
    eventId: 'spd_9',
    comment: 'Хочу помочь с раздачей ленточек у входа.',
    status: 'pending',
    createdAt: iso(2),
  },
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
      subjects: u.subjects,
      studentId: u.studentId,
      createdAt: iso(30),
    })
  }

  const store: StoreShape = {
    users,
    settings: DEFAULT_SETTINGS,
    notifications: NOTIFICATIONS,
    olympiadApplications: OLYMPIAD_APPLICATIONS,
    olympiadCatalog: DEFAULT_OLYMPIAD_CATALOG,
    spdEvents: DEFAULT_SPD_EVENTS,
    spdApplications: SPD_APPLICATIONS,
    messages: MESSAGES,
    supportTickets: SUPPORT,
    actionLog: ACTION_LOG,
    academicDebts: DEBTS,
    absenceRecords: ABSENCES,
    expulsionRequests: [],
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
