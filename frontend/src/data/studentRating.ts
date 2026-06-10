import type { MonthlyPoint, RatingDistribution, StudentRatingRow } from '../types'

// Веса компонентов итогового рейтинга (как в info-баннере на дизайне).
export const RATING_WEIGHTS = [
  { label: 'Средний балл оценок', weight: 40, color: '#2563eb' },
  { label: 'Олимпиады (баллы)', weight: 30, color: '#16a34a' },
  { label: 'СПД (часы волонтёрства)', weight: 10, color: '#f59e0b' },
  { label: 'Посещаемость (% присутствия)', weight: 20, color: '#9333ea' },
]

export const STUDENT_RATING: StudentRatingRow[] = [
  { place: 1, fullName: 'Кузнецов Артём', className: '9Б', total: 92.4, grades: 38.2, olympiads: 27.6, volunteering: 9.2, attendance: 17.4 },
  { place: 2, fullName: 'Смирнова Елизавета', className: '9А', total: 89.7, grades: 36.4, olympiads: 26.1, volunteering: 8.6, attendance: 18.6 },
  { place: 3, fullName: 'Попов Алексей', className: '9В', total: 87.1, grades: 34.8, olympiads: 24.3, volunteering: 9.0, attendance: 19.0 },
  { place: 4, fullName: 'Васильева Полина', className: '9Б', total: 83.5, grades: 33.2, olympiads: 22.8, volunteering: 8.0, attendance: 19.5 },
  { place: 5, fullName: 'Лебедев Максим', className: '9А', total: 81.3, grades: 32.0, olympiads: 21.9, volunteering: 7.4, attendance: 20.0 },
  { place: 6, fullName: 'Иванова Мария', className: '9В', total: 79.6, grades: 31.6, olympiads: 20.7, volunteering: 8.1, attendance: 19.2 },
  { place: 7, fullName: 'Фёдоров Никита', className: '9Б', total: 78.2, grades: 30.4, olympiads: 20.4, volunteering: 7.6, attendance: 19.8 },
  { place: 8, fullName: 'Андреева Дарья', className: '9А', total: 76.8, grades: 29.6, olympiads: 19.5, volunteering: 7.8, attendance: 19.9 },
  { place: 9, fullName: 'Григорьев Михаил', className: '9В', total: 75.3, grades: 28.8, olympiads: 19.8, volunteering: 7.2, attendance: 19.5 },
  { place: 10, fullName: 'Николаева Полина', className: '9А', total: 73.9, grades: 28.0, olympiads: 18.6, volunteering: 7.5, attendance: 19.8 },
]

export const RATING_DISTRIBUTION: RatingDistribution[] = [
  { label: 'Высокий', range: '80–100', percent: 35, count: 28, color: '#16a34a' },
  { label: 'Хороший', range: '60–79', percent: 45, count: 36, color: '#2563eb' },
  { label: 'Средний', range: '40–59', percent: 15, count: 12, color: '#f59e0b' },
  { label: 'Низкий', range: '0–39', percent: 5, count: 4, color: '#dc2626' },
]

export const RATING_SCHOOL_DYNAMICS: MonthlyPoint[] = [
  { label: '1 триместр\n2023/24', value: 68.4 },
  { label: '2 триместр\n2023/24', value: 71.2 },
  { label: '3 триместр\n2023/24', value: 74.6 },
  { label: 'Итоговый\n2023/24', value: 76.8 },
]
