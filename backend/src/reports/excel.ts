import ExcelJS from 'exceljs'
import type { ReportType } from '../types'
import {
  classRating, examByClass, listClasses, listStudents, olympiadRating, risks,
} from '../data/generate'

type Header = { header: string; key: string; width?: number }

function addSheet(wb: ExcelJS.Workbook, name: string, columns: Header[], rows: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name)
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }))
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).alignment = { vertical: 'middle' }
  rows.forEach((r) => ws.addRow(r))
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

function sheetFinalRating(wb: ExcelJS.Workbook, year: number, grade?: number) {
  const rows = classRating(year, grade).map((c) => ({
    year: c.year, grade: c.grade, name: c.name, finalScore: c.finalScore,
    academic: c.academicScore, olympiad: c.olympiadScore, attendance: c.attendanceScore,
    activity: c.activityScore, risk: c.riskScore, weeklyDelta: c.weeklyDelta,
  }))
  addSheet(wb, 'Итоговый рейтинг', [
    { header: 'Год', key: 'year' }, { header: 'Параллель', key: 'grade' }, { header: 'Класс', key: 'name' },
    { header: 'Итоговый балл', key: 'finalScore' }, { header: 'Академический', key: 'academic' },
    { header: 'Олимпиадный', key: 'olympiad' }, { header: 'Посещаемость', key: 'attendance' },
    { header: 'Активность', key: 'activity' }, { header: 'Риск', key: 'risk' },
    { header: 'Динамика/нед', key: 'weeklyDelta' },
  ], rows)
}

function sheetRisks(wb: ExcelJS.Workbook, year: number, grade?: number) {
  const rows = risks(year, grade).map((r) => ({
    year, classId: r.classId.replace(/^\d+-/, ''), student: r.fullName,
    riskScore: r.riskScore, riskLevel: r.riskLevel,
    reasons: r.reasons.join('; '), recommendations: r.recommendations.join('; '),
  }))
  addSheet(wb, 'Риски учеников', [
    { header: 'Год', key: 'year' }, { header: 'Класс', key: 'classId' }, { header: 'Ученик', key: 'student', width: 24 },
    { header: 'riskScore', key: 'riskScore' }, { header: 'riskLevel', key: 'riskLevel' },
    { header: 'Причины риска', key: 'reasons', width: 40 }, { header: 'Рекомендации', key: 'recommendations', width: 40 },
  ], rows)
}

function sheetOlympiads(wb: ExcelJS.Workbook, year: number, grade?: number) {
  const ranking = olympiadRating(year, grade)
  const rows = ranking.map((r) => {
    const students = listStudents(year, r.grade, `${year}-${r.classId}`)
    const participants = students.filter((s) => s.olympiadParticipation).length
    const prizers = students.reduce((sum, s) => sum + s.olympiadAwards, 0)
    return {
      year, grade: r.grade, classId: r.classId, subject: 'Все направления',
      participants, prizers, winners: Math.round(prizers * 0.4), index: r.index,
    }
  })
  addSheet(wb, 'Олимпиады', [
    { header: 'Год', key: 'year' }, { header: 'Параллель', key: 'grade' }, { header: 'Класс', key: 'classId' },
    { header: 'Предмет', key: 'subject', width: 20 }, { header: 'Участники', key: 'participants' },
    { header: 'Призёры', key: 'prizers' }, { header: 'Победители', key: 'winners' },
    { header: 'Олимп. индекс', key: 'index' },
  ], rows)
}

function sheetExams(wb: ExcelJS.Workbook, year: number, grade?: number) {
  const targetGrades = grade ? [grade] : [11, 9]
  const rows: Record<string, unknown>[] = []
  for (const g of targetGrades) {
    for (const cls of listClasses(year, g)) {
      examByClass(year, g, cls.id).forEach((r) => {
        rows.push({ year, grade: g, name: cls.name, subject: r.subject, school: r.school, city: r.city, region: r.region })
      })
    }
  }
  addSheet(wb, 'ЕГЭ-Экзамены', [
    { header: 'Год', key: 'year' }, { header: 'Параллель', key: 'grade' }, { header: 'Класс', key: 'name' },
    { header: 'Предмет', key: 'subject', width: 24 }, { header: 'Школа №123', key: 'school' },
    { header: 'Город', key: 'city' }, { header: 'Регион', key: 'region' },
  ], rows)
}

function sheetAttendance(wb: ExcelJS.Workbook, year: number, grade?: number) {
  const rows = classRating(year, grade).map((c) => ({
    year, grade: c.grade, name: c.name, attendance: c.attendanceScore,
    absencePct: Math.round((100 - c.attendanceScore) * 10) / 10,
  }))
  addSheet(wb, 'Посещаемость', [
    { header: 'Год', key: 'year' }, { header: 'Параллель', key: 'grade' }, { header: 'Класс', key: 'name' },
    { header: 'Посещаемость, %', key: 'attendance' }, { header: 'Пропуски, %', key: 'absencePct' },
  ], rows)
}

export async function buildReportWorkbook(type: ReportType, year: number, grade?: number): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'IBS School Dashboard'
  wb.created = new Date()

  switch (type) {
    case 'final-rating': sheetFinalRating(wb, year, grade); break
    case 'risks': sheetRisks(wb, year, grade); break
    case 'olympiads': sheetOlympiads(wb, year, grade); break
    case 'exams': sheetExams(wb, year, grade); break
    case 'attendance': sheetAttendance(wb, year, grade); break
    case 'full':
    default:
      sheetFinalRating(wb, year, grade)
      sheetRisks(wb, year, grade)
      sheetOlympiads(wb, year, grade)
      sheetExams(wb, year, grade)
      sheetAttendance(wb, year, grade)
      break
  }
  return Buffer.from(await wb.xlsx.writeBuffer())
}
