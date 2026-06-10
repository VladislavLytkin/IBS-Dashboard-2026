import type { SubjectAverage, SubjectGradeRow } from '../types'

export const SUBJECTS = [
  'Русский язык', 'Математика', 'Английский язык', 'Физика', 'Химия', 'История',
  'Обществознание', 'Биология', 'География', 'Информатика', 'Литература', 'Физкультура',
]

// Средний балл по предметам за месяц (по 10-балльной шкале, как на дизайне).
export const SUBJECT_AVERAGES: SubjectAverage[] = [
  { subject: 'Русский язык', average: 9.1 },
  { subject: 'Математика', average: 8.3 },
  { subject: 'Английский язык', average: 8.6 },
  { subject: 'Физика', average: 7.9 },
  { subject: 'Химия', average: 8.0 },
  { subject: 'История', average: 8.8 },
  { subject: 'Обществознание', average: 9.2 },
  { subject: 'Биология', average: 7.4 },
  { subject: 'География', average: 8.5 },
  { subject: 'Информатика', average: 8.7 },
  { subject: 'Литература', average: 9.0 },
  { subject: 'Физкультура', average: 8.2 },
]

// Оценки за четверть по неделям (5-балльная шкала, null = нет оценки).
export const TERM_GRADES: SubjectGradeRow[] = [
  { subject: 'Русский язык', weeks: [5, 4, 5, 5, 4, 5, 5, 5, 5, 5], final: 5 },
  { subject: 'Математика', weeks: [4, 4, 5, 4, 3, 4, 5, 4, 5, 4], final: 4 },
  { subject: 'Английский язык', weeks: [5, 5, 4, 5, 5, 4, null, 5, 5, 5], final: 5 },
  { subject: 'Физика', weeks: [4, 3, 4, 4, 4, 4, 3, 4, 4, 5], final: 4 },
  { subject: 'Химия', weeks: [5, 5, 5, 4, 5, 4, 5, 5, null, 5], final: 5 },
  { subject: 'История', weeks: [4, 4, 5, 4, 4, 5, 4, 4, 5, 4], final: 4 },
  { subject: 'Обществознание', weeks: [5, 4, 4, 5, 4, 5, 5, 4, 5, 4], final: 5 },
  { subject: 'Биология', weeks: [4, 4, 3, 4, 4, 4, 4, null, 4, 4], final: 4 },
  { subject: 'География', weeks: [4, 5, 4, 4, 5, 4, 5, 4, 4, 4], final: 4 },
  { subject: 'Информатика', weeks: [5, 5, 5, 4, 5, 5, 5, 5, 5, 5], final: 5 },
  { subject: 'Литература', weeks: [5, 4, 5, 5, 5, 4, null, 5, 5, 5], final: 5 },
  { subject: 'Физкультура', weeks: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5], final: 5 },
]

export const TERM_WEEKS = Array.from({ length: 10 }, (_, i) => i + 1)
