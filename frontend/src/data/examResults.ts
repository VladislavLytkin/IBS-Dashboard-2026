import type { ExamComparisonResult, ExamSubject } from '../types'
import { between, rngFor } from '../utils/random'
import { clampScore } from '../utils/scoring'

// Реальные предметы ЕГЭ (вместо внутренних разделов математики).
export const EXAM_SUBJECTS: ExamSubject[] = [
  'Русский язык',
  'Математика профильная',
  'Математика базовая',
  'Информатика',
  'Физика',
  'Химия',
  'Биология',
  'Обществознание',
  'История',
  'География',
  'Литература',
  'Английский язык',
]

// «Базовый уровень» предмета, чтобы был осмысленный разброс high / mid / low.
const SUBJECT_BASE: Record<ExamSubject, number> = {
  'Русский язык': 84,
  'Математика профильная': 71,
  'Математика базовая': 88,
  'Информатика': 79,
  'Физика': 64,
  'Химия': 58,
  'Биология': 61,
  'Обществознание': 67,
  'История': 55,
  'География': 49,
  'Литература': 74,
  'Английский язык': 82,
}

function buildExamComparison(subject: ExamSubject): ExamComparisonResult {
  const rnd = rngFor(`exam:${subject}`)
  const school = Math.round(clampScore(SUBJECT_BASE[subject] + between(rnd, -4, 6)))
  const city = Math.round(clampScore(school - between(rnd, 3, 9)))
  const region = Math.round(clampScore(city - between(rnd, 1, 6)))
  return { subject, school, city, region }
}

export const EXAM_SUBJECT_RESULTS: ExamComparisonResult[] = EXAM_SUBJECTS.map(buildExamComparison)

// Ключевые предметы по умолчанию (чтобы таблица не перегружалась).
export const EXAM_KEY_SUBJECTS: ExamSubject[] = [
  'Русский язык',
  'Математика профильная',
  'Информатика',
  'Физика',
  'Обществознание',
  'Английский язык',
]
