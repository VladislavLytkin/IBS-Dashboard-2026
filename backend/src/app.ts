import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
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
import { workflowRouter } from './workflow/routes'
import { spdRouter } from './spd/routes'

export function createApp() {
  const app = express()
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist')
  const frontendIndexPath = path.join(frontendDistPath, 'index.html')

  app.set('trust proxy', 1)
  app.use((req, res, next) => {
    const origin = req.get('origin')
    const sameHostOrigin = origin ? isSameHostOrigin(origin, req.get('host')) : false
    const allowedOrigin = origin && (sameHostOrigin || ENV.CORS_ORIGINS.includes(origin)) ? origin : false

    cors({ origin: allowedOrigin, credentials: true })(req, res, next)
  })
  app.use(express.json())
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
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
  app.use('/api/workflow', workflowRouter)
  app.use('/api/spd', spdRouter)

  app.use(express.static(frontendDistPath))
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res, next) => {
    if (!fs.existsSync(frontendIndexPath)) {
      next()
      return
    }

    res.sendFile(frontendIndexPath)
  })

  app.use((_req, res) => res.status(404).json({ error: 'Маршрут не найден' }))

  return app
}

function isSameHostOrigin(origin: string, host?: string): boolean {
  if (!host) return false

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
