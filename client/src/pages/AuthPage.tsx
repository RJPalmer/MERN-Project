import { useState, type FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { useAuth } from '../auth/useAuth'
import './AuthPage.css'

type AuthPageProps = {
  mode: 'sign-in' | 'register'
}

function getReturnPath() {
  const requestedPath = new URLSearchParams(window.location.search).get('returnTo')
  if (!requestedPath || !requestedPath.startsWith('/') || requestedPath.startsWith('//')) return '/'
  if (requestedPath === '/sign-in' || requestedPath === '/register') return '/'
  return requestedPath
}

function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === 'register'
  const { signIn, signUp } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const returnPath = getReturnPath()
  const switchPath = isRegister ? '/sign-in' : '/register'
  const switchLabel = isRegister ? 'Sign in' : 'Create an account'
  const switchHref = `${switchPath}?returnTo=${encodeURIComponent(returnPath)}`

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)

    try {
      if (isRegister) await signUp(email, password, displayName)
      else await signIn(email, password)
      window.location.replace(returnPath)
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'We couldn’t complete your request. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <a className="wordmark auth-wordmark" href="/" aria-label="Marketplace home">
        market<span>place</span>
      </a>
      <section className="auth-panel" aria-labelledby="auth-title">
        <p className="eyebrow">Welcome to the marketplace</p>
        <h1 id="auth-title">{isRegister ? 'Create your account.' : 'Welcome back.'}</h1>
        <p className="auth-intro">
          {isRegister
            ? 'Create an account to save your cart and keep track of your orders.'
            : 'Sign in to continue to your marketplace account.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label>
              <span>Name</span>
              <input
                autoComplete="name"
                maxLength={80}
                minLength={1}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                value={displayName}
              />
            </label>
          )}
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              maxLength={128}
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            {isRegister && <small>Use at least 12 characters.</small>}
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button auth-submit" disabled={submitting} type="submit">
            {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to the marketplace?'}{' '}
          <a href={switchHref}>{switchLabel}</a>
        </p>
      </section>
      <a className="auth-back" href="/products">Continue browsing</a>
    </main>
  )
}

export default AuthPage
