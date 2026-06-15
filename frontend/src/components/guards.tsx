import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Role } from '../api/types'

function FullScreenLoader() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
      Загрузка…
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  // Директор — суперпользователь: полный доступ ко всем страницам.
  if (user.role !== 'DIRECTOR' && !roles.includes(user.role)) return <Navigate to="/no-access" replace />
  return <>{children}</>
}
