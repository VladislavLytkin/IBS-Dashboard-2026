// ============================================================
// Временная динамика для синтетического датасета.
//
// Базовый CSV (synthetic_class_rating_data_v2.csv) — это срез «сейчас»
// (последняя доступная дата). Чтобы считать динамику за неделю / месяц / год,
// здесь детерминированно достраиваются срезы за предыдущие периоды:
//
//   previousWeek  — каким был срез неделю назад
//   previousMonth — месяц назад
//   previousYear  — год назад
//
// Значения для прошлых периодов получаются небольшими ДЕТЕРМИНИРОВАННЫМИ
// смещениями от текущих (seed = имя класса + период), поэтому при каждой
// загрузке числа одинаковые — динамика не «прыгает».
//
// Семантика смещений подобрана так, чтобы текущая ситуация выглядела как
// постепенное улучшение: неделю/месяц назад индекс и посещаемость были чуть
// ниже, риск — чуть выше, а год назад учеников было меньше.
// ============================================================

import type { SyntheticClassRow } from './syntheticDataset'
import { loadSyntheticClasses } from './syntheticDataset'

export type PeriodKey =
  | 'currentWeek' | 'previousWeek'
  | 'currentMonth' | 'previousMonth'
  | 'currentYear' | 'previousYear'

/** Набор срезов по периодам — вход для расчёта KPI. */
export type DashboardTimeseries = Record<PeriodKey, SyntheticClassRow[]>

/** Детерминированное псевдослучайное число в [0,1) по строковому seed. */
function seededUnit(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // приводим к [0,1)
  return ((h >>> 0) % 100000) / 100000
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Пересчитывает производные поля строки после смещения метрик. */
function withDerived(row: SyntheticClassRow): SyntheticClassRow {
  return {
    ...row,
    riskLevel: row.riskScore100 >= 75 ? 'высокий' : row.riskScore100 >= 50 ? 'средний' : 'низкий',
    reviewRequired: row.riskScore100 >= 75 || row.attendancePct < 90,
  }
}

/** Строит срез одного класса за прошлый период (смещение от текущего). */
function shiftRow(row: SyntheticClassRow, period: PeriodKey): SyntheticClassRow {
  // Текущие периоды = базовый срез без изменений.
  if (period === 'currentWeek' || period === 'currentMonth' || period === 'currentYear') return row

  const u = (salt: string) => seededUnit(`${row.className}:${period}:${salt}`)

  if (period === 'previousWeek') {
    return withDerived({
      ...row,
      ratingScore100: clamp(row.ratingScore100 - (0.2 + 0.6 * u('idx')), 0, 100),
      attendancePct: clamp(row.attendancePct - (0.6 + 1.2 * u('att')), 0, 100),
      riskScore100: clamp(row.riskScore100 + (0.3 + 0.9 * u('risk')), 0, 100),
    })
  }
  if (period === 'previousMonth') {
    return withDerived({
      ...row,
      ratingScore100: clamp(row.ratingScore100 - (0.6 + 1.6 * u('idx')), 0, 100),
      attendancePct: clamp(row.attendancePct - (0.5 + 1.0 * u('att')), 0, 100),
      // месяц назад риск заметно выше → высокого риска было больше
      riskScore100: clamp(row.riskScore100 + (1.8 + 3.5 * u('risk')), 0, 100),
    })
  }
  // previousYear — год назад учеников было меньше, показатели чуть ниже
  return withDerived({
    ...row,
    studentsCount: Math.max(1, Math.round(row.studentsCount * (0.90 + 0.04 * u('stu')))),
    ratingScore100: clamp(row.ratingScore100 - (0.5 + 2.0 * u('idx')), 0, 100),
    attendancePct: clamp(row.attendancePct - (0.5 + 1.5 * u('att')), 0, 100),
    riskScore100: clamp(row.riskScore100 + (1.0 + 2.0 * u('risk')), 0, 100),
  })
}

/** Достраивает все периодические срезы из базового среза классов. */
export function buildDashboardTimeseries(base: SyntheticClassRow[]): DashboardTimeseries {
  const make = (period: PeriodKey) => base.map((r) => shiftRow(r, period))
  return {
    currentWeek: make('currentWeek'),
    previousWeek: make('previousWeek'),
    currentMonth: make('currentMonth'),
    previousMonth: make('previousMonth'),
    currentYear: make('currentYear'),
    previousYear: make('previousYear'),
  }
}

/** Загружает базовый CSV и строит временную динамику. */
export async function loadDashboardTimeseries(): Promise<DashboardTimeseries> {
  const base = await loadSyntheticClasses()
  return buildDashboardTimeseries(base)
}
