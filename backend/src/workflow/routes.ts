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

function canMessage(from: PublicUser, to: PublicUser, type: InternalMessageType): boolean {
  if (from.id === to.id) return false
  if (from.role === 'DIRECTOR') return true
  if (from.role === 'ADMIN') return ['system', 'support', 'message'].includes(type)
  if (from.role === 'HEAD_TEACHER') return to.role === 'TEACHER' || to.role === 'STUDENT'
  if (from.role === 'TEACHER') return to.role === 'STUDENT' && (to.classIds ?? []).some((id) => (from.classIds ?? []).includes(id))
  if (from.role === 'STUDENT') return ['TEACHER', 'ADMIN'].includes(to.role)
  return false
}

workflowRouter.get('/recipients', (req: AuthedRequest, res) => {
  const user = req.user!
  const all = load().users.map(toPublic)
  let recipients: PublicUser[] = []
  if (user.role === 'DIRECTOR') recipients = all.filter((u) => u.id !== user.id)
  if (user.role === 'ADMIN') recipients = all.filter((u) => u.id !== user.id && u.role !== 'STUDENT')
  if (user.role === 'HEAD_TEACHER') recipients = all.filter((u) => u.role === 'TEACHER' || u.role === 'STUDENT')
  if (user.role === 'TEACHER') recipients = all.filter((u) => u.role === 'STUDENT' && (u.classIds ?? []).some((id) => (user.classIds ?? []).includes(id)))
  if (user.role === 'STUDENT') recipients = all.filter((u) => u.role === 'TEACHER' || u.role === 'ADMIN')
  res.json(recipients)
})

workflowRouter.get('/messages', (req: AuthedRequest, res) => {
  const user = req.user!
  const type = typeof req.query.type === 'string' ? req.query.type : 'all'
  let items = load().messages.filter((m) => m.fromUserId === user.id || m.toUserId === user.id)
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
