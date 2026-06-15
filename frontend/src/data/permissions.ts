// ============================================================
// Централизованная проверка прав доступа по ролям.
//
// Раньше логика «какие классы/ученики видны роли» дублировалась в каждой
// странице. Теперь она в одном месте, и директор гарантированно получает
// полный доступ.
// ============================================================

import type { PublicUser, Role } from '../api/types'
import { ALL_CLASSES } from './classes'
import { getStudents } from './students'

/** Краткая ссылка на ученика для селектов. */
export interface StudentOption {
  id: string
  fullName: string
}

/** Директор — суперпользователь: ему доступно всё. */
export function isDirector(user: PublicUser | null): boolean {
  return user?.role === 'DIRECTOR'
}

/** Ученик видит только свои данные и не может выбирать другого ученика. */
export function isStudent(user: PublicUser | null): boolean {
  return user?.role === 'STUDENT'
}

/**
 * Доступ к разделу/действию по роли. Директор проходит всегда —
 * для него ограничения пропускаются.
 */
export function hasAccess(user: PublicUser | null, requiredRoles: Role[]): boolean {
  if (!user) return false
  if (user.role === 'DIRECTOR') return true
  return requiredRoles.includes(user.role)
}

/** Может ли роль выбирать произвольного ученика (т.е. видеть не только себя). */
export function canSelectStudent(user: PublicUser | null): boolean {
  return !!user && user.role !== 'STUDENT'
}

/** Имя класса без префикса учебного года: "2026-7Б" → "7Б". */
function classNameOf(classId: string): string {
  return classId.replace(/^\d+-/, '')
}

/**
 * Классы, доступные пользователю.
 * Учитель и ученик — только свои; завуч/директор/аналитик/админ — все.
 */
export function getVisibleClasses(user: PublicUser | null): string[] {
  if (!user) return []
  if (user.role === 'TEACHER' || user.role === 'STUDENT') {
    return (user.classIds ?? []).map(classNameOf)
  }
  return ALL_CLASSES
}

/**
 * Ученики, доступные пользователю в рамках класса.
 * Ученик видит только себя; остальные роли — весь класс.
 */
export function getVisibleStudents(user: PublicUser | null, className: string): StudentOption[] {
  if (user?.role === 'STUDENT') {
    return [{ id: user.studentId ?? user.id, fullName: user.fullName }]
  }
  return getStudents(className).map((s) => ({ id: s.id, fullName: s.fullName }))
}
