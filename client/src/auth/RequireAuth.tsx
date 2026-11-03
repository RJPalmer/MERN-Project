import { useEffect, type ReactNode } from 'react'
import { useAuth } from './useAuth'
import './RequireAuth.css'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  useEffect(() => {
    if (status !== 'anonymous') return
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.replace(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`)
  }, [status])

  if (status === 'loading') {
    return <main className="auth-gate-message" role="status">Restoring your session…</main>
  }

  if (status === 'anonymous') {
    return <main className="auth-gate-message" role="status">Taking you to sign in…</main>
  }

  return children
}
