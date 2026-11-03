import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  login as loginRequest,
  logout as logoutRequest,
  refreshAuthSession,
  register as registerRequest,
  setAccessToken,
  type User,
} from '../lib/api'
import { AuthContext, type AuthStatus } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let active = true

    refreshAuthSession()
      .then((session) => {
        if (!active) return
        setUser(session.user)
        setStatus('authenticated')
      })
      .catch(() => {
        setAccessToken(null)
        if (active) {
          setUser(null)
          setStatus('anonymous')
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function handleExpiredSession() {
      setUser(null)
      setStatus('anonymous')
    }

    window.addEventListener('marketplace:auth-expired', handleExpiredSession)
    return () => window.removeEventListener('marketplace:auth-expired', handleExpiredSession)
  }, [])

  async function signIn(email: string, password: string) {
    const session = await loginRequest(email, password)
    setUser(session.user)
    setStatus('authenticated')
  }

  async function signUp(email: string, password: string, displayName: string) {
    const session = await registerRequest({ email, password, displayName })
    setUser(session.user)
    setStatus('authenticated')
  }

  async function signOut() {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
      setStatus('anonymous')
    }
  }

  const value = useMemo(
    () => ({ user, status, signIn, signUp, signOut }),
    [user, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

