import type {
  ClassOlympiadIndex,
  MonthlyPoint,
  OlympiadComparisonResult,
  OlympiadSubject,
  ParallelFilterValue,
} from '../types'
import { CLASSES } from './classes'
import { STUDENTS } from './students'
import { between, round1, rngFor } from '../utils/random'
import { clampScore } from '../utils/scoring'

// Олимпиадные направления (нормальные предметы, а не разделы математики).
export const OLYMPIAD_SUBJECTS: OlympiadSubject[] = [
  'Математика',
  'Информатика',
  'Физика',
  'Химия',
  'Биология',
  'Обществознание',
  'История',
  'География',
  'Литература',
  'Английский язык',
  'Экономика',
  'Право',
]

const SUBJECT_BASE: Record<OlympiadSubject, number> = {
  'Математика': 78,
  'Информатика': 81,
  'Физика': 69,
  'Химия': 62,
  'Биология': 57,
  'Обществознание': 66,
  'История': 54,
  'География': 48,
  'Литература': 71,
  'Английский язык': 76,
  'Экономика': 59,
  'Право': 52,
}

function buildOlympiadComparison(subject: OlympiadSubject): OlympiadComparisonResult {
  const rnd = rngFor(`olymp:${subject}`)
  const school = Math.round(clampScore(SUBJECT_BASE[subject] + between(rnd, -4, 7)))
  const city = Math.round(clampScore(school - between(rnd, 3, 9)))
  const region = Math.round(clampScore(city - between(rnd, 1, 6)))
  return { subject, school, city, region }
}

export const OLYMPIAD_SUBJECT_RESULTS: OlympiadComparisonResult[] =
  OLYMPIAD_SUBJECTS.map(buildOlympiadComparison)

// ===================== Рейтинг классов по олимпиадному индексу =====================
function classIndex(classId: string, grade: number, olympiadScore: number): ClassOlympiadIndex {
  const rnd = rngFor(`olymp-class:${classId}`)
  return {
    classId,
    grade: grade as ClassOlympiadIndex['grade'],
    participationPct: round1(clampScore(olympiadScore * 0.7 + between(rnd, 5, 20))),
    awardPct: round1(clampScore(olympiadScore * 0.35 + between(rnd, 2, 12))),
    avgScore: round1(clampScore(olympiadScore + between(rnd, -6, 8))),
    index: round1(olympiadScore),
  }
}

const ALL_INDEXES: ClassOlympiadIndex[] = CLASSES.map((c) => classIndex(c.id, c.grade, c.olympiadScore))

export function getOlympiadRanking(parallel: ParallelFilterValue): ClassOlympiadIndex[] {
  const rows = parallel === 'all' ? ALL_INDEXES : ALL_INDEXES.filter((r) => r.grade === parallel)
  return [...rows].sort((a, b) => b.index - a.index)
}

// ===================== Сводные карточки по параллели =====================
export interface OlympiadSummary {
  participants: number
  awards: number
  avgIndex: number
  deltaPct: number
}

export function getOlympiadSummary(parallel: ParallelFilterValue): OlympiadSummary {
  const students = parallel === 'all' ? STUDENTS : STUDENTS.filter((s) => s.grade === parallel)
  const ranking = getOlympiadRanking(parallel)
  const participants = students.filter((s) => s.olympiadParticipation).length
  const awards = students.reduce((sum, s) => sum + s.olympiadAwards, 0)
  const avgIndex = ranking.length
    ? round1(ranking.reduce((sum, r) => sum + r.index, 0) / ranking.length)
    : 0
  const rnd = rngFor(`olymp-summary:${parallel}`)
  return { participants, awards, avgIndex, deltaPct: round1(between(rnd, -3, 9)) }
}

export const OLYMPIAD_DYNAMICS: MonthlyPoint[] = [
  { label: 'Сен', value: 58 },
  { label: 'Окт', value: 61 },
  { label: 'Ноя', value: 64 },
  { label: 'Дек', value: 63 },
  { label: 'Янв', value: 67 },
  { label: 'Фев', value: 70 },
  { label: 'Мар', value: 72 },
  { label: 'Апр', value: 74 },
  { label: 'Май', value: 76 },
]
