import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { load, update } from '../db/store'
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
    createdAt: new Date().toISOString(),
  }
  update((s) => s.users.push(user))
  res.status(201).json(toPublic(user))
})

const patchSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  role: z.enum(ROLES as [Role, ...Role[]]).optional(),
  password: z.string().min(6).optional(),
  classIds: z.array(z.string()).optional(),
})

usersRouter.patch('/:id', async (req, res) => {
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
  if (data.email) user.email = data.email
  if (data.fullName) user.fullName = data.fullName
  if (data.role) user.role = data.role
  if (data.classIds) user.classIds = data.classIds
  if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10)
  update(() => undefined)
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
