import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { classRating, dashboardSummary, olympiadRating } from '../data/generate'

export const dashboardRouter = Router()
dashboardRouter.use(requireAuth)

dashboardRouter.get('/summary', (req, res) => {
  const { year, grade } = parseFilters(req)
  res.json(dashboardSummary(year, grade))
})

dashboardRouter.get('/class-rating', (req, res) => {
  const { year, grade } = parseFilters(req)
  res.json(classRating(year, grade))
})

// Итоговый рейтинг классов = тот же расчёт finalScore, отсортированный по убыванию.
dashboardRouter.get('/final-rating', (req, res) => {
  const { year, grade } = parseFilters(req)
  res.json(classRating(year, grade))
})

dashboardRouter.get('/olympiad-rating', (req, res) => {
  const { year, grade } = parseFilters(req)
  res.json(olympiadRating(year, grade))
})
