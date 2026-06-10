import type { MonthlyPoint, VolunteerEvent, VolunteerStudentHours } from '../types'

export const VOLUNTEER_EVENTS: VolunteerEvent[] = [
  { title: 'Помощь приюту для животных', date: '05.05.2024', hours: 2 },
  { title: 'Экологическая акция «Чистый город»', date: '11.05.2024', hours: 3 },
  { title: 'День Победы. Волонтёры', date: '09.05.2024', hours: 4 },
  { title: 'Сбор книг для библиотеки', date: '18.05.2024', hours: 2 },
  { title: 'Помощь в организации школьного концерта', date: '21.05.2024', hours: 3 },
  { title: 'Благоустройство территории школы', date: '25.05.2024', hours: 3 },
  { title: 'Акция «Коробка храбрости» (детская больница)', date: '28.05.2024', hours: 2 },
]

export const VOLUNTEER_HOURS: VolunteerStudentHours[] = [
  { student: 'Иванов Иван', className: '7Б', month: 8, year: 45 },
  { student: 'Петрова Анна', className: '7Б', month: 6, year: 38 },
  { student: 'Сидоров Кирилл', className: '7Б', month: 10, year: 52 },
  { student: 'Кузнецова Мария', className: '7Б', month: 5, year: 27 },
  { student: 'Васильев Дмитрий', className: '7Б', month: 7, year: 40 },
  { student: 'Смирнова Елизавета', className: '7Б', month: 6, year: 35 },
  { student: 'Попов Алексей', className: '7Б', month: 4, year: 22 },
  { student: 'Лебедева София', className: '7Б', month: 9, year: 48 },
]

export const VOLUNTEER_SCHOOL_DYNAMICS: MonthlyPoint[] = [
  { label: 'Сен 2023', value: 90 },
  { label: 'Окт 2023', value: 110 },
  { label: 'Ноя 2023', value: 130 },
  { label: 'Дек 2023', value: 95 },
  { label: 'Янв 2024', value: 120 },
  { label: 'Фев 2024', value: 140 },
  { label: 'Мар 2024', value: 160 },
  { label: 'Апр 2024', value: 150 },
  { label: 'Май 2024', value: 175 },
]

export const VOLUNTEER_TOTAL_MONTH = 175
