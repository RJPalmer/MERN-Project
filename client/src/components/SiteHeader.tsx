import { useState } from 'react'
import { useAuth } from '../auth/useAuth'

function SiteHeader({ className = 'site-header' }: { className?: string }) {
  const { user, signOut } = useAuth()
  const [error, setError] = useState('')

  async function handleSignOut() {
    setError('')
    try {
      await signOut()
      window.location.assign('/')
    } catch {
      setError('Sign out could not reach the server. Please try again.')
    }
  }

  return (
    <header className={className}>
      <a className="wordmark" href="/" aria-label="Marketplace home">
        market<span>place</span>
      </a>
      <nav className="primary-nav" aria-label="Main navigation">
        <a href="/products">Discover</a>
        <a href="/#how-it-works">How it works</a>
      </nav>
      <div className="header-actions">
        {user ? (
          <>
            <span className="header-greeting">Hi, {user.displayName}</span>
            <a className="sign-in" href="/cart">Cart</a>
            <button className="header-signout" onClick={handleSignOut} type="button">Sign out</button>
          </>
        ) : (
          <>
            <a className="sign-in" href="/sign-in">Sign in</a>
            <a className="button button-small" href="/register">Create account</a>
          </>
        )}
        {error && <p className="header-error" role="alert">{error}</p>}
      </div>
    </header>
  )
}

export default SiteHeader
