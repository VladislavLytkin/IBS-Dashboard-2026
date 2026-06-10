import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { examByClass, examComparison, examTypeFor } from '../data/generate'

export const examsRouter = Router()
examsRouter.use(requireAuth)

examsRouter.get('/comparison', (req, res) => {
  const { year, grade } = parseFilters(req)
  const g = grade ?? 11
  res.json({ year, grade: g, examType: examTypeFor(g), rows: examComparison(year, g) })
})

examsRouter.get('/by-class', (req, res) => {
  const { year, grade, classId } = parseFilters(req)
  const g = grade ?? 11
  if (!classId) {
    res.status(400).json({ error: 'Не указан classId' })
    return
  }
  res.json({ year, grade: g, examType: examTypeFor(g), classId, rows: examByClass(year, g, classId) })
})
