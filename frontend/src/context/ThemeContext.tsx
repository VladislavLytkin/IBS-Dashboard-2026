import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark'

interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeCtx = createContext<ThemeState | null>(null)
const KEY = 'ibs-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(KEY)
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  const setTheme = (next: ThemeMode) => setThemeState(next)
  const toggleTheme = () => setThemeState((v) => (v === 'dark' ? 'light' : 'dark'))

  return <ThemeCtx.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeCtx.Provider>
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme должен использоваться внутри ThemeProvider')
  return ctx
}
