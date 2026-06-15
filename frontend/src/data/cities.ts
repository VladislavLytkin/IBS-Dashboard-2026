// ============================================================
// Измерение «город».
//
// Исходный синтетический датасет — одношкольный, без города. Чтобы фильтры
// «город» давали реальную фильтрацию, каждый класс детерминированно
// привязывается к городу (hashSeed по имени класса). Один класс — один город,
// поэтому ученик наследует город своего класса.
// ============================================================

import type { PublicUser } from '../api/types'
import { hashSeed } from '../utils/random'
import { ALL_CLASSES } from './classes'
import { STUDENTS } from './students'
import { getVisibleClasses } from './permissions'

export const CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Нижний Новгород', 'Пермь'] as const
export type City = (typeof CITIES)[number]

/** Город класса — стабильная функция от имени класса ("7Б"). */
export function cityForClass(className: string): City {
  return CITIES[hashSeed(`city:${className}`) % CITIES.length]
}

/** Город ученика = город его класса. */
export function cityForStudent(studentId: string): City {
  const s = STUDENTS.find((x) => x.id === studentId)
  const className = s?.classId ?? studentId.replace(/-\d+$/, '')
  return cityForClass(className)
}

/** Классы выбранного города (из общего списка). */
export function classesInCity(city: string): string[] {
  return ALL_CLASSES.filter((c) => cityForClass(c) === city)
}

/**
 * Города, доступные пользователю.
 * Учитель/ученик — только города своих классов; остальные роли — все города.
 */
export function getVisibleCities(user: PublicUser | null): City[] {
  if (user && (user.role === 'TEACHER' || user.role === 'STUDENT')) {
    const own = new Set(getVisibleClasses(user).map(cityForClass))
    return CITIES.filter((c) => own.has(c))
  }
  return [...CITIES]
}
