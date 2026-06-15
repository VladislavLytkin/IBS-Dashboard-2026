// ============================================================
// Слой загрузки синтетического датасета школы.
//
// Источник данных: public/data/synthetic_class_rating_data_v2.csv
// (копия файла из папки "Data Analysis"). Датасет — КЛАССНОГО уровня:
// одна строка = один класс за учебный год, поэтому показатели по ученикам
// оцениваются через поле students_count (количество учеников в классе).
//
// Файл грузится один раз и кешируется в памяти, чтобы не перезапрашивать
// CSV на каждый рендер.
// ============================================================

/** Одна строка датасета — агрегированные показатели одного класса. */
export interface SyntheticClassRow {
  academicYear: string        // academic_year, напр. "2025/2026"
  className: string           // class_name, напр. "7Б"
  grade: number               // grade (параллель 1..11)
  classLetter: string         // class_letter
  studentsCount: number       // students_count — учеников в классе
  avgGrade5: number           // avg_grade_5 — средняя оценка (шкала 5)
  attendancePct: number       // attendance_pct — посещаемость, %
  homeworkCompletionPct: number
  testsAvgPct: number
  behaviorScore100: number
  olympiadParticipationPct: number
  clubParticipationPct: number
  parentEngagementPct: number
  examGradeFlag: number
  ratingScore100: number      // rating_score_100 — интегральный индекс класса (0..100)
  ratingPlace: number
  ratingGroup: string         // rating_group, напр. "A: лидер"
  riskProbability: number
  riskScore100: number        // risk_score_100 — индекс риска (0..100, выше — хуже)
  riskLevel: string           // risk_level: "низкий" | "средний" | "высокий"
  riskReason: string          // risk_reason — текстовая расшифровка факторов риска
}

/** Порядок колонок в CSV (используется парсером). */
const COLUMNS = [
  'academic_year', 'class_name', 'grade', 'class_letter', 'students_count',
  'avg_grade_5', 'attendance_pct', 'homework_completion_pct', 'tests_avg_pct',
  'behavior_score_100', 'olympiad_participation_pct', 'club_participation_pct',
  'parent_engagement_pct', 'exam_grade_flag', 'rating_score_100', 'rating_place',
  'rating_group', 'risk_probability', 'risk_score_100', 'risk_level', 'risk_reason',
] as const

/** Путь к CSV внутри public/ (Vite отдаёт его по корню сайта). */
const CSV_URL = '/data/synthetic_class_rating_data_v2.csv'

let cache: SyntheticClassRow[] | null = null

/** Превращает одну строку CSV в типизированный объект класса. */
function parseRow(line: string): SyntheticClassRow {
  // В этом датасете значения не содержат запятых внутри (risk_reason
  // разделяется точкой с запятой), поэтому достаточно простого split(',').
  const cells = line.split(',')
  const get = (name: (typeof COLUMNS)[number]) => cells[COLUMNS.indexOf(name)]?.trim() ?? ''
  const num = (name: (typeof COLUMNS)[number]) => Number(get(name)) || 0
  return {
    academicYear: get('academic_year'),
    className: get('class_name'),
    grade: num('grade'),
    classLetter: get('class_letter'),
    studentsCount: num('students_count'),
    avgGrade5: num('avg_grade_5'),
    attendancePct: num('attendance_pct'),
    homeworkCompletionPct: num('homework_completion_pct'),
    testsAvgPct: num('tests_avg_pct'),
    behaviorScore100: num('behavior_score_100'),
    olympiadParticipationPct: num('olympiad_participation_pct'),
    clubParticipationPct: num('club_participation_pct'),
    parentEngagementPct: num('parent_engagement_pct'),
    examGradeFlag: num('exam_grade_flag'),
    ratingScore100: num('rating_score_100'),
    ratingPlace: num('rating_place'),
    ratingGroup: get('rating_group'),
    riskProbability: num('risk_probability'),
    riskScore100: num('risk_score_100'),
    riskLevel: get('risk_level'),
    riskReason: get('risk_reason'),
  }
}

/**
 * Загружает и парсит синтетический датасет классов.
 * Результат кешируется — повторные вызовы возвращают тот же массив.
 */
export async function loadSyntheticClasses(): Promise<SyntheticClassRow[]> {
  if (cache) return cache
  const res = await fetch(CSV_URL)
  if (!res.ok) throw new Error('Не удалось загрузить синтетический датасет')
  const text = await res.text()
  const lines = text
    .replace(/^﻿/, '') // убираем BOM, если есть
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  // Первая строка — заголовок, пропускаем её.
  cache = lines.slice(1).map(parseRow)
  return cache
}
