import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { getStudent, listStudents } from '../data/generate'

export const studentsRouter = Router()
studentsRouter.use(requireAuth)

studentsRouter.get('/', (req, res) => {
  const { year, grade, classId } = parseFilters(req)
  res.json(listStudents(year, grade, classId))
})

studentsRouter.get('/:id', (req, res) => {
  const student = getStudent(req.params.id)
  if (!student) {
    res.status(404).json({ error: 'Ученик не найден' })
    return
  }
  res.json(student)
})
