// ============================================================
// Расчёт KPI главного экрана из синтетического датасета классов
// и конфигурация KPI-карточек.
//
// Все показатели считаются здесь (а не в JSX), чтобы школьной команде
// было проще читать и менять логику. Рядом с каждым показателем указано,
// из какой колонки CSV он берётся и какое правило применяется.
//
// ВАЖНО про уровень данных: датасет агрегирован ПО КЛАССАМ, отдельной
// строки на ученика нет. Поэтому «количество учеников» оценивается как
// сумма students_count по подходящим классам.
// ============================================================

import type { SyntheticClassRow } from './syntheticDataset'

// ---- Пороговые значения (вынесены в константы, чтобы легко настраивать) ----
/** Критическая зона риска: risk_score >= 75. */
export const HIGH_RISK_THRESHOLD = 75
/** Зона внимания (средний риск): 50 <= risk_score < 75. */
export const MEDIUM_RISK_MIN = 50
/** Аномально низкая посещаемость — повод для ручной проверки. */
export const LOW_ATTENDANCE_THRESHOLD = 90

/** Рассчитанные KPI школы. */
export interface DashboardKpis {
  /** Ученики высокого риска: сумма students_count классов с risk_score >= 75. */
  highRiskStudents: number
  /** Ученики среднего риска: сумма students_count классов с 50 <= risk_score < 75. */
  mediumRiskStudents: number
  /** Заявок на проверку: число классов, отмеченных для ручной проверки. */
  reviewRequests: number
  /** Индекс школы: средневзвешенный rating_score_100 (по числу учеников). */
  schoolIndex: number
  /**
   * Динамика за неделю: current_week_score - previous_week_score.
   * В этом датасете недельной истории НЕТ, поэтому значение недоступно (null) —
   * это honest fallback, карточка показывает «—», но остаётся кликабельной.
   */
  weeklyDelta: number | null
  /** Средняя посещаемость: средневзвешенный attendance_pct (по числу учеников), %. */
  attendancePct: number
  /** Классов в расчёте: число уникальных классов с данными. */
  classCount: number
  /** Учеников в расчёте: сумма students_count. */
  studentCount: number
}

/** Средневзвешенное значение поля по числу учеников в классе. */
function weightedAverage(rows: SyntheticClassRow[], pick: (r: SyntheticClassRow) => number): number {
  const totalStudents = rows.reduce((sum, r) => sum + r.studentsCount, 0)
  if (totalStudents === 0) return 0
  const weighted = rows.reduce((sum, r) => sum + pick(r) * r.studentsCount, 0)
  return weighted / totalStudents
}

/** Сумма учеников по классам, удовлетворяющим условию. */
function sumStudents(rows: SyntheticClassRow[], predicate: (r: SyntheticClassRow) => boolean): number {
  return rows.filter(predicate).reduce((sum, r) => sum + r.studentsCount, 0)
}

/**
 * Класс требует ручной проверки, если он в критической зоне риска
 * (risk_score >= 75) ИЛИ имеет аномально низкую посещаемость (< 90%).
 * Готового флага review_required / needs_review в датасете нет, поэтому
 * вычисляем его по доступным колонкам.
 */
export function needsReview(row: SyntheticClassRow): boolean {
  return row.riskScore100 >= HIGH_RISK_THRESHOLD || row.attendancePct < LOW_ATTENDANCE_THRESHOLD
}

/** Класс в критической зоне риска (высокий риск). */
export const isHighRisk = (r: SyntheticClassRow) => r.riskScore100 >= HIGH_RISK_THRESHOLD
/** Класс в зоне внимания (средний риск). */
export const isMediumRisk = (r: SyntheticClassRow) =>
  r.riskScore100 >= MEDIUM_RISK_MIN && r.riskScore100 < HIGH_RISK_THRESHOLD

/**
 * Главная функция расчёта KPI. Принимает строки датасета, возвращает
 * готовые к отображению значения. Безопасна к пустым/частичным данным.
 */
export function calculateDashboardKpis(rows: SyntheticClassRow[]): DashboardKpis {
  return {
    // risk_score_100 >= 75 → критическая зона
    highRiskStudents: sumStudents(rows, isHighRisk),
    // 50 <= risk_score_100 < 75 → зона внимания
    mediumRiskStudents: sumStudents(rows, isMediumRisk),
    // классы, отмеченные системой для ручной проверки
    reviewRequests: rows.filter(needsReview).length,
    // средневзвешенный интегральный индекс класса
    schoolIndex: weightedAverage(rows, (r) => r.ratingScore100),
    // недельной истории в датасете нет → fallback null
    weeklyDelta: null,
    // средневзвешенная посещаемость
    attendancePct: weightedAverage(rows, (r) => r.attendancePct),
    // число уникальных классов
    classCount: new Set(rows.map((r) => r.className)).size,
    // суммарное число учеников
    studentCount: rows.reduce((sum, r) => sum + r.studentsCount, 0),
  }
}

// ============================================================
// Конфигурация KPI-карточек
// ============================================================

export type KpiColor = 'red' | 'orange' | 'green' | 'blue' | 'purple'

export interface KpiCardConfig {
  id: string
  title: string
  value: string            // уже отформатированное значение для показа
  color: KpiColor
  href: string             // куда ведёт клик по карточке
  shortDescription: string // короткая подпись (1–2 строки, для tooltip на hover)
  fullDescription: string  // полная расшифровка показателя (для боковой панели)
  formula: string          // правило расчёта
  dataSource: string       // откуда берутся данные
  priority: number         // порядок отображения (1 — самый важный)
}

/** Формат динамики: «+0.3» / «−1.2» / «—», если данных нет. */
function formatDelta(delta: number | null): string {
  if (delta === null) return '—'
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`
}

/**
 * Строит массив конфигов карточек в порядке управленческого приоритета.
 * Значения подставляются из рассчитанных KPI — хардкода нет.
 */
export function buildKpiCards(kpis: DashboardKpis): KpiCardConfig[] {
  const cards: KpiCardConfig[] = [
    {
      id: 'high-risk',
      title: 'Ученики высокого риска',
      value: String(kpis.highRiskStudents),
      color: 'red',
      href: '/risk?level=high',
      shortDescription: 'Ученики с критическим уровнем риска',
      fullDescription:
        'Количество учеников, у которых интегральный индекс риска находится в критической зоне. Требуют первичной проверки классным руководителем или аналитиком.',
      formula: 'risk_score >= 75 (сумма учеников таких классов)',
      dataSource: 'Синтетический датасет, поле risk_score_100 и students_count',
      priority: 1,
    },
    {
      id: 'review-requests',
      title: 'Заявок на проверку',
      value: String(kpis.reviewRequests),
      color: 'purple',
      href: '/review-requests',
      shortDescription: 'Случаи для ручной проверки',
      fullDescription:
        'Количество случаев, которые система предлагает проверить вручную. Это могут быть резкие ухудшения показателей, спорные данные или ученики с нестабильной динамикой.',
      formula: 'высокий риск (risk_score >= 75) ИЛИ посещаемость < 90%',
      dataSource: 'Синтетический датасет, поля risk_score_100 и attendance_pct',
      priority: 2,
    },
    {
      id: 'medium-risk',
      title: 'Ученики среднего риска',
      value: String(kpis.mediumRiskStudents),
      color: 'orange',
      href: '/risk?level=medium',
      shortDescription: 'Ученики в зоне внимания',
      fullDescription:
        'Количество учеников в зоне внимания. Риск ещё не критический, но уже есть признаки отрицательной динамики.',
      formula: '50 <= risk_score < 75 (сумма учеников таких классов)',
      dataSource: 'Синтетический датасет, поле risk_score_100 и students_count',
      priority: 3,
    },
    {
      id: 'school-index',
      title: 'Индекс школы',
      value: kpis.schoolIndex.toFixed(1),
      color: 'green',
      href: '/index-breakdown',
      shortDescription: 'Средний интегральный индекс школы',
      fullDescription:
        'Среднее значение интегрального индекса по всем ученикам или классам школы. Чем выше значение, тем лучше общая ситуация.',
      formula: 'средневзвешенный rating_score_100 (по числу учеников)',
      dataSource: 'Синтетический датасет, поле rating_score_100',
      priority: 4,
    },
    {
      id: 'dynamics',
      title: 'Динамика за неделю',
      value: formatDelta(kpis.weeklyDelta),
      // нет данных → нейтральный синий; иначе зелёный/красный по знаку
      color: kpis.weeklyDelta === null ? 'blue' : kpis.weeklyDelta < 0 ? 'red' : 'green',
      href: '/dynamics',
      shortDescription: 'Изменение индекса за неделю',
      fullDescription:
        'Изменение среднего индекса школы по сравнению с прошлой неделей. Положительное значение означает улучшение, отрицательное — ухудшение.',
      formula: 'current_week_score − previous_week_score (нет недельной истории в датасете)',
      dataSource: 'Синтетический датасет — недельной истории нет, показатель недоступен',
      priority: 5,
    },
    {
      id: 'attendance',
      title: 'Посещаемость',
      value: `${kpis.attendancePct.toFixed(1)}%`,
      color: 'blue',
      href: '/attendance',
      shortDescription: 'Средний процент посещаемости',
      fullDescription: 'Средний процент посещаемости учеников за выбранный период.',
      formula: 'средневзвешенный attendance_pct (по числу учеников)',
      dataSource: 'Синтетический датасет, поле attendance_pct',
      priority: 6,
    },
    {
      id: 'classes',
      title: 'Классов в расчёте',
      value: String(kpis.classCount),
      color: 'blue',
      href: '/classes',
      shortDescription: 'Классов с рассчитанными показателями',
      fullDescription: 'Количество классов, по которым есть данные и рассчитаны показатели.',
      formula: 'количество уникальных классов',
      dataSource: 'Синтетический датасет, поле class_name',
      priority: 7,
    },
    {
      id: 'students',
      title: 'Учеников в расчёте',
      value: String(kpis.studentCount),
      color: 'purple',
      href: '/students',
      shortDescription: 'Всего учеников в расчёте',
      fullDescription: 'Общее количество учеников, участвующих в расчёте показателей.',
      formula: 'сумма students_count по всем классам',
      dataSource: 'Синтетический датасет, поле students_count',
      priority: 8,
    },
  ]
  return cards.sort((a, b) => a.priority - b.priority)
}
