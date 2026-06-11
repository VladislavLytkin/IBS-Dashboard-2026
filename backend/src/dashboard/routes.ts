import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthedRequest } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { classRating, dashboardSummary, olympiadRating } from '../data/generate'
import { visibleClassIds } from '../utils/access'

export const dashboardRouter = Router()
dashboardRouter.use(requireAuth)

dashboardRouter.get('/summary', (req: AuthedRequest, res) => {
  const { year, grade } = parseFilters(req)
  res.json(dashboardSummary(year, grade, visibleClassIds(req.user!)))
})

// Учитель и ученик видят в рейтингах только закреплённые за ними классы.
function filterRating(req: AuthedRequest, rows: ReturnType<typeof classRating>) {
  const allowed = visibleClassIds(req.user!)
  if (!allowed) return rows
  const set = new Set(allowed)
  return rows.filter((c) => set.has(c.id))
}

dashboardRouter.get('/class-rating', (req: AuthedRequest, res) => {
  const { year, grade } = parseFilters(req)
  res.json(filterRating(req, classRating(year, grade)))
})

// Итоговый рейтинг классов = тот же расчёт finalScore, отсортированный по убыванию.
dashboardRouter.get('/final-rating', (req: AuthedRequest, res) => {
  const { year, grade } = parseFilters(req)
  res.json(filterRating(req, classRating(year, grade)))
})

dashboardRouter.get('/olympiad-rating', (req: AuthedRequest, res) => {
  const { year, grade } = parseFilters(req)
  const allowed = visibleClassIds(req.user!)
  let rows = olympiadRating(year, grade)
  if (allowed) {
    // В олимпиадном рейтинге classId хранится без префикса года (напр. «11А»).
    const set = new Set(allowed.map((id) => id.replace(/^\d+-/, '')))
    rows = rows.filter((r) => set.has(r.classId))
  }
  res.json(rows)
})
