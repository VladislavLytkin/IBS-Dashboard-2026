import { Router } from 'express'
import { load, update } from '../db/store'
import { requireAuth, requireRole } from '../middleware/auth'

export const settingsRouter = Router()
settingsRouter.use(requireAuth)

settingsRouter.get('/', (_req, res) => {
  res.json(load().settings)
})

// Изменять настройки могут ADMIN и DIRECTOR. Делаем неглубокий merge по секциям.
settingsRouter.patch('/', requireRole('ADMIN', 'DIRECTOR'), (req, res) => {
  const body = req.body ?? {}
  const next = update((s) => {
    s.settings = {
      general: { ...s.settings.general, ...(body.general ?? {}) },
      notifications: { ...s.settings.notifications, ...(body.notifications ?? {}) },
      reports: { ...s.settings.reports, ...(body.reports ?? {}) },
    }
    return s.settings
  })
  res.json(next)
})
