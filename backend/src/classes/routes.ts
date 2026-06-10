import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { getClass, listClasses } from '../data/generate'

export const classesRouter = Router()
classesRouter.use(requireAuth)

classesRouter.get('/', (req, res) => {
  const { year, grade } = parseFilters(req)
  res.json(listClasses(year, grade))
})

classesRouter.get('/:id', (req, res) => {
  const cls = getClass(req.params.id)
  if (!cls) {
    res.status(404).json({ error: 'Класс не найден' })
    return
  }
  res.json(cls)
})
