import { Router } from 'express'
import { z } from 'zod'
import { addActionLog, load, update } from '../db/store'
import { getStudent, listStudents } from '../data/generate'
import { requireAuth } from '../middleware/auth'
import type { AuthedRequest } from '../middleware/auth'
import type {
  AcademicDebtStatus, ExpulsionStatus, InternalMessageType, PublicUser, Role,
  SupportTicketStatus, User,
} from '../types'
import { canAccessStudent, filterStudentsForUser } from '../utils/access'

export const workflowRouter = Router()
workflowRouter.use(requireAuth)

function toPublic(u: User): PublicUser {
  const { passwordHash: _omit, ...rest } = u
  void _omit
  return rest
}

function log(user: PublicUser, actionType: string, target: string, description: string) {
  addActionLog({ userId: user.id, role: user.role, actionType, target, description })
}

/** Учитель работает только со своими предметами; завуч и выше — с любыми. */
function subjectAllowed(user: PublicUser, subject: string): boolean {
  if (user.role !== 'TEACHER') return true
  const own = user.subjects ?? []
  return own.length === 0 || own.includes(subject)
}

/** Пересечение классов двух пользователей (учитель ↔ ученик). */
function shareClass(a: PublicUser, b: PublicUser): boolean {
  return (a.classIds ?? []).some((id) => (b.classIds ?? []).includes(id))
}

// Права переписки: ученик — своим учителям и завучу/админу; учитель — ученикам
// назначенных классов, коллегам и администрации; админ/завуч/директор — всем.
function canMessage(from: PublicUser, to: PublicUser, _type: InternalMessageType): boolean {
  if (from.id === to.id) return false
  if (from.role === 'DIRECTOR' || from.role === 'ADMIN' || from.role === 'HEAD_TEACHER') return true
  if (from.role === 'TEACHER') {
    if (['TEACHER', 'ADMIN', 'HEAD_TEACHER', 'DIRECTOR'].includes(to.role)) return true
    return to.role === 'STUDENT' && shareClass(from, to)
  }
  if (from.role === 'STUDENT') {
    if (to.role === 'ADMIN' || to.role === 'HEAD_TEACHER') return true
    return to.role === 'TEACHER' && shareClass(from, to)
  }
  return false
}

const ONLINE_THRESHOLD_MS = 2 * 60_000

function withPresence(u: PublicUser) {
  return {
    ...u,
    isOnline: !!u.lastSeenAt && Date.now() - Date.parse(u.lastSeenAt) < ONLINE_THRESHOLD_MS,
  }
}

workflowRouter.get('/recipients', (req: AuthedRequest, res) => {
  const user = req.user!
  const all = load().users.map(toPublic)
  const recipients = all.filter((u) => canMessage(user, u, 'message'))
  res.json(recipients.map(withPresence))
})

workflowRouter.get('/messages', (req: AuthedRequest, res) => {
  const user = req.user!
  const type = typeof req.query.type === 'string' ? req.query.type : 'all'
  let items = load().messages.filter((m) => m.fromUserId === user.id || m.toUserId === user.id)
  items = items.filter((m) => !(m.hiddenForUserIds ?? []).includes(user.id))
  if (type !== 'all') items = items.filter((m) => m.type === type)
  if (user.role === 'STUDENT') {
    items = items.map((m) => (m.fromRole === 'HEAD_TEACHER' || m.fromRole === 'DIRECTOR'
      ? { ...m, fromRole: 'ADMIN' as Role, title: `Администрация школы: ${m.title}` }
      : m))
  }
  res.json(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})

const messageSchema = z.object({
  toUserId: z.string(),
  type: z.enum(['message', 'office_call', 'academic_debt', 'risk_comment', 'absence_comment', 'system', 'support']),
  title: z.string().min(1),
  text: z.string().min(1),
  replyToId: z.string().optional(),
  meta: z.record(z.string()).optional(),
})

workflowRouter.post('/messages', (req: AuthedRequest, res) => {
  const parsed = messageSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  const from = req.user!
  const to = load().users.find((u) => u.id === parsed.data.toUserId)
  if (!to || !canMessage(from, toPublic(to), parsed.data.type)) {
    res.status(403).json({ error: 'Нет права отправить сообщение этому пользователю' })
    return
  }
  const { toUserId: _toUserId, ...messageData } = parsed.data
  void _toUserId
  const item = update((s) => {
    const msg = {
      id: `msg-${Date.now()}-${s.messages.length + 1}`,
      fromUserId: from.id,
      toUserId: to.id,
      fromRole: from.role,
      toRole: to.role,
      createdAt: new Date().toISOString(),
      isRead: false,
      ...messageData,
    }
    s.messages.push(msg)
    return msg
  })
  log(from, parsed.data.type === 'office_call' ? 'student_call' : 'message', to.fullName, parsed.data.title)
  res.status(201).json(item)
})

workflowRouter.patch('/messages/:id/read', (req: AuthedRequest, res) => {
  let result: unknown
  update((s) => {
    const msg = s.messages.find((m) => m.id === req.params.id && m.toUserId === req.user!.id)
    if (!msg) return
    msg.isRead = true
    result = msg
  })
  if (!result) {
    res.status(404).json({ error: 'Сообщение не найдено' })
    return
  }
  res.json(result)
})

// ===================== Действия с сообщением =====================
type StoredMessage = ReturnType<typeof load>['messages'][number]

function findOwnDialogMessage(req: AuthedRequest): StoredMessage | undefined {
  const user = req.user!
  return load().messages.find(
    (m) => m.id === req.params.id && (m.fromUserId === user.id || m.toUserId === user.id),
  )
}

// Редактировать можно только своё и непустым текстом.
workflowRouter.patch('/messages/:id/edit', (req: AuthedRequest, res) => {
  const msg = findOwnDialogMessage(req)
  if (!msg) {
    res.status(404).json({ error: 'Сообщение не найдено' })
    return
  }
  if (msg.fromUserId !== req.user!.id) {
    res.status(403).json({ error: 'Редактировать можно только свои сообщения' })
    return
  }
  if (msg.deletedForEveryone) {
    res.status(400).json({ error: 'Сообщение удалено' })
    return
  }
  const text = String(req.body?.text ?? '').trim()
  if (!text) {
    res.status(400).json({ error: 'Сообщение не может быть пустым' })
    return
  }
  const result = update(() => {
    msg.text = text
    msg.editedAt = new Date().toISOString()
    return msg
  })
  res.json(result)
})

// Закрепить / открепить сообщение в диалоге.
workflowRouter.patch('/messages/:id/pin', (req: AuthedRequest, res) => {
  const msg = findOwnDialogMessage(req)
  if (!msg) {
    res.status(404).json({ error: 'Сообщение не найдено' })
    return
  }
  if (msg.deletedForEveryone) {
    res.status(400).json({ error: 'Сообщение удалено' })
    return
  }
  const pinned = Boolean(req.body?.pinned)
  const result = update(() => {
    msg.pinnedByUserId = pinned ? req.user!.id : undefined
    msg.pinnedAt = pinned ? new Date().toISOString() : undefined
    return msg
  })
  res.json(result)
})

// «Удалить у меня» — скрыть сообщение только для текущего пользователя.
workflowRouter.patch('/messages/:id/hide', (req: AuthedRequest, res) => {
  const msg = findOwnDialogMessage(req)
  if (!msg) {
    res.status(404).json({ error: 'Сообщение не найдено' })
    return
  }
  const result = update(() => {
    msg.hiddenForUserIds = [...new Set([...(msg.hiddenForUserIds ?? []), req.user!.id])]
    return msg
  })
  res.json(result)
})

// «Удалить у всех» — автор сообщения либо админ/завуч.
workflowRouter.delete('/messages/:id', (req: AuthedRequest, res) => {
  const user = req.user!
  const msg = findOwnDialogMessage(req)
  if (!msg) {
    res.status(404).json({ error: 'Сообщение не найдено' })
    return
  }
  const canDelete = msg.fromUserId === user.id || ['ADMIN', 'HEAD_TEACHER'].includes(user.role)
  if (!canDelete) {
    res.status(403).json({ error: 'Удалить у всех может автор или администрация' })
    return
  }
  const result = update(() => {
    msg.deletedForEveryone = true
    msg.deletedAt = new Date().toISOString()
    msg.text = ''
    msg.title = ''
    msg.reactions = []
    msg.pinnedByUserId = undefined
    msg.pinnedAt = undefined
    return msg
  })
  log(user, 'message_deleted', msg.id, 'Сообщение удалено у всех')
  res.json(result)
})

// Реакция: одна на пользователя; та же — снимает, другая — заменяет.
workflowRouter.post('/messages/:id/reactions', (req: AuthedRequest, res) => {
  const user = req.user!
  const msg = findOwnDialogMessage(req)
  if (!msg) {
    res.status(404).json({ error: 'Сообщение не найдено' })
    return
  }
  if (msg.deletedForEveryone) {
    res.status(400).json({ error: 'Сообщение удалено' })
    return
  }
  const emoji = String(req.body?.emoji ?? '').trim()
  if (!emoji || emoji.length > 8) {
    res.status(400).json({ error: 'Некорректная реакция' })
    return
  }
  const result = update(() => {
    const reactions = msg.reactions ?? []
    const own = reactions.find((r) => r.userId === user.id)
    if (own && own.emoji === emoji) {
      msg.reactions = reactions.filter((r) => r.userId !== user.id)
    } else {
      msg.reactions = [
        ...reactions.filter((r) => r.userId !== user.id),
        { userId: user.id, emoji, createdAt: new Date().toISOString() },
      ]
    }
    return msg
  })
  res.json(result)
})

const supportSchema = z.object({
  subject: z.string().min(1),
  category: z.enum(['data_error', 'access_problem', 'ui_error', 'notifications_problem', 'other']),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']),
})

workflowRouter.get('/support', (req: AuthedRequest, res) => {
  const user = req.user!
  const status = typeof req.query.status === 'string' ? req.query.status : 'all'
  const role = typeof req.query.role === 'string' ? req.query.role : 'all'
  let items = user.role === 'ADMIN' ? [...load().supportTickets] : load().supportTickets.filter((t) => t.createdBy === user.id)
  if (status !== 'all') items = items.filter((t) => t.status === status)
  if (role !== 'all') items = items.filter((t) => t.createdByRole === role)
  res.json(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})

workflowRouter.post('/support', (req: AuthedRequest, res) => {
  if (req.user!.role === 'ADMIN') {
    res.status(403).json({ error: 'Администратор обрабатывает обращения, но не создаёт их для себя' })
    return
  }
  const parsed = supportSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  const item = update((s) => {
    const ticket = {
      id: `sup-${Date.now()}-${s.supportTickets.length + 1}`,
      createdBy: req.user!.id,
      createdByRole: req.user!.role,
      status: 'new' as SupportTicketStatus,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    }
    s.supportTickets.push(ticket)
    return ticket
  })
  log(req.user!, 'support_ticket', item.id, item.subject)
  res.status(201).json(item)
})

workflowRouter.patch('/support/:id', (req: AuthedRequest, res) => {
  if (req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Обращения обрабатывает администратор' })
    return
  }
  const status = req.body?.status as SupportTicketStatus | undefined
  if (!['new', 'in_progress', 'resolved', 'rejected'].includes(String(status))) {
    res.status(400).json({ error: 'Некорректный статус' })
    return
  }
  let result: unknown
  update((s) => {
    const item = s.supportTickets.find((t) => t.id === req.params.id)
    if (!item) return
    item.status = status!
    item.adminReply = String(req.body?.adminReply ?? item.adminReply ?? '')
    item.updatedAt = new Date().toISOString()
    result = item
  })
  if (!result) {
    res.status(404).json({ error: 'Обращение не найдено' })
    return
  }
  log(req.user!, 'support_status', req.params.id, `Статус обращения: ${status}`)
  res.json(result)
})

const absenceSchema = z.object({
  studentId: z.string(),
  date: z.string().min(4),
  lesson: z.string().min(1),
  subject: z.string().min(1),
  type: z.enum(['excused', 'truancy']),
  reasonOrComment: z.string().min(1),
})

workflowRouter.get('/absences', (req: AuthedRequest, res) => {
  const user = req.user!
  const year = Number(req.query.year ?? new Date().getFullYear())
  let items = [...load().absenceRecords]
  if (user.role === 'STUDENT') {
    const own = filterStudentsForUser(user, listStudents(year), year)[0]
    items = own ? items.filter((a) => a.studentId === own.id) : []
  } else if (user.role === 'TEACHER') {
    items = items.filter((a) => (user.classIds ?? []).includes(a.classId))
  }
  res.json(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})

workflowRouter.post('/absences', (req: AuthedRequest, res) => {
  if (!['TEACHER', 'HEAD_TEACHER'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Проставлять пропуски может учитель или завуч' })
    return
  }
  const parsed = absenceSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  if (!canAccessStudent(req.user!, parsed.data.studentId)) {
    res.status(403).json({ error: 'Нет доступа к этому ученику' })
    return
  }
  if (!subjectAllowed(req.user!, parsed.data.subject)) {
    res.status(403).json({ error: 'Можно выбирать только свои предметы' })
    return
  }
  const student = getStudent(parsed.data.studentId)
  if (!student) {
    res.status(404).json({ error: 'Ученик не найден' })
    return
  }
  const item = update((s) => {
    const record = {
      id: `abs-${Date.now()}-${s.absenceRecords.length + 1}`,
      studentName: student.fullName,
      classId: student.classId,
      createdBy: req.user!.id,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    }
    s.absenceRecords.push(record)
    return record
  })
  log(req.user!, 'absence_record', student.fullName, `${parsed.data.type === 'excused' ? 'Уважительное отсутствие' : 'Прогул'}: ${parsed.data.subject}`)
  res.status(201).json(item)
})

const debtSchema = z.object({
  studentId: z.string(),
  subject: z.string().min(1),
  topic: z.string().min(1),
  reason: z.string().min(1),
  dueDate: z.string().min(4),
  comment: z.string().optional().default(''),
})

workflowRouter.get('/debts', (req: AuthedRequest, res) => {
  const user = req.user!
  const year = Number(req.query.year ?? new Date().getFullYear())
  let items = [...load().academicDebts]
  if (user.role === 'STUDENT') {
    const own = filterStudentsForUser(user, listStudents(year), year)[0]
    items = own ? items.filter((d) => d.studentId === own.id) : []
  } else if (user.role === 'TEACHER') {
    items = items.filter((d) => (user.classIds ?? []).includes(d.classId))
  }
  res.json(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})

workflowRouter.post('/debts', (req: AuthedRequest, res) => {
  if (!['TEACHER', 'HEAD_TEACHER'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Назначать задолженность может учитель или завуч' })
    return
  }
  const parsed = debtSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  if (!canAccessStudent(req.user!, parsed.data.studentId)) {
    res.status(403).json({ error: 'Нет доступа к этому ученику' })
    return
  }
  if (!subjectAllowed(req.user!, parsed.data.subject)) {
    res.status(403).json({ error: 'Можно выбирать только свои предметы' })
    return
  }
  const student = getStudent(parsed.data.studentId)
  if (!student) {
    res.status(404).json({ error: 'Ученик не найден' })
    return
  }
  const item = update((s) => {
    const debt = {
      id: `debt-${Date.now()}-${s.academicDebts.length + 1}`,
      studentName: student.fullName,
      classId: student.classId,
      status: 'assigned' as AcademicDebtStatus,
      createdBy: req.user!.id,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    }
    s.academicDebts.push(debt)
    return debt
  })
  log(req.user!, 'academic_debt', student.fullName, `${parsed.data.subject}: ${parsed.data.topic}`)
  res.status(201).json(item)
})

const expulsionSchema = z.object({
  studentId: z.string(),
  writtenReason: z.string().min(10, 'Укажите письменную причину'),
})

workflowRouter.get('/expulsions', (req: AuthedRequest, res) => {
  if (!['DIRECTOR', 'ADMIN'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Нет доступа к управленческим действиям' })
    return
  }
  res.json(load().expulsionRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})

workflowRouter.post('/expulsions', (req: AuthedRequest, res) => {
  if (req.user!.role !== 'DIRECTOR') {
    res.status(403).json({ error: 'Инициировать отчисление может только директор' })
    return
  }
  const parsed = expulsionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  const student = getStudent(parsed.data.studentId)
  if (!student) {
    res.status(404).json({ error: 'Ученик не найден' })
    return
  }
  const item = update((s) => {
    const request = {
      id: `exp-${Date.now()}-${s.expulsionRequests.length + 1}`,
      studentName: student.fullName,
      classId: student.classId,
      status: 'initiated' as ExpulsionStatus,
      createdBy: req.user!.id,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    }
    s.expulsionRequests.push(request)
    return request
  })
  log(req.user!, 'expulsion_initiated', student.fullName, 'Инициировано отчисление с письменной причиной')
  res.status(201).json(item)
})

workflowRouter.get('/action-log', (req: AuthedRequest, res) => {
  if (!['ADMIN', 'DIRECTOR'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Журнал действий доступен администратору и директору' })
    return
  }
  res.json(load().actionLog.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})
