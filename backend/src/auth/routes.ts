import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { ENV } from '../config/env'
import { load } from '../db/store'
import { requireAuth, type AuthedRequest } from '../middleware/auth'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  const { email, password } = parsed.data
  const user = load().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Неверный email или пароль' })
    return
  }
  const token = jwt.sign({ sub: user.id, role: user.role }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // прототип на http://localhost
    maxAge: 12 * 60 * 60 * 1000,
  })
  const { passwordHash: _omit, ...publicUser } = user
  void _omit
  res.json({ user: publicUser, token })
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user })
})
