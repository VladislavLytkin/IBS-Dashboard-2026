import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { PublicUser, Role } from '../api/types'
import { authService } from '../services'

interface AuthState {
  user: PublicUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (...roles: Role[]) => boolean
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const r = await authService.login(email, password)
    setUser(r.user)
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }

  // Директор — суперпользователь: имеет доступ ко всем разделам и пунктам меню.
  const hasRole = (...roles: Role[]) =>
    user ? user.role === 'DIRECTOR' || roles.includes(user.role) : false

  return <AuthCtx.Provider value={{ user, loading, login, logout, hasRole }}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider')
  return ctx
}
