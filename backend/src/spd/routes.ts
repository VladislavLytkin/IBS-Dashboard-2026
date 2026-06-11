import { Router } from 'express'
import { z } from 'zod'
import { addActionLog, load, update } from '../db/store'
import { requireAuth } from '../middleware/auth'
import type { AuthedRequest } from '../middleware/auth'
import type { SpdApplication, SpdApplicationStatus } from '../types'
import { studentForUser, visibleClassIds } from '../utils/access'

export const spdRouter = Router()
spdRouter.use(requireAuth)

// ===================== События СПД =====================
spdRouter.get('/events', (req: AuthedRequest, res) => {
  const items = [...load().spdEvents]
  // Учитель видит события только своих классов; ученик — события своего класса
  // и общешкольные; админ/завуч/директор — всё.
  const allowed = visibleClassIds(req.user!)
  const rows = allowed
    ? items.filter((e) => e.classIds.some((id) => allowed.includes(id)))
    : items
  res.json(rows.sort((a, b) => b.date.localeCompare(a.date)))
})

// ===================== Заявки учеников на СПД =====================
spdRouter.get('/applications', (req: AuthedRequest, res) => {
  const user = req.user!
  let items = [...load().spdApplications]
  if (user.role === 'STUDENT') {
    const own = studentForUser(user)
    items = own ? items.filter((a) => a.studentId === own.id) : []
  } else if (user.role === 'TEACHER') {
    items = items.filter((a) => (user.classIds ?? []).includes(a.classId))
  }
  res.json(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})

const applicationSchema = z.object({
  eventId: z.string().min(1, 'Выберите событие СПД'),
  comment: z.string().optional().default(''),
})

spdRouter.post('/applications', (req: AuthedRequest, res) => {
  const user = req.user!
  if (user.role !== 'STUDENT') {
    res.status(403).json({ error: 'Заявку на СПД подаёт ученик' })
    return
  }
  const parsed = applicationSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  const event = load().spdEvents.find((e) => e.id === parsed.data.eventId)
  if (!event) {
    res.status(404).json({ error: 'Событие СПД не найдено' })
    return
  }
  const student = studentForUser(user)
  if (!student) {
    res.status(404).json({ error: 'Профиль ученика не привязан к данным' })
    return
  }
  const duplicate = load().spdApplications.some(
    (a) => a.studentId === student.id && a.eventId === event.id && a.status !== 'rejected',
  )
  if (duplicate) {
    res.status(409).json({ error: 'Заявка на это событие уже подана' })
    return
  }
  const item: SpdApplication = {
    id: `spda-${Date.now()}`,
    studentId: student.id,
    studentName: student.fullName,
    classId: student.classId,
    eventId: event.id,
    comment: parsed.data.comment,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  update((s) => s.spdApplications.push(item))
  addActionLog({ userId: user.id, role: user.role, actionType: 'spd_application_created', target: event.title, description: `${student.fullName}: заявка на СПД` })
  res.status(201).json(item)
})

spdRouter.patch('/applications/:id', (req: AuthedRequest, res) => {
  const user = req.user!
  if (!['ADMIN', 'HEAD_TEACHER'].includes(user.role)) {
    res.status(403).json({ error: 'Заявки на СПД проверяет администратор или завуч' })
    return
  }
  const status = req.body?.status as SpdApplicationStatus | undefined
  if (status !== 'approved' && status !== 'rejected') {
    res.status(400).json({ error: 'Некорректный статус' })
    return
  }
  let result: SpdApplication | undefined
  update((s) => {
    const item = s.spdApplications.find((a) => a.id === req.params.id)
    if (!item) return
    item.status = status
    item.rejectionReason = status === 'rejected' ? String(req.body?.rejectionReason ?? '') : undefined
    item.reviewedAt = new Date().toISOString()
    item.reviewedBy = user.id
    result = item
  })
  if (!result) {
    res.status(404).json({ error: 'Заявка не найдена' })
    return
  }
  addActionLog({ userId: user.id, role: user.role, actionType: `spd_${status}`, target: result.studentName, description: status === 'approved' ? 'Заявка на СПД одобрена' : 'Заявка на СПД отклонена' })
  res.json(result)
})
