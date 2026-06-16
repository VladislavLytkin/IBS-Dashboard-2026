const configuredApiUrl = import.meta.env.VITE_API_URL
const BASE_URL = (configuredApiUrl || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api')).replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      ...options,
    })
  } catch {
    throw new ApiError(0, 'Backend недоступен. Запустите сервер: cd backend && npm run dev')
  }

  if (res.status === 204) return undefined as T
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    const message = isJson && body?.error ? body.error : `Ошибка запроса (${res.status})`
    throw new ApiError(res.status, message)
  }
  return body as T
}

export const apiGet = <T>(path: string) => request<T>(path)
export const apiPost = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: 'POST', body: data != null ? JSON.stringify(data) : undefined })
export const apiPatch = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: 'PATCH', body: data != null ? JSON.stringify(data) : undefined })
export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' })

/** Скачивание бинарного файла (отчёт .xlsx) с авторизацией через cookie. */
export async function apiDownload(path: string, method: 'GET' | 'POST', data?: unknown): Promise<Blob> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: data != null ? { 'Content-Type': 'application/json' } : undefined,
    body: data != null ? JSON.stringify(data) : undefined,
  })
  if (!res.ok) throw new ApiError(res.status, `Не удалось сформировать отчёт (${res.status})`)
  return res.blob()
}

export function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') usp.set(k, String(v))
  }
  const s = usp.toString()
  return s ? `?${s}` : ''
}
