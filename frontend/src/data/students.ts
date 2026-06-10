import type { Student } from '../types'
import { ALL_CLASSES } from './classes'

const FIRST_NAMES = [
  'Иван', 'Анна', 'Кирилл', 'Мария', 'Дмитрий', 'Елизавета', 'Алексей', 'София',
  'Никита', 'Дарья', 'Михаил', 'Полина', 'Артём', 'Виктория', 'Максим', 'Ксения',
]
const LAST_NAMES = [
  'Иванов', 'Петрова', 'Сидоров', 'Кузнецова', 'Васильев', 'Смирнова', 'Попов', 'Лебедева',
  'Фёдоров', 'Андреева', 'Григорьев', 'Николаева', 'Кузнецов', 'Морозова', 'Волков', 'Зайцева',
]

function isFemale(firstName: string): boolean {
  return firstName.endsWith('а') || firstName.endsWith('я')
}

// Генерируем стабильный список учеников по каждому классу.
export const STUDENTS_BY_CLASS: Record<string, Student[]> = Object.fromEntries(
  ALL_CLASSES.map((className) => {
    const list: Student[] = Array.from({ length: 8 }, (_, i) => {
      const first = FIRST_NAMES[i % FIRST_NAMES.length]
      let last = LAST_NAMES[i % LAST_NAMES.length]
      if (isFemale(first) && !last.endsWith('а')) last = `${last}а`
      return {
        id: `${className}-${i + 1}`,
        fullName: `${last} ${first}`,
        className,
      }
    })
    return [className, list]
  }),
)

export function getStudents(className: string): Student[] {
  return STUDENTS_BY_CLASS[className] ?? []
}
