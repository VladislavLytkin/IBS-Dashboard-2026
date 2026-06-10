import { createContext, useContext, useState, type ReactNode } from 'react'

export const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026]

interface FiltersState {
  year: number
  setYear: (y: number) => void
}

const FiltersCtx = createContext<FiltersState | null>(null)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState(2026)
  return <FiltersCtx.Provider value={{ year, setYear }}>{children}</FiltersCtx.Provider>
}

export function useFilters(): FiltersState {
  const ctx = useContext(FiltersCtx)
  if (!ctx) throw new Error('useFilters должен использоваться внутри FiltersProvider')
  return ctx
}
