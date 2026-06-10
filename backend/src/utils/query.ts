import type { Request } from 'express'

export function parseFilters(req: Request) {
  const year = Number(req.query.year) || 2026
  const gradeRaw = req.query.grade
  const grade = gradeRaw != null && gradeRaw !== '' && gradeRaw !== 'all' ? Number(gradeRaw) : undefined
  const classId = typeof req.query.classId === 'string' && req.query.classId ? req.query.classId : undefined
  return { year, grade, classId }
}
