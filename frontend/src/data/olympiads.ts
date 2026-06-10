import type { OlympiadLevel, OlympiadRecord } from '../types'

export const OLYMPIAD_LEVELS: OlympiadLevel[] = ['Школьная', 'Городская', 'Всероссийская']

export const OLYMPIADS: OlympiadRecord[] = [
  { id: 1, student: 'Иванов Иван', className: '7Б', level: 'Всероссийская', title: 'Всероссийская олимпиада школьников', subject: 'Математика', award: 'Диплом I степени', awardKind: 'gold', date: '15.05.2024' },
  { id: 2, student: 'Петрова Анна', className: '8А', level: 'Городская', title: 'Московская олимпиада школьников', subject: 'Русский язык', award: '1 место', awardKind: 'gold', date: '12.05.2024' },
  { id: 3, student: 'Сидоров Кирилл', className: '9Б', level: 'Всероссийская', title: 'Всероссийская олимпиада школьников', subject: 'Физика', award: 'Диплом II степени', awardKind: 'silver', date: '20.04.2024' },
  { id: 4, student: 'Кузнецова Мария', className: '7А', level: 'Городская', title: 'Московская олимпиада школьников', subject: 'Английский язык', award: '2 место', awardKind: 'silver', date: '10.04.2024' },
  { id: 5, student: 'Васильев Дмитрий', className: '8Б', level: 'Школьная', title: 'Школьная олимпиада', subject: 'История', award: '1 место', awardKind: 'gold', date: '25.03.2024' },
  { id: 6, student: 'Смирнова Елизавета', className: '9А', level: 'Всероссийская', title: 'Всероссийская олимпиада школьников', subject: 'Химия', award: 'Диплом III степени', awardKind: 'bronze', date: '18.03.2024' },
  { id: 7, student: 'Попов Алексей', className: '10А', level: 'Городская', title: 'Московская олимпиада школьников', subject: 'Информатика', award: '3 место', awardKind: 'bronze', date: '05.03.2024' },
  { id: 8, student: 'Лебедева София', className: '8А', level: 'Школьная', title: 'Школьная олимпиада', subject: 'Биология', award: '1 место', awardKind: 'gold', date: '28.02.2024' },
  { id: 9, student: 'Фёдоров Никита', className: '9Б', level: 'Городская', title: 'Московская олимпиада школьников', subject: 'Обществознание', award: '2 место', awardKind: 'silver', date: '20.02.2024' },
  { id: 10, student: 'Андреева Дарья', className: '7Б', level: 'Школьная', title: 'Школьная олимпиада', subject: 'География', award: '1 место', awardKind: 'gold', date: '15.02.2024' },
  { id: 11, student: 'Григорьев Михаил', className: '10Б', level: 'Всероссийская', title: 'Всероссийская олимпиада школьников', subject: 'Математика', award: 'Диплом II степени', awardKind: 'silver', date: '10.02.2024' },
  { id: 12, student: 'Николаева Полина', className: '11А', level: 'Городская', title: 'Московская олимпиада школьников', subject: 'Литература', award: '3 место', awardKind: 'bronze', date: '01.02.2024' },
]

export const OLYMPIADS_TOTAL = 78
