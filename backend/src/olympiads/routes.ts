import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { olympiadByClass, olympiadComparison, olympiadRating } from '../data/generate'

export const olympiadsRouter = Router()
olympiadsRouter.use(requireAuth)

olympiadsRouter.get('/comparison', (req, res) => {
  const { year, grade } = parseFilters(req)
  res.json({ year, grade: grade ?? null, rows: olympiadComparison(year, grade ?? 11) })
})

olympiadsRouter.get('/rating', (req, res) => {
  const { year, grade } = parseFilters(req)
  res.json(olympiadRating(year, grade))
})

olympiadsRouter.get('/by-class', (req, res) => {
  const { year, grade, classId } = parseFilters(req)
  const g = grade ?? 11
  if (!classId) {
    res.status(400).json({ error: 'Не указан classId' })
    return
  }
  res.json({ year, grade: g, classId, rows: olympiadByClass(year, g, classId) })
})
