// ============================================================
// Расчёт KPI главного экрана из синтетического датасета классов
// и конфигурация смысловых блоков дашборда.
//
// Все показатели считаются здесь (а не в JSX), чтобы школьной команде
// было проще читать и менять логику. Рядом с каждым показателем указано,
// из какой колонки CSV он берётся и какое правило применяется.
//
// ВАЖНО про уровень данных: датасет агрегирован ПО КЛАССАМ, отдельной
// строки на ученика нет. Поэтому «количество учеников» оценивается как
// сумма students_count по подходящим классам.
//
// Динамика (за неделю/месяц/год) считается из временных срезов —
// см. syntheticTimeseries.ts.
// ============================================================

import type { SyntheticClassRow } from './syntheticDataset'
import type { DashboardTimeseries } from './syntheticTimeseries'
import type { RequestKpis } from './syntheticRequests'

// ---- Пороговые значения (вынесены в константы, чтобы легко настраивать) ----
/** Критическая зона риска: risk_score >= 75. */
export const HIGH_RISK_THRESHOLD = 75
/** Зона внимания (средний риск): 50 <= risk_score < 75. */
export const MEDIUM_RISK_MIN = 50
/** Аномально низкая посещаемость — повод для ручной проверки. */
export const LOW_ATTENDANCE_THRESHOLD = 90

/** Средневзвешенное значение поля по числу учеников в классе. */
function weightedAverage(rows: SyntheticClassRow[], pick: (r: SyntheticClassRow) => number): number {
  const totalStudents = rows.reduce((sum, r) => sum + r.studentsCount, 0)
  if (totalStudents === 0) return 0
  return rows.reduce((sum, r) => sum + pick(r) * r.studentsCount, 0) / totalStudents
}

/** Сумма учеников по классам, удовлетворяющим условию. */
function sumStudents(rows: SyntheticClassRow[], predicate: (r: SyntheticClassRow) => boolean): number {
  return rows.filter(predicate).reduce((sum, r) => sum + r.studentsCount, 0)
}

/** Класс в критической зоне риска (высокий риск). */
export const isHighRisk = (r: SyntheticClassRow) => r.riskScore100 >= HIGH_RISK_THRESHOLD
/** Класс в зоне внимания (средний риск). */
export const isMediumRisk = (r: SyntheticClassRow) =>
  r.riskScore100 >= MEDIUM_RISK_MIN && r.riskScore100 < HIGH_RISK_THRESHOLD

/**
 * Класс требует ручной проверки: критическая зона риска (risk_score >= 75)
 * ИЛИ аномально низкая посещаемость (< 90%). Используется и на странице
 * /review-requests, и для подсчёта KPI.
 */
export function needsReview(row: SyntheticClassRow): boolean {
  return row.riskScore100 >= HIGH_RISK_THRESHOLD || row.attendancePct < LOW_ATTENDANCE_THRESHOLD
}

// ============================================================
// Агрегаты одного среза (периода)
// ============================================================

/** Показатели, рассчитанные по одному временному срезу классов. */
export interface SnapshotAggregates {
  schoolIndex: number       // средневзвешенный rating_score_100
  attendancePct: number     // средневзвешенный attendance_pct, %
  highRiskStudents: number  // ученики классов с risk_score >= 75
  mediumRiskStudents: number
  studentCount: number      // сумма students_count
  classCount: number        // уникальные классы
}

/** Считает агрегаты по срезу. Безопасно к пустому массиву. */
export function aggregateSnapshot(rows: SyntheticClassRow[]): SnapshotAggregates {
  return {
    schoolIndex: weightedAverage(rows, (r) => r.ratingScore100),
    attendancePct: weightedAverage(rows, (r) => r.attendancePct),
    highRiskStudents: sumStudents(rows, isHighRisk),
    mediumRiskStudents: sumStudents(rows, isMediumRisk),
    studentCount: rows.reduce((sum, r) => sum + r.studentsCount, 0),
    classCount: new Set(rows.map((r) => r.className)).size,
  }
}

// ============================================================
// KPI с динамикой
// ============================================================

/** Рассчитанные KPI школы с динамикой по периодам. */
export interface DashboardKpis {
  schoolIndex: number
  /** schoolIndex(тек. неделя) − schoolIndex(пред. неделя). null — нет данных. */
  schoolIndexWeeklyDelta: number | null
  /** Точки индекса для мини-графика: год назад → месяц назад → неделю назад → сейчас. */
  schoolIndexTrend: number[]

  highRiskCount: number
  /** highRisk(тек. месяц) − highRisk(пред. месяц). */
  highRiskMonthlyDelta: number | null
  mediumRiskCount: number

  attendanceRate: number    // %
  /** Изменение посещаемости за неделю, процентные пункты. */
  attendanceWeeklyDelta: number | null

  studentsCount: number
  /** students(тек. год) − students(пред. год). */
  studentsYearlyDelta: number | null
  classesCount: number
}

/** delta = current − previous; null, если предыдущего периода нет. */
function delta(current: number, previousRows: SyntheticClassRow[], previous: number): number | null {
  return previousRows.length === 0 ? null : current - previous
}

/**
 * Главная функция расчёта KPI. Принимает временные срезы, возвращает текущие
 * значения и динамику. Безопасна к пустым/частичным данным.
 */
export function calculateDashboardKpis(ts: DashboardTimeseries): DashboardKpis {
  const curWeek = aggregateSnapshot(ts.currentWeek)
  const prevWeek = aggregateSnapshot(ts.previousWeek)
  const curMonth = aggregateSnapshot(ts.currentMonth)
  const prevMonth = aggregateSnapshot(ts.previousMonth)
  const curYear = aggregateSnapshot(ts.currentYear)
  const prevYear = aggregateSnapshot(ts.previousYear)

  return {
    schoolIndex: curWeek.schoolIndex,
    schoolIndexWeeklyDelta: delta(curWeek.schoolIndex, ts.previousWeek, prevWeek.schoolIndex),
    schoolIndexTrend: [prevYear.schoolIndex, prevMonth.schoolIndex, prevWeek.schoolIndex, curWeek.schoolIndex],

    highRiskCount: curMonth.highRiskStudents,
    highRiskMonthlyDelta: delta(curMonth.highRiskStudents, ts.previousMonth, prevMonth.highRiskStudents),
    mediumRiskCount: curWeek.mediumRiskStudents,

    attendanceRate: curWeek.attendancePct,
    attendanceWeeklyDelta: delta(curWeek.attendancePct, ts.previousWeek, prevWeek.attendancePct),

    studentsCount: curYear.studentCount,
    studentsYearlyDelta: delta(curYear.studentCount, ts.previousYear, prevYear.studentCount),
    classesCount: curWeek.classCount,
  }
}

// ============================================================
// Легенды смысловых блоков (для боковой панели с расшифровкой)
// ============================================================

export type KpiColor = 'red' | 'orange' | 'green' | 'blue' | 'purple'

export interface KpiLegend {
  id: string
  title: string
  valueSummary: string     // краткая сводка значения для панели
  color: KpiColor
  href: string             // основной переход блока
  fullDescription: string  // что означает показатель
  formula: string          // правило расчёта
  dynamicsNote?: string     // как считается динамика
  dataSource: string       // откуда берутся данные
}

/** Легенды по блокам. Значения подставляются из рассчитанных KPI. */
export function buildSectionLegends(kpis: DashboardKpis, requests: RequestKpis): Record<string, KpiLegend> {
  return {
    'school-state': {
      id: 'school-state',
      title: 'Индекс школы',
      valueSummary: kpis.schoolIndex.toFixed(1),
      color: 'green',
      href: '/index-breakdown',
      fullDescription:
        'Средний интегральный показатель состояния школы. Рассчитывается на основе данных по ученикам и классам. Чем выше значение, тем лучше общая ситуация.',
      formula: 'average(school_index) за последний доступный период',
      dynamicsNote: 'Динамика за неделю показывает разницу между текущей и предыдущей неделей.',
      dataSource: 'Синтетический датасет, поле rating_score_100 по неделям',
    },
    'risks': {
      id: 'risks',
      title: 'Риски',
      valueSummary: `высокий: ${kpis.highRiskCount} · средний: ${kpis.mediumRiskCount}`,
      color: 'red',
      href: '/risk?level=high',
      fullDescription:
        'Блок показывает учеников, требующих внимания. Высокий риск означает критический уровень risk_score, средний риск — зону наблюдения. Заявки сюда НЕ входят — это отдельный блок.',
      formula: 'high: risk_score >= 75 · medium: 50 <= risk_score < 75',
      dynamicsNote: 'Для высокого риска показывается изменение за месяц.',
      dataSource: 'Синтетический датасет классов, поле risk_score_100 по неделям и месяцам',
    },
    'requests': {
      id: 'requests',
      title: 'Заявки',
      valueSummary: `на проверку: ${requests.reviewRequestsCount} (олимпиады: ${requests.olympiadRequestsCount} · новые СПД: ${requests.spdProjectRegistrationRequestsCount} · участие в СПД: ${requests.spdProjectParticipationRequestsCount})`,
      color: 'purple',
      href: '/requests',
      fullDescription:
        'Показатель отражает количество административных заявок, которые требуют рассмотрения. Сюда входят заявки о результатах олимпиад, регистрация новых СПД-проектов и заявления на участие в уже существующих СПД-проектах.',
      formula: 'count(requests where status in ["pending", "in_review", "needs_revision"])',
      dynamicsNote: 'Динамика за неделю показывает разницу между количеством актуальных заявок на текущей и предыдущей неделе.',
      dataSource: 'Синтетический набор заявок: synthetic_requests / syntheticRequests.',
    },
    'attendance': {
      id: 'attendance',
      title: 'Посещаемость',
      valueSummary: `${kpis.attendanceRate.toFixed(1)}%`,
      color: 'blue',
      href: '/attendance',
      fullDescription: 'Средний процент посещаемости учеников за последний доступный период.',
      formula: 'average(attendance_rate) * 100',
      dynamicsNote: 'Динамика за неделю показывает изменение посещаемости в процентных пунктах.',
      dataSource: 'Синтетический датасет, поле attendance_pct по неделям',
    },
    'coverage': {
      id: 'coverage',
      title: 'Охват данных',
      valueSummary: `учеников: ${kpis.studentsCount} · классов: ${kpis.classesCount}`,
      color: 'purple',
      href: '/students',
      fullDescription: 'Показывает, сколько учеников и классов участвуют в расчёте показателей.',
      formula: 'studentsCount = count unique student_id · classesCount = count unique class_id',
      dynamicsNote: 'Для количества учеников показывается изменение за год.',
      dataSource: 'Синтетический датасет, поля students_count и class_name по годам',
    },
  }
}
