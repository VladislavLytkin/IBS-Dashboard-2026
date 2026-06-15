// ============================================================
// Синтетический набор АДМИНИСТРАТИВНЫХ заявок.
//
// ВАЖНО: заявки НЕ связаны с риск-моделью учеников. Это отдельный поток
// проектной/олимпиадной активности:
//   - olympiad_result             — результаты олимпиад;
//   - spd_project_registration    — регистрация новых СПД-проектов;
//   - spd_project_participation   — участие в существующих СПД-проектах.
//
// Данные детерминированы (генерируются по фиксированным спецификациям),
// поэтому при каждой загрузке числа одинаковые и динамика не «прыгает».
// ============================================================

export type RequestType = 'olympiad_result' | 'spd_project_registration' | 'spd_project_participation'

export type RequestStatus = 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision'

export type RequestPriority = 'low' | 'medium' | 'high'

export interface SchoolRequest {
  requestId: string
  createdAt: string   // ISO-дата
  week: string        // ISO-неделя, напр. "2026-W24"
  month: string       // напр. "2026-06"
  year: number
  type: RequestType
  status: RequestStatus
  applicantId: string
  applicantName: string
  classId: string
  title: string
  description: string
  reviewerRole: string
  priority: RequestPriority
}

/** Статусы, которые считаются «на проверке» (актуальные заявки). */
export const ACTIONABLE_STATUSES: RequestStatus[] = ['pending', 'in_review', 'needs_revision']

/** Человекочитаемые названия типов заявок. */
export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  olympiad_result: 'Результаты олимпиад',
  spd_project_registration: 'Новые СПД-проекты',
  spd_project_participation: 'Участие в СПД-проектах',
}

/** Описания типов заявок. */
export const REQUEST_TYPE_DESCRIPTIONS: Record<RequestType, string> = {
  olympiad_result: 'Заявки на подтверждение или учёт результатов олимпиад.',
  spd_project_registration: 'Заявки на регистрацию новых СПД-проектов.',
  spd_project_participation: 'Заявки учеников на участие в уже существующих СПД-проектах.',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Черновик',
  pending: 'Ожидает',
  in_review: 'На рассмотрении',
  approved: 'Одобрена',
  rejected: 'Отклонена',
  needs_revision: 'На доработку',
}

// ---- Периоды (последняя доступная неделя и предыдущая) ----
export const CURRENT_WEEK = '2026-W24'
export const PREVIOUS_WEEK = '2026-W23'

// ---- Детерминированные пулы для заполнения заявок ----
const NAMES = [
  'Иванов Иван', 'Петрова Анна', 'Сидоров Пётр', 'Кузнецова Мария', 'Смирнов Алексей',
  'Васильева Дарья', 'Попов Дмитрий', 'Морозова Екатерина', 'Новиков Артём', 'Фёдорова София',
  'Волков Никита', 'Алексеева Полина', 'Лебедев Максим', 'Семёнова Виктория', 'Егоров Илья',
  'Павлова Алиса', 'Козлов Роман', 'Степанова Ксения', 'Орлов Тимур', 'Макарова Варвара',
]
const CLASSES = ['5А', '6Б', '7А', '7В', '8А', '8Г', '9Б', '9Д', '10А', '11В']
const PRIORITIES: RequestPriority[] = ['low', 'medium', 'high']

const TITLE_BY_TYPE: Record<RequestType, string> = {
  olympiad_result: 'Результат олимпиады',
  spd_project_registration: 'Регистрация СПД-проекта',
  spd_project_participation: 'Участие в СПД-проекте',
}

/** Сколько заявок каждого статуса создаётся за период (по типам). */
interface StatusCounts {
  pending?: number
  in_review?: number
  needs_revision?: number
  approved?: number
  rejected?: number
  draft?: number
}

// Спецификация набора: тип → неделя → распределение по статусам.
// Текущая неделя (W24): актуальных = 8 + 5 + 11 = 24.
// Предыдущая неделя (W23): актуальных = 12 + 9 + 13 = 34 → динамика 24 − 34 = −10.
const SPEC: { type: RequestType; week: string; month: string; counts: StatusCounts }[] = [
  { type: 'olympiad_result', week: CURRENT_WEEK, month: '2026-06', counts: { pending: 4, in_review: 3, needs_revision: 1, approved: 3, rejected: 1 } },
  { type: 'spd_project_registration', week: CURRENT_WEEK, month: '2026-06', counts: { pending: 2, in_review: 2, needs_revision: 1, approved: 2 } },
  { type: 'spd_project_participation', week: CURRENT_WEEK, month: '2026-06', counts: { pending: 6, in_review: 3, needs_revision: 2, approved: 3, draft: 1 } },

  { type: 'olympiad_result', week: PREVIOUS_WEEK, month: '2026-06', counts: { pending: 7, in_review: 4, needs_revision: 1, approved: 4, rejected: 2 } },
  { type: 'spd_project_registration', week: PREVIOUS_WEEK, month: '2026-06', counts: { pending: 5, in_review: 3, needs_revision: 1, approved: 1 } },
  { type: 'spd_project_participation', week: PREVIOUS_WEEK, month: '2026-06', counts: { pending: 7, in_review: 4, needs_revision: 2, approved: 2 } },
]

// Дата создания для недели (для отображения в таблице).
const WEEK_DATE: Record<string, string> = {
  [CURRENT_WEEK]: '2026-06-10',
  [PREVIOUS_WEEK]: '2026-06-03',
}

let cache: SchoolRequest[] | null = null

/** Строит детерминированный набор заявок из спецификации. */
function buildRequests(): SchoolRequest[] {
  const rows: SchoolRequest[] = []
  let seq = 0
  for (const { type, week, month, counts } of SPEC) {
    for (const status of Object.keys(counts) as RequestStatus[]) {
      const n = counts[status] ?? 0
      for (let i = 0; i < n; i++) {
        const idx = seq
        rows.push({
          requestId: `REQ-${String(seq + 1).padStart(3, '0')}`,
          createdAt: WEEK_DATE[week],
          week,
          month,
          year: 2026,
          type,
          status,
          applicantId: `S${String((idx % NAMES.length) + 1).padStart(3, '0')}`,
          applicantName: NAMES[idx % NAMES.length],
          classId: CLASSES[idx % CLASSES.length],
          title: TITLE_BY_TYPE[type],
          description: REQUEST_TYPE_DESCRIPTIONS[type],
          reviewerRole: type === 'olympiad_result' ? 'curator' : 'spd_coordinator',
          priority: PRIORITIES[idx % PRIORITIES.length],
        })
        seq++
      }
    }
  }
  return rows
}

/** Загружает синтетические заявки (с кешированием). */
export async function loadSyntheticRequests(): Promise<SchoolRequest[]> {
  if (!cache) cache = buildRequests()
  return cache
}

// ============================================================
// KPI по заявкам (считаются отдельно от рисков)
// ============================================================

export interface RequestKpis {
  reviewRequestsCount: number
  reviewRequestsWeeklyDelta: number | null
  olympiadRequestsCount: number
  spdProjectRegistrationRequestsCount: number
  spdProjectParticipationRequestsCount: number
}

const isActionable = (r: SchoolRequest) => ACTIONABLE_STATUSES.includes(r.status)

/**
 * Считает KPI по административным заявкам.
 * reviewRequestsCount — актуальные заявки за текущую неделю;
 * динамика — разница с предыдущей неделей (null, если её нет).
 */
export function calculateRequestKpis(requests: SchoolRequest[]): RequestKpis {
  const currentWeek = requests.filter((r) => r.week === CURRENT_WEEK && isActionable(r))
  const previousWeekRows = requests.filter((r) => r.week === PREVIOUS_WEEK)
  const previousWeekActionable = previousWeekRows.filter(isActionable)

  const countByType = (type: RequestType) => currentWeek.filter((r) => r.type === type).length

  return {
    reviewRequestsCount: currentWeek.length,
    reviewRequestsWeeklyDelta: previousWeekRows.length === 0 ? null : currentWeek.length - previousWeekActionable.length,
    olympiadRequestsCount: countByType('olympiad_result'),
    spdProjectRegistrationRequestsCount: countByType('spd_project_registration'),
    spdProjectParticipationRequestsCount: countByType('spd_project_participation'),
  }
}
