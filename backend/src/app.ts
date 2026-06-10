import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { ENV } from './config/env'
import { META } from './data/generate'
import { authRouter } from './auth/routes'
import { usersRouter } from './users/routes'
import { dashboardRouter } from './dashboard/routes'
import { classesRouter } from './classes/routes'
import { studentsRouter } from './students/routes'
import { examsRouter } from './exams/routes'
import { olympiadsRouter } from './olympiads/routes'
import { risksRouter } from './risks/routes'
import { settingsRouter } from './settings/routes'
import { notificationsRouter } from './notifications/routes'
import { reportsRouter } from './reports/routes'

export function createApp() {
  const app = express()

  app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.get('/api/meta', (_req, res) => res.json(META))

  app.use('/api/auth', authRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/dashboard', dashboardRouter)
  app.use('/api/classes', classesRouter)
  app.use('/api/students', studentsRouter)
  app.use('/api/exams', examsRouter)
  app.use('/api/olympiads', olympiadsRouter)
  app.use('/api/risks', risksRouter)
  app.use('/api/settings', settingsRouter)
  app.use('/api/notifications', notificationsRouter)
  app.use('/api/reports', reportsRouter)

  app.use((_req, res) => res.status(404).json({ error: 'Маршрут не найден' }))

  return app
}
