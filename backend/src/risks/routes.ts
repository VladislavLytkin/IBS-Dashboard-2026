import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AuthedRequest } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { riskByStudent, risks } from '../data/generate'
import { canAccessStudent, filterStudentsForUser } from '../utils/access'

export const risksRouter = Router()
risksRouter.use(requireAuth)

// Риски доступны управленческим ролям и аналитику (учителю — только просмотр своих, упрощено для прототипа).
const canViewRisks = requireRole('ADMIN', 'DIRECTOR', 'HEAD_TEACHER', 'ANALYST', 'TEACHER', 'STUDENT')

risksRouter.get('/', canViewRisks, (req: AuthedRequest, res) => {
  const { year, grade, classId } = parseFilters(req)
  const allowedIds = new Set(filterStudentsForUser(req.user!, risks(year, grade, classId).map((r) => ({
    id: r.studentId,
    year: r.year,
    classId: r.classId,
    grade: r.grade,
    fullName: r.fullName,
    gender: 'ж',
    averageGrade: 0,
    previousAverageGrade: 0,
    attendanceRate: 0,
    absenceCount: 0,
    olympiadParticipation: false,
    olympiadAwards: 0,
    activityScore: 0,
    projectCount: 0,
    riskScore: r.riskScore,
    riskLevel: r.riskLevel,
    riskReasons: r.reasons,
    recommendations: r.recommendations,
  })), year).map((s) => s.id))
  res.json(risks(year, grade, classId).filter((r) => allowedIds.has(r.studentId)))
})

risksRouter.get('/:studentId', canViewRisks, (req: AuthedRequest, res) => {
  const prediction = riskByStudent(req.params.studentId)
  if (!prediction) {
    res.status(404).json({ error: 'Ученик не найден' })
    return
  }
  if (!canAccessStudent(req.user!, req.params.studentId)) {
    res.status(403).json({ error: 'Нет доступа к рискам этого ученика' })
    return
  }
  res.json(prediction)
})
