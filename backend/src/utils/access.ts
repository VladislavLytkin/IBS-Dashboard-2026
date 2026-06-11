import type { PublicUser, Student } from '../types'
import { getStudent, listStudents } from '../data/generate'

export function visibleClassIds(user: PublicUser): string[] | null {
  if (user.role === 'TEACHER' || user.role === 'STUDENT') return user.classIds ?? []
  return null
}

export function isClassVisible(user: PublicUser, classId: string): boolean {
  if (user.role === 'TEACHER' || user.role === 'STUDENT') return (user.classIds ?? []).includes(classId)
  return true
}

export function studentForUser(user: PublicUser, year = new Date().getFullYear()): Student | undefined {
  if (user.role !== 'STUDENT') return undefined
  // Привязка строго к конкретному ученику: сначала явный studentId из профиля,
  // затем точное совпадение ФИО. Фолбэк на «первого из класса» запрещён —
  // он приводил к показу данных чужого ученика.
  if (user.studentId) return getStudent(user.studentId)
  const classIds = user.classIds ?? []
  const candidates = classIds.length
    ? classIds.flatMap((classId) => listStudents(year, undefined, classId))
    : listStudents(year)
  return candidates.find((s) => s.fullName === user.fullName)
}

export function filterStudentsForUser(user: PublicUser, students: Student[], year: number): Student[] {
  if (user.role === 'STUDENT') {
    const own = studentForUser(user, year)
    return own ? students.filter((s) => s.id === own.id) : []
  }
  if (user.role === 'TEACHER') {
    const allowed = new Set(user.classIds ?? [])
    return students.filter((s) => allowed.has(s.classId))
  }
  return students
}

export function canAccessStudent(user: PublicUser, studentId: string): boolean {
  const student = getStudent(studentId)
  if (!student) return false
  if (user.role === 'STUDENT') return studentForUser(user, student.year)?.id === student.id
  if (user.role === 'TEACHER') return (user.classIds ?? []).includes(student.classId)
  return true
}
