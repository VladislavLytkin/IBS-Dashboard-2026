import { Router } from 'express'
import { load, update } from '../db/store'
import { requireAuth } from '../middleware/auth'
import type { AuthedRequest } from '../middleware/auth'
import type { AppNotification } from '../types'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

notificationsRouter.get('/', (req: AuthedRequest, res) => {
  const user = req.user!
  let list: AppNotification[] = []
  if (user.role === 'STUDENT') {
    list = load().messages
      .filter((m) => m.toUserId === user.id && ['TEACHER', 'ADMIN', 'HEAD_TEACHER', 'DIRECTOR'].includes(m.fromRole))
      .map((m) => ({
        id: `msg:${m.id}`,
        type: m.type === 'academic_debt' ? 'grades' : m.type === 'absence_comment' ? 'attendance' : m.type === 'office_call' ? 'system' : 'system',
        title: m.fromRole === 'HEAD_TEACHER' || m.fromRole === 'DIRECTOR' ? `Администрация школы: ${m.title}` : m.title,
        message: m.text,
        createdAt: m.createdAt,
        read: m.isRead,
      }))
  } else {
    list = [...load().notifications]
  }
  list = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json({ items: list, unread: list.filter((n) => !n.read).length })
})

notificationsRouter.patch('/read-all', (req: AuthedRequest, res) => {
  update((s) => {
    if (req.user!.role === 'STUDENT') {
      s.messages.forEach((m) => {
        if (m.toUserId === req.user!.id) m.isRead = true
      })
      return
    }
    s.notifications.forEach((n) => (n.read = true))
  })
  res.json({ ok: true })
})

notificationsRouter.patch('/:id/read', (req: AuthedRequest, res) => {
  if (req.params.id.startsWith('msg:')) {
    const id = req.params.id.slice(4)
    let found = false
    update((s) => {
      const msg = s.messages.find((x) => x.id === id && x.toUserId === req.user!.id)
      if (!msg) return
      msg.isRead = true
      found = true
    })
    if (!found) {
      res.status(404).json({ error: 'Уведомление не найдено' })
      return
    }
    res.json({ ok: true })
    return
  }
  const n = load().notifications.find((x) => x.id === req.params.id)
  if (!n) {
    res.status(404).json({ error: 'Уведомление не найдено' })
    return
  }
  n.read = true
  update(() => undefined)
  res.json(n)
})
