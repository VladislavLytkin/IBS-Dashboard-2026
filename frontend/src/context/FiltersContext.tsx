import { createContext, useContext, useState, type ReactNode } from 'react'

const currentYear = new Date().getFullYear()
export const YEARS = Array.from({ length: currentYear - 2020 + 1 }, (_, i) => 2020 + i)

interface FiltersState {
  year: number
  setYear: (y: number) => void
}

const FiltersCtx = createContext<FiltersState | null>(null)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState(currentYear)
  return <FiltersCtx.Provider value={{ year, setYear }}>{children}</FiltersCtx.Provider>
}

export function useFilters(): FiltersState {
  const ctx = useContext(FiltersCtx)
  if (!ctx) throw new Error('useFilters должен использоваться внутри FiltersProvider')
  return ctx
}
