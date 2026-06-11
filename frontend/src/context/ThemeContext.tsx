import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark'

export interface ColorOption {
  name: string
  value: string
}

// Палитры персонализации (выбор аккуратными swatches в настройках).
export const ACCENT_COLORS: ColorOption[] = [
  { name: 'Синий', value: '#3B82F6' },
  { name: 'Фиолетовый', value: '#8B5CF6' },
  { name: 'Зелёный', value: '#22C55E' },
  { name: 'Шоколадный', value: '#7B3F00' },
  { name: 'Бежевый', value: '#D6B98C' },
]

export const BG_COLORS: ColorOption[] = [
  { name: 'Тёмный', value: '#0F172A' },
  { name: 'Графитовый', value: '#111827' },
  { name: 'Светлый', value: '#F8FAFC' },
  { name: 'Бежевый', value: '#F3E7D3' },
  { name: 'Шоколадный', value: '#2A1710' },
]

interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  accent: string | null
  setAccent: (color: string | null) => void
  appBg: string | null
  setAppBg: (color: string | null) => void
}

const ThemeCtx = createContext<ThemeState | null>(null)
const KEY = 'ibs-theme'
const ACCENT_KEY = 'ibs-accent'
const BG_KEY = 'ibs-bg'

/** Полупрозрачная подложка для «мягких» состояний (hover, выделение). */
function softOf(hex: string): string {
  return `${hex}26` // ~15% alpha
}

function applyAccent(accent: string | null) {
  const root = document.documentElement
  if (accent) {
    root.style.setProperty('--blue', accent)
    root.style.setProperty('--blue-soft', softOf(accent))
    root.style.setProperty('--sidebar-active', accent)
  } else {
    root.style.removeProperty('--blue')
    root.style.removeProperty('--blue-soft')
    root.style.removeProperty('--sidebar-active')
  }
}

function applyAppBg(appBg: string | null) {
  const root = document.documentElement
  if (appBg) root.style.setProperty('--bg', appBg)
  else root.style.removeProperty('--bg')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(KEY)
    return saved === 'dark' ? 'dark' : 'light'
  })
  const [accent, setAccentState] = useState<string | null>(() => localStorage.getItem(ACCENT_KEY))
  const [appBg, setAppBgState] = useState<string | null>(() => localStorage.getItem(BG_KEY))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  useEffect(() => {
    applyAccent(accent)
    if (accent) localStorage.setItem(ACCENT_KEY, accent)
    else localStorage.removeItem(ACCENT_KEY)
  }, [accent])

  useEffect(() => {
    applyAppBg(appBg)
    if (appBg) localStorage.setItem(BG_KEY, appBg)
    else localStorage.removeItem(BG_KEY)
  }, [appBg])

  const setTheme = (next: ThemeMode) => setThemeState(next)
  const toggleTheme = () => setThemeState((v) => (v === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggleTheme, accent, setAccent: setAccentState, appBg, setAppBg: setAppBgState }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme должен использоваться внутри ThemeProvider')
  return ctx
}
