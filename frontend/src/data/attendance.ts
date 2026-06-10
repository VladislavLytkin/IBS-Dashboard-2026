import type {
  AbsenceDetail,
  AttendanceDay,
  AttendanceSummary,
  AttendanceTrendPoint,
} from '../types'

export const ATTENDANCE_SUMMARY: AttendanceSummary = {
  totalLessons: 96,
  present: 80,
  absent: 10,
  truancy: 6,
}

export const ATTENDANCE_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// Календарь мая 2024 (как на дизайне). outside — день соседнего месяца.
export const ATTENDANCE_CALENDAR: AttendanceDay[] = [
  { day: 29, mark: 'weekend', outside: true }, { day: 30, mark: 'weekend', outside: true },
  { day: 1, mark: 'present' }, { day: 2, mark: 'present' }, { day: 3, mark: 'present' },
  { day: 4, mark: 'weekend' }, { day: 5, mark: 'weekend' },

  { day: 6, mark: 'present' }, { day: 7, mark: 'absent' }, { day: 8, mark: 'present' },
  { day: 9, mark: 'truancy' }, { day: 10, mark: 'present' }, { day: 11, mark: 'weekend' },
  { day: 12, mark: 'weekend' },

  { day: 13, mark: 'present' }, { day: 14, mark: 'present' }, { day: 15, mark: 'absent' },
  { day: 16, mark: 'present' }, { day: 17, mark: 'present' }, { day: 18, mark: 'weekend' },
  { day: 19, mark: 'weekend' },

  { day: 20, mark: 'present' }, { day: 21, mark: 'truancy' }, { day: 22, mark: 'present' },
  { day: 23, mark: 'present' }, { day: 24, mark: 'absent' }, { day: 25, mark: 'weekend' },
  { day: 26, mark: 'weekend' },

  { day: 27, mark: 'present' }, { day: 28, mark: 'present' }, { day: 29, mark: 'truancy' },
  { day: 30, mark: 'present' }, { day: 31, mark: 'present' }, { day: 1, mark: 'weekend', outside: true },
  { day: 2, mark: 'weekend', outside: true },
]

export const ATTENDANCE_TREND: AttendanceTrendPoint[] = [
  { label: '1 мая', present: 80, absent: 18, truancy: 5 },
  { label: '2 мая', present: 82, absent: 15, truancy: 4 },
  { label: '3 мая', present: 85, absent: 12, truancy: 3 },
  { label: '6 мая', present: 78, absent: 18, truancy: 6 },
  { label: '7 мая', present: 83, absent: 14, truancy: 4 },
  { label: '8 мая', present: 86, absent: 11, truancy: 3 },
  { label: '13 мая', present: 84, absent: 13, truancy: 4 },
  { label: '14 мая', present: 80, absent: 16, truancy: 5 },
  { label: '15 мая', present: 79, absent: 18, truancy: 7 },
  { label: '16 мая', present: 85, absent: 12, truancy: 4 },
  { label: '20 мая', present: 87, absent: 10, truancy: 3 },
  { label: '21 мая', present: 82, absent: 14, truancy: 6 },
  { label: '22 мая', present: 84, absent: 13, truancy: 4 },
  { label: '24 мая', present: 81, absent: 16, truancy: 5 },
  { label: '27 мая', present: 86, absent: 12, truancy: 3 },
  { label: '28 мая', present: 88, absent: 10, truancy: 3 },
  { label: '29 мая', present: 80, absent: 15, truancy: 6 },
  { label: '31 мая', present: 82, absent: 14, truancy: 4 },
]

export const ABSENCE_EXCUSED: AbsenceDetail[] = [
  { date: '07.05.2024', lessons: '2', subject: 'Математика', reason: 'Болезнь' },
  { date: '07.05.2024', lessons: '3', subject: 'Русский язык', reason: 'Болезнь' },
  { date: '15.05.2024', lessons: '1', subject: 'История', reason: 'Справка от врача' },
  { date: '24.05.2024', lessons: '4', subject: 'Физика', reason: 'Семейные обстоятельства' },
  { date: '24.05.2024', lessons: '5', subject: 'Информатика', reason: 'Семейные обстоятельства' },
]

export const ABSENCE_TRUANCY: AbsenceDetail[] = [
  { date: '09.05.2024', lessons: '2, 3', subject: 'Английский язык, Обществознание', reason: 'Без уважительной причины' },
  { date: '21.05.2024', lessons: '1', subject: 'География', reason: 'Без уважительной причины' },
  { date: '29.05.2024', lessons: '2, 3, 4', subject: 'Химия, Физика, Алгебра', reason: 'Без уважительной причины' },
]
