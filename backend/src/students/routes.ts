import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthedRequest } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { getStudent, listStudents } from '../data/generate'
import { canAccessStudent, filterStudentsForUser } from '../utils/access'

export const studentsRouter = Router()
studentsRouter.use(requireAuth)

studentsRouter.get('/', (req: AuthedRequest, res) => {
  const { year, grade, classId } = parseFilters(req)
  res.json(filterStudentsForUser(req.user!, listStudents(year, grade, classId), year))
})

studentsRouter.get('/:id', (req: AuthedRequest, res) => {
  const student = getStudent(req.params.id)
  if (!student) {
    res.status(404).json({ error: 'Ученик не найден' })
    return
  }
  if (!canAccessStudent(req.user!, student.id)) {
    res.status(403).json({ error: 'Нет доступа к данным этого ученика' })
    return
  }
  res.json(student)
})
