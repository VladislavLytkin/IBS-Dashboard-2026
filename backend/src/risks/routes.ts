import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { riskByStudent, risks } from '../data/generate'

export const risksRouter = Router()
risksRouter.use(requireAuth)

// Риски доступны управленческим ролям и аналитику (учителю — только просмотр своих, упрощено для прототипа).
const canViewRisks = requireRole('ADMIN', 'DIRECTOR', 'HEAD_TEACHER', 'ANALYST', 'TEACHER', 'STUDENT')

risksRouter.get('/', canViewRisks, (req, res) => {
  const { year, grade, classId } = parseFilters(req)
  res.json(risks(year, grade, classId))
})

risksRouter.get('/:studentId', canViewRisks, (req, res) => {
  const prediction = riskByStudent(req.params.studentId)
  if (!prediction) {
    res.status(404).json({ error: 'Ученик не найден' })
    return
  }
  res.json(prediction)
})
