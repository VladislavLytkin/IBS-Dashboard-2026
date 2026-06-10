import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/** Простой хук загрузки данных из API. Перезапрос при изменении deps. */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[]): ApiState<T> & { reload: () => void } {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((e) =>
        active &&
        setState({
          data: null,
          loading: false,
          error: e instanceof ApiError ? e.message : 'Ошибка загрузки данных',
        }),
      )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { ...state, reload: () => setTick((t) => t + 1) }
}
