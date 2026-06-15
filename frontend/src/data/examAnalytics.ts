// ============================================================
// Аналитика экзаменов для единого раздела «Экзамены».
//
// Строится поверх синтетических результатов ученика (data/studentExams.ts):
// никакого отдельного датасета «по параллели» — те же факты агрегируются на
// трёх уровнях: ученик / класс / параллель.
//
// Баллы разных экзаменов несравнимы напрямую (ЕГЭ 0–100, ОГЭ первичные и т.д.),
// поэтому везде используется score_percent = score / maxScore * 100.
//
// Типы экзаменов (по ТЗ): директорский / общий / ЕГЭ / ОГЭ / ВПР / пробный.
//   «Внутренний экзамен» → директорский (director)
//   ЕГЭ / ОГЭ / ВПР      → общие (general), каждый со своим kind
//   «Пробный ЕГЭ»        → пробный (mock) — синтезируется для 11 классов
// ============================================================

import type { StudentExamType } from '../types'
import { between, rngFor, round1 } from '../utils/random'
import { STUDENTS, getCurrentAcademicYearStart } from './students'
import { getAssignedExamSubjects, getStudentExamRows } from './studentExams'
import { academicYearLabel, getStudentAcademicInfo } from './grades'
import { cityForStudent, type City } from './cities'

export type ExamKind = 'ege' | 'oge' | 'vpr' | 'director' | 'mock'

/** Значение фильтра «Тип экзамена». */
export type ExamTypeFilter = 'all' | 'director' | 'general' | 'ege' | 'oge' | 'vpr' | 'mock'

export const EXAM_TYPE_OPTIONS: { value: ExamTypeFilter; label: string }[] = [
  { value: 'all', label: 'Все экзамены' },
  { value: 'director', label: 'Директорский' },
  { value: 'general', label: 'Общий' },
  { value: 'ege', label: 'ЕГЭ' },
  { value: 'oge', label: 'ОГЭ' },
  { value: 'vpr', label: 'ВПР' },
  { value: 'mock', label: 'Пробный экзамен' },
]

const KIND_OF: Record<StudentExamType, ExamKind> = {
  'ЕГЭ': 'ege',
  'ОГЭ': 'oge',
  'ВПР': 'vpr',
  'Внутренний экзамен': 'director',
}

const KIND_LABEL: Record<ExamKind, string> = {
  ege: 'ЕГЭ', oge: 'ОГЭ', vpr: 'ВПР', director: 'Директорский', mock: 'Пробный ЕГЭ',
}

/** Совпадает ли вид экзамена с выбранным фильтром типа. */
export function matchType(kind: ExamKind, filter: ExamTypeFilter): boolean {
  switch (filter) {
    case 'all': return true
    case 'director': return kind === 'director'
    case 'general': return kind === 'ege' || kind === 'oge' || kind === 'vpr'
    case 'mock': return kind === 'mock'
    default: return kind === filter
  }
}

/** Один факт сдачи экзамена, обогащённый связями (класс/параллель/город) и процентом. */
export interface ExamFact {
  studentId: string
  studentName: string
  classId: string
  grade: number
  city: City
  examType: string
  kind: ExamKind
  subject: string
  examDate: string
  academicYear: string
  score: number
  maxScore: number
  percent: number
  riskLevel: string
  // Флаги-классификаторы (по ТЗ: is_director_exam / is_ege / is_oge / is_mock).
  isDirector: boolean
  isEge: boolean
  isOge: boolean
  isMock: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')
const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v))

// ----- Пробные ЕГЭ (синтез для 11 классов) -----
// Реальный генератор (studentExams) пробников не создаёт. Здесь, в аналитическом
// слое, детерминированно добавляем 3 пробника в выпускной год для 11-й параллели:
// ноябрь / февраль / апрель, с лёгким ростом «от пробника к пробнику».

function mockSubjectsFor(studentId: string): string[] {
  return getAssignedExamSubjects(studentId, 'ЕГЭ', academicYearLabel(getCurrentAcademicYearStart()))
}

function buildMockFacts(s: (typeof STUDENTS)[number], city: City): ExamFact[] {
  if (s.grade !== 11) return []
  const { exitDate } = getStudentAcademicInfo(s.id)
  const currentStart = getCurrentAcademicYearStart()
  const todayIso = new Date().toISOString().slice(0, 10)
  const dateLimit = exitDate && exitDate < todayIso ? exitDate : todayIso
  const subjects = mockSubjectsFor(s.id)
  const ability = clamp(0, 1, (s.averageGrade - 2.7) / 2.2)
  const out: ExamFact[] = []

  const slots: [number, number][] = [[currentStart, 10], [currentStart, 12], [currentStart + 1, 3]]
  slots.forEach(([yy, mm], idx) => {
    const examDate = `${yy}-${pad(mm)}-15`
    if (examDate > dateLimit) return
    for (const subject of subjects) {
      const rnd = rngFor(`mock:${s.id}:${subject}:${currentStart}:${mm}`)
      const score = clamp(0, 100, Math.round(38 + ability * 50 + idx * 3 + between(rnd, -7, 7)))
      out.push({
        studentId: s.id, studentName: s.fullName, classId: s.classId, grade: 11, city,
        examType: KIND_LABEL.mock, kind: 'mock', subject, examDate,
        academicYear: academicYearLabel(currentStart),
        score, maxScore: 100, percent: score,
        riskLevel: s.riskLevel,
        isDirector: false, isEge: false, isOge: false, isMock: true,
      })
    }
  })
  return out
}

function gradeInAcademicYear(s: (typeof STUDENTS)[number], academicYear: string): number {
  const start = Number(academicYear.split('/')[0])
  return s.grade - (getCurrentAcademicYearStart() - start)
}

let factsCache: ExamFact[] | null = null

function getFacts(): ExamFact[] {
  if (factsCache) return factsCache
  const out: ExamFact[] = []
  for (const s of STUDENTS) {
    const city = cityForStudent(s.id)
    for (const r of getStudentExamRows(s.id)) {
      const kind = KIND_OF[r.examType]
      const grade = gradeInAcademicYear(s, r.academicYear)
      if (kind === 'ege' && grade !== 11) continue
      if (kind === 'oge' && grade !== 9) continue
      out.push({
        studentId: s.id, studentName: s.fullName, classId: s.classId, grade, city,
        examType: r.examType, kind, subject: r.subject,
        examDate: r.examDate, academicYear: r.academicYear,
        score: r.score, maxScore: r.maxScore, percent: round1((r.score / r.maxScore) * 100),
        riskLevel: s.riskLevel,
        isDirector: kind === 'director', isEge: kind === 'ege', isOge: kind === 'oge', isMock: false,
      })
    }
    out.push(...buildMockFacts(s, city))
  }
  factsCache = out
  return out
}

export interface ExamScopeFilter {
  type: ExamTypeFilter
  grade: number
  className?: 'all' | string
  city?: 'all' | string
  academicYear?: 'all' | string
  studentId?: 'all' | string
  subject?: 'all' | string
}

/** Факты экзаменов в выбранной области (параллель обязательна). */
export function filterFacts(f: ExamScopeFilter): ExamFact[] {
  return getFacts().filter((x) =>
    matchType(x.kind, f.type)
    && x.grade === f.grade
    && (!f.className || f.className === 'all' || x.classId === f.className)
    && (!f.city || f.city === 'all' || x.city === f.city)
    && (!f.academicYear || f.academicYear === 'all' || x.academicYear === f.academicYear)
    && (!f.studentId || f.studentId === 'all' || x.studentId === f.studentId)
    && (!f.subject || f.subject === 'all' || x.subject === f.subject))
}

/** Предметы, встречающиеся в области. */
export function subjectsOf(facts: ExamFact[]): string[] {
  return Array.from(new Set(facts.map((f) => f.subject))).sort()
}

// ===================== Утилиты =====================

const avg = (nums: number[]) => (nums.length ? round1(nums.reduce((a, b) => a + b, 0) / nums.length) : 0)

function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return round1(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2)
}

function groupBy<T>(items: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const it of items) {
    const k = key(it)
    const arr = m.get(k)
    if (arr) arr.push(it)
    else m.set(k, [it])
  }
  return m
}

// ===================== Динамика (с гранулярностью периода) =====================

export type DynamicsGranularity = 'year' | 'date' | 'month' | 'quarter'

const MONTH_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

/** Учебная четверть по календарному месяцу. */
function quarterOf(month: number): number {
  if (month >= 9 && month <= 10) return 1
  if (month >= 11) return 2
  if (month <= 3) return 3
  return 4
}

export interface DynamicsPoint {
  label: string
  percent: number
  score: number
}

/** Динамика среднего результата с выбранной гранулярностью. */
export function dynamicsSeries(facts: ExamFact[], granularity: DynamicsGranularity): DynamicsPoint[] {
  const keyOf = (f: ExamFact): { sort: string; label: string } => {
    const [y, m, d] = f.examDate.split('-').map(Number)
    if (granularity === 'year') return { sort: f.academicYear, label: f.academicYear }
    if (granularity === 'date') return { sort: f.examDate, label: `${pad(d)}.${pad(m)}.${y}` }
    if (granularity === 'month') return { sort: `${y}-${pad(m)}`, label: `${MONTH_SHORT[m - 1]} ${y}` }
    const q = quarterOf(m)
    return { sort: `${y}-${q}`, label: `${q} четверть ${y}` }
  }
  const byKey = new Map<string, { label: string; facts: ExamFact[] }>()
  for (const f of facts) {
    const { sort, label } = keyOf(f)
    const e = byKey.get(sort)
    if (e) e.facts.push(f)
    else byKey.set(sort, { label, facts: [f] })
  }
  return Array.from(byKey.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      label: v.label,
      percent: avg(v.facts.map((x) => x.percent)),
      score: avg(v.facts.map((x) => x.score)),
    }))
}

/** Динамика = средний процент последнего периода (год) минус предыдущего. */
export function dynamicOf(facts: ExamFact[]): number {
  const s = dynamicsSeries(facts, 'year')
  if (s.length < 2) return 0
  return round1(s[s.length - 1].percent - s[s.length - 2].percent)
}

// ===================== Уровень «ученик» =====================

export interface StudentExamAgg {
  studentId: string
  studentName: string
  classId: string
  avgPercent: number
  examCount: number
  dynamic: number
  riskLevel: string
}

/** Сводка по каждому ученику в области, отсортировано по среднему проценту (по убыванию). */
export function studentAggregates(facts: ExamFact[]): StudentExamAgg[] {
  return Array.from(groupBy(facts, (f) => f.studentId).values())
    .map((list) => ({
      studentId: list[0].studentId,
      studentName: list[0].studentName,
      classId: list[0].classId,
      avgPercent: avg(list.map((x) => x.percent)),
      examCount: list.length,
      dynamic: dynamicOf(list),
      riskLevel: list[0].riskLevel,
    }))
    .sort((a, b) => b.avgPercent - a.avgPercent)
}

/** Место (1-based) ученика среди отсортированного списка; 0, если не найден. */
export function rankOf(aggregates: StudentExamAgg[], studentId: string): number {
  const i = aggregates.findIndex((a) => a.studentId === studentId)
  return i < 0 ? 0 : i + 1
}

/** Место ученика по конкретному экзамену (предмет + год + вид) в классе и в параллели. */
export function perExamRank(fact: ExamFact, classFacts: ExamFact[], gradeFacts: ExamFact[]) {
  const rank = (list: ExamFact[]) => {
    const arr = list
      .filter((f) => f.subject === fact.subject && f.academicYear === fact.academicYear && f.kind === fact.kind)
      .sort((a, b) => b.score - a.score)
    const i = arr.findIndex((f) => f.studentId === fact.studentId)
    return { rank: i < 0 ? 0 : i + 1, total: arr.length }
  }
  const c = rank(classFacts)
  const g = rank(gradeFacts)
  return { classRank: c.rank, classTotal: c.total, gradeRank: g.rank, gradeTotal: g.total }
}

/** Динамика по каждому предмету (рост/снижение): процент последнего экзамена минус предыдущего. */
export function subjectDynamics(facts: ExamFact[]): { subject: string; dynamic: number }[] {
  return Array.from(groupBy(facts, (f) => f.subject).entries())
    .map(([subject, list]) => {
      const sorted = [...list].sort((a, b) => a.examDate.localeCompare(b.examDate))
      const dynamic = sorted.length < 2 ? 0 : round1(sorted[sorted.length - 1].percent - sorted[sorted.length - 2].percent)
      return { subject, dynamic }
    })
    .sort((a, b) => b.dynamic - a.dynamic)
}

// ===================== Уровень «класс» =====================

export interface ClassExamAgg {
  className: string
  count: number          // учеников с экзаменами
  avgPercent: number
  median: number
  min: number
  max: number
  dynamic: number
  riskCount: number      // учеников в зоне риска (средний/высокий)
}

/** Сводка по классам внутри параллели (по убыванию среднего). */
export function classAggregates(facts: ExamFact[]): ClassExamAgg[] {
  return Array.from(groupBy(facts, (f) => f.classId).entries())
    .map(([className, list]) => {
      const studs = studentAggregates(list)
      const studentAvgs = studs.map((s) => s.avgPercent)
      return {
        className,
        count: studs.length,
        avgPercent: avg(list.map((x) => x.percent)),
        median: median(studentAvgs),
        min: studentAvgs.length ? Math.min(...studentAvgs) : 0,
        max: studentAvgs.length ? Math.max(...studentAvgs) : 0,
        dynamic: dynamicOf(list),
        riskCount: studs.filter((s) => s.riskLevel === 'высокий' || s.riskLevel === 'средний').length,
      }
    })
    .sort((a, b) => b.avgPercent - a.avgPercent)
}

// ===================== Графики =====================

/** Средний процент/балл по предметам. */
export function subjectAverages(facts: ExamFact[]): { subject: string; percent: number; score: number }[] {
  return Array.from(groupBy(facts, (f) => f.subject).entries())
    .map(([subject, list]) => ({ subject, percent: avg(list.map((x) => x.percent)), score: avg(list.map((x) => x.score)) }))
    .sort((a, b) => b.percent - a.percent)
}

/** Сравнение ученик / класс / параллель по предметам. */
export interface SubjectComparePoint {
  subject: string
  student: number
  classAvg: number
  gradeAvg: number
}

export function subjectComparison(
  studentFacts: ExamFact[],
  classFacts: ExamFact[],
  gradeFacts: ExamFact[],
): SubjectComparePoint[] {
  const subjects = Array.from(new Set(studentFacts.map((f) => f.subject)))
  const subjAvg = (list: ExamFact[], subject: string) => avg(list.filter((f) => f.subject === subject).map((f) => f.percent))
  return subjects.map((subject) => ({
    subject,
    student: subjAvg(studentFacts, subject),
    classAvg: subjAvg(classFacts, subject),
    gradeAvg: subjAvg(gradeFacts, subject),
  }))
}

/** Сравнение классов со средним по параллели (для уровня «класс»). */
export function classVsGrade(classFacts: ExamFact[], gradeFacts: ExamFact[]): { subject: string; classAvg: number; gradeAvg: number }[] {
  const subjects = Array.from(new Set(classFacts.map((f) => f.subject)))
  const subjAvg = (list: ExamFact[], subject: string) => avg(list.filter((f) => f.subject === subject).map((f) => f.percent))
  return subjects.map((subject) => ({ subject, classAvg: subjAvg(classFacts, subject), gradeAvg: subjAvg(gradeFacts, subject) }))
}

/** Распределение средних баллов учеников по корзинам (гистограмма). */
export function scoreDistribution(facts: ExamFact[]): { range: string; count: number }[] {
  const buckets = [
    { range: '0–40', lo: 0, hi: 40 },
    { range: '40–60', lo: 40, hi: 60 },
    { range: '60–70', lo: 60, hi: 70 },
    { range: '70–80', lo: 70, hi: 80 },
    { range: '80–90', lo: 80, hi: 90 },
    { range: '90–100', lo: 90, hi: 100.01 },
  ]
  const studentAvgs = studentAggregates(facts).map((s) => s.avgPercent)
  return buckets.map((b) => ({ range: b.range, count: studentAvgs.filter((v) => v >= b.lo && v < b.hi).length }))
}

/** Учебные годы, встречающиеся в области (по убыванию). */
export function academicYearsOfFacts(facts: ExamFact[]): string[] {
  return Array.from(new Set(facts.map((f) => f.academicYear))).sort((a, b) => b.localeCompare(a))
}
