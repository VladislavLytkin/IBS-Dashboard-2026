import { Router } from 'express'
import { z } from 'zod'
import { addActionLog, load, update } from '../db/store'
import { requireAuth } from '../middleware/auth'
import { parseFilters } from '../utils/query'
import { olympiadByClass, olympiadComparison, olympiadRating } from '../data/generate'
import type { AuthedRequest } from '../middleware/auth'
import type { OlympiadApplicationStatus, OlympiadCatalogItem } from '../types'
import { visibleClassIds } from '../utils/access'

export const olympiadsRouter = Router()
olympiadsRouter.use(requireAuth)

olympiadsRouter.get('/comparison', (req, res) => {
  const { year, grade } = parseFilters(req)
  res.json({ year, grade: grade ?? null, rows: olympiadComparison(year, grade ?? 11) })
})

olympiadsRouter.get('/rating', (req: AuthedRequest, res) => {
  const { year, grade } = parseFilters(req)
  const approved = load().olympiadApplications.filter((a) => a.status === 'approved' && a.classId.startsWith(`${year}-`))
  let rows = olympiadRating(year, grade).map((row) => {
    const count = approved.filter((a) => a.classId.replace(/^\d+-/, '') === row.classId).length
    return count ? { ...row, index: Math.min(100, row.index + count * 5), participationPct: Math.min(100, row.participationPct + count * 2) } : row
  })
  const allowed = visibleClassIds(req.user!)
  if (allowed) {
    const set = new Set(allowed.map((id) => id.replace(/^\d+-/, '')))
    rows = rows.filter((r) => set.has(r.classId))
  }
  res.json(rows.sort((a, b) => b.index - a.index))
})

// ===================== Справочник олимпиад (поиск + добавление) =====================
olympiadsRouter.get('/catalog', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : ''
  let items = [...load().olympiadCatalog]
  if (q) items = items.filter((o) => o.name.toLowerCase().includes(q) || o.subject.toLowerCase().includes(q))
  res.json(items.sort((a, b) => a.name.localeCompare(b.name, 'ru')))
})

const catalogSchema = z.object({
  name: z.string().min(2, 'Укажите название олимпиады'),
  subject: z.string().min(2, 'Укажите предмет'),
  officialWebsiteUrl: z.string().url('Укажите корректную ссылку на официальный сайт'),
})

olympiadsRouter.post('/catalog', (req: AuthedRequest, res) => {
  const parsed = catalogSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  const existing = load().olympiadCatalog.find((o) => o.name.trim().toLowerCase() === parsed.data.name.trim().toLowerCase())
  if (existing) {
    res.status(409).json({ error: 'Такая олимпиада уже есть в списке' })
    return
  }
  const user = req.user!
  const item: OlympiadCatalogItem = {
    id: `oc-${Date.now()}`,
    name: parsed.data.name.trim(),
    subject: parsed.data.subject.trim(),
    officialWebsiteUrl: parsed.data.officialWebsiteUrl.trim(),
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  }
  update((s) => s.olympiadCatalog.push(item))
  addActionLog({ userId: user.id, role: user.role, actionType: 'olympiad_catalog_added', target: item.name, description: `Добавлена олимпиада: ${item.subject}` })
  res.status(201).json(item)
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

const appSchema = z.object({
  studentName: z.string().min(2),
  classId: z.string().min(2),
  title: z.string().min(2),
  level: z.string().min(2),
  subject: z.string().min(2),
  participationDate: z.string().min(4),
  result: z.string().min(2),
  placeOrDegree: z.string().optional().default(''),
  confirmationUrl: z.string().optional().default(''),
  studentComment: z.string().optional().default(''),
})

olympiadsRouter.get('/applications', (req: AuthedRequest, res) => {
  const user = req.user!
  let items = [...load().olympiadApplications]
  if (user.role === 'STUDENT') items = items.filter((a) => a.createdBy === user.id)
  if (user.role === 'TEACHER' && user.classIds?.length) items = items.filter((a) => user.classIds!.includes(a.classId))
  res.json(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})

olympiadsRouter.post('/applications', (req: AuthedRequest, res) => {
  const parsed = appSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  const user = req.user!
  const item = {
    id: `oa-${Date.now()}`,
    createdBy: user.id,
    status: 'pending' as OlympiadApplicationStatus,
    createdAt: new Date().toISOString(),
    ...parsed.data,
  }
  update((s) => s.olympiadApplications.push(item))
  addActionLog({ userId: user.id, role: user.role, actionType: 'olympiad_application_created', target: item.title, description: `${item.studentName}: ${item.subject}` })
  res.status(201).json(item)
})

olympiadsRouter.patch('/applications/:id', (req: AuthedRequest, res) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Валидировать заявки может только администратор' })
    return
  }
  const status = req.body?.status as OlympiadApplicationStatus | undefined
  if (status !== 'approved' && status !== 'rejected') {
    res.status(400).json({ error: 'Некорректный статус' })
    return
  }
  let found = false
  let result: unknown
  update((s) => {
    const item = s.olympiadApplications.find((a) => a.id === req.params.id)
    if (!item) return
    found = true
    item.status = status
    item.rejectionReason = status === 'rejected' ? String(req.body?.rejectionReason ?? '') : undefined
    item.reviewedAt = new Date().toISOString()
    item.reviewedBy = req.user!.id
    result = item
  })
  if (!found) {
    res.status(404).json({ error: 'Заявка не найдена' })
    return
  }
  addActionLog({ userId: req.user!.id, role: req.user!.role, actionType: `olympiad_${status}`, target: req.params.id, description: status === 'approved' ? 'Олимпиадная заявка подтверждена' : 'Олимпиадная заявка отклонена' })
  res.json(result)
})
