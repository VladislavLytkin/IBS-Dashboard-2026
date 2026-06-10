import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { ENV } from '../config/env'
import { load } from '../db/store'
import type { PublicUser, Role } from '../types'

export interface AuthedRequest extends Request {
  user?: PublicUser
}

export interface JwtPayload {
  sub: string
  role: Role
}

function extractToken(req: Request): string | null {
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.token
  if (cookieToken) return cookieToken
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) return header.slice(7)
  return null
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Не авторизован' })
    return
  }
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload
    const user = load().users.find((u) => u.id === payload.sub)
    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' })
      return
    }
    const { passwordHash: _omit, ...publicUser } = user
    void _omit
    req.user = publicUser
    next()
  } catch {
    res.status(401).json({ error: 'Недействительный токен' })
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Не авторизован' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Нет доступа для вашей роли' })
      return
    }
    next()
  }
}
