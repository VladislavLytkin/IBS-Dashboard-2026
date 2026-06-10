import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { addActionLog, load, update } from '../db/store'
import type { AuthedRequest } from '../middleware/auth'
import { requireAuth, requireRole } from '../middleware/auth'
import { ROLES, type Role, type User } from '../types'

export const usersRouter = Router()

// Управление пользователями — только для ADMIN.
usersRouter.use(requireAuth, requireRole('ADMIN'))

function toPublic(u: User) {
  const { passwordHash: _omit, ...rest } = u
  void _omit
  return rest
}

usersRouter.get('/', (_req, res) => {
  res.json(load().users.map(toPublic))
})

usersRouter.get('/:id', (req, res) => {
  const user = load().users.find((u) => u.id === req.params.id)
  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден' })
    return
  }
  res.json(toPublic(user))
})

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(ROLES as [Role, ...Role[]]),
  password: z.string().min(6, 'Минимум 6 символов'),
  classIds: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
})

usersRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  const data = parsed.data
  if (load().users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
    res.status(409).json({ error: 'Email уже используется' })
    return
  }
  const user: User = {
    id: `u-${Date.now()}`,
    email: data.email,
    fullName: data.fullName,
    role: data.role,
    passwordHash: await bcrypt.hash(data.password, 10),
    classIds: data.classIds,
    subjects: data.subjects,
    createdAt: new Date().toISOString(),
  }
  update((s) => s.users.push(user))
  addActionLog({ userId: (req as AuthedRequest).user!.id, role: (req as AuthedRequest).user!.role, actionType: 'user_created', target: user.email, description: `Создан пользователь: ${user.role}` })
  res.status(201).json(toPublic(user))
})

const patchSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  role: z.enum(ROLES as [Role, ...Role[]]).optional(),
  password: z.string().min(6).optional(),
  classIds: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
})

usersRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  const data = parsed.data
  const user = load().users.find((u) => u.id === req.params.id)
  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден' })
    return
  }
  const oldRole = user.role
  if (data.email) user.email = data.email
  if (data.fullName) user.fullName = data.fullName
  if (data.role) user.role = data.role
  if (data.classIds) user.classIds = data.classIds
  if (data.subjects) user.subjects = data.subjects
  if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10)
  update(() => undefined)
  addActionLog({
    userId: req.user!.id,
    role: req.user!.role,
    actionType: oldRole !== user.role ? 'role_changed' : 'user_updated',
    target: user.email,
    description: oldRole !== user.role ? `Роль изменена: ${oldRole} → ${user.role}` : 'Обновлён профиль пользователя',
  })
  res.json(toPublic(user))
})

usersRouter.delete('/:id', (req, res) => {
  const idx = load().users.findIndex((u) => u.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: 'Пользователь не найден' })
    return
  }
  update((s) => s.users.splice(idx, 1))
  res.json({ ok: true })
})
