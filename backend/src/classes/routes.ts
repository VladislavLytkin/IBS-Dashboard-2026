import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthedRequest } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { getClass, listClasses } from '../data/generate'
import { isClassVisible } from '../utils/access'

export const classesRouter = Router()
classesRouter.use(requireAuth)

classesRouter.get('/', (req: AuthedRequest, res) => {
  const { year, grade } = parseFilters(req)
  const rows = listClasses(year, grade).filter((c) => isClassVisible(req.user!, c.id))
  res.json(rows)
})

classesRouter.get('/:id', (req: AuthedRequest, res) => {
  const cls = getClass(req.params.id)
  if (!cls) {
    res.status(404).json({ error: 'Класс не найден' })
    return
  }
  if (!isClassVisible(req.user!, cls.id)) {
    res.status(403).json({ error: 'Нет доступа к этому классу' })
    return
  }
  res.json(cls)
})
