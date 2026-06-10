import type {
  ExamBelowThreshold,
  ExamComparePoint,
  ExamDynamicPoint,
} from '../types'

export const EXAM_COMPARE: ExamComparePoint[] = [
  { period: 'Основной период 2023', school: 68.4, city: 64.1, region: 61.3 },
  { period: 'Основной период 2024', school: 72.6, city: 66.8, region: 63.7 },
]

export const EXAM_STATS = {
  school: 72.6,
  city: 66.8,
  region: 63.7,
  participants: 96,
  maxParticipants: 98,
  maxScore: 31,
  threshold: 8,
  yoyDelta: 4.2,
}

export const EXAM_BELOW_THRESHOLD: ExamBelowThreshold[] = [
  { fullName: 'Кузнецов Артём', className: '9Б', primaryScore: 5, testScore: 5 },
  { fullName: 'Смирнова Елизавета', className: '9А', primaryScore: 6, testScore: 6 },
  { fullName: 'Попов Алексей', className: '9В', primaryScore: 6, testScore: 6 },
  { fullName: 'Васильева Полина', className: '9Б', primaryScore: 7, testScore: 7 },
  { fullName: 'Лебедев Максим', className: '9А', primaryScore: 7, testScore: 7 },
]

export const EXAM_BELOW_THRESHOLD_TOTAL = 8

export const EXAM_DYNAMICS: ExamDynamicPoint[] = [
  { label: 'Пробный март', current: 56.2, previous: 51.3 },
  { label: 'Пробный апрель', current: 61.8, previous: 58.4 },
  { label: 'Основной период', current: 72.6, previous: 68.4 },
  { label: 'Резервный период', current: 69.1, previous: 69.1 },
]

export const EXAM_TYPES = ['ЕГЭ', 'ОГЭ']
export const EXAM_GRADE_GROUPS = ['11 классы', '9 классы']
export const EXAM_PERIODS = ['Основной период 2024', 'Резервный период 2024', 'Основной период 2023']
