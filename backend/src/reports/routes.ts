import { Router } from 'express'
import { z } from 'zod'
import { load, update } from '../db/store'
import { requireAuth, type AuthedRequest } from '../middleware/auth'
import type { ReportHistoryItem, ReportType } from '../types'
import { buildReportWorkbook } from './excel'

export const reportsRouter = Router()
reportsRouter.use(requireAuth)

const REPORT_TYPES: ReportType[] = ['final-rating', 'exams', 'olympiads', 'attendance', 'risks', 'full']
const TYPE_LABEL: Record<ReportType, string> = {
  'final-rating': 'Итоговый рейтинг',
  exams: 'ЕГЭ / экзамены',
  olympiads: 'Олимпиады',
  attendance: 'Посещаемость',
  risks: 'Риски',
  full: 'Полный отчёт',
}

reportsRouter.get('/history', (_req, res) => {
  const list = [...load().reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json(list.map((r) => ({ ...r, typeLabel: TYPE_LABEL[r.type] })))
})

const exportSchema = z.object({
  type: z.enum(REPORT_TYPES as [ReportType, ...ReportType[]]),
  year: z.number().int(),
  grade: z.number().int().nullable().optional(),
  classId: z.string().nullable().optional(),
})

async function streamReport(res: import('express').Response, item: ReportHistoryItem) {
  const buffer = await buildReportWorkbook(item.type, item.year, item.grade ?? undefined)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${item.fileName}"`)
  res.send(buffer)
}

// Сформировать отчёт: записать в историю и сразу отдать .xlsx файл.
reportsRouter.post('/export', async (req: AuthedRequest, res) => {
  const parsed = exportSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' })
    return
  }
  const { type, year } = parsed.data
  const grade = parsed.data.grade ?? null
  const classId = parsed.data.classId ?? null
  const fileName = `${type}-${year}${grade ? `-${grade}` : ''}.xlsx`

  const item: ReportHistoryItem = {
    id: `rep-${Date.now()}`,
    type, year, grade, classId,
    status: 'done',
    createdAt: new Date().toISOString(),
    createdBy: req.user?.email ?? 'unknown',
    fileName,
  }
  update((s) => s.reports.push(item))
  await streamReport(res, item)
})

// Повторное скачивание из истории (перегенерация файла).
reportsRouter.get('/:id/download', async (req, res) => {
  const item = load().reports.find((r) => r.id === req.params.id)
  if (!item) {
    res.status(404).json({ error: 'Отчёт не найден' })
    return
  }
  await streamReport(res, item)
})
