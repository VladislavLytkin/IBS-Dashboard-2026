import { Router } from 'express'
import { load, update } from '../db/store'
import { requireAuth } from '../middleware/auth'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

notificationsRouter.get('/', (_req, res) => {
  const list = [...load().notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json({ items: list, unread: list.filter((n) => !n.read).length })
})

notificationsRouter.patch('/read-all', (_req, res) => {
  update((s) => s.notifications.forEach((n) => (n.read = true)))
  res.json({ ok: true })
})

notificationsRouter.patch('/:id/read', (req, res) => {
  const n = load().notifications.find((x) => x.id === req.params.id)
  if (!n) {
    res.status(404).json({ error: 'Уведомление не найдено' })
    return
  }
  n.read = true
  update(() => undefined)
  res.json(n)
})
