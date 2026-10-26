import './App.css'
import ProductCatalog from './pages/ProductCatalog'
import ProductDetail from './pages/ProductDetail'
import AuthPage from './pages/AuthPage'
import SiteHeader from './components/SiteHeader'
import { RequireAuth } from './auth/RequireAuth'

const copyrightYear = new Date().getFullYear()

function App() {
  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  if (pathSegments.length === 1 && pathSegments[0] === 'sign-in') {
    return <AuthPage mode="sign-in" />
  }
  if (pathSegments.length === 1 && pathSegments[0] === 'register') {
    return <AuthPage mode="register" />
  }
  if (pathSegments[0] === 'products' && pathSegments.length === 2) return <ProductCatalog />
  if (pathSegments[0] === 'products' && pathSegments.length === 3) {
    return <ProductDetail vendorSlug={pathSegments[1]} productSlug={pathSegments[2]} />
  }
  if (pathSegments.length === 1 && pathSegments[0] === 'cart') {
    return (
      <RequireAuth>
        <main className="protected-placeholder">
          <SiteHeader />
          <p>Your cart will be available here.</p>
        </main>
      </RequireAuth>
    )
  }

  return (
    <div className="app-shell">
      <SiteHeader />

      <main>
        <section className="hero" id="discover">
          <div className="hero-copy">
            <p className="eyebrow">A better way to source</p>
            <h1>Good products.<br />Great people behind them.</h1>
            <p className="hero-description">
              Discover independent vendors and the products they’re proud to make.
              One marketplace, more ways to find your next favorite.
            </p>
            <div className="hero-actions">
              <a className="button" href="/products">
                Explore the marketplace <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href="#how-it-works">
                Learn more <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-card card-back">
              <span className="card-sun" />
              <span className="card-horizon" />
            </div>
            <div className="art-card card-front">
              <span className="card-label">MADE WITH INTENTION</span>
              <span className="card-vase" />
              <span className="card-base" />
            </div>
            <span className="art-spark spark-one">✳</span>
            <span className="art-spark spark-two">✳</span>
            <span className="art-caption">Thoughtfully made, ready to be found.</span>
          </div>
        </section>

        <section className="trust-strip" id="how-it-works" aria-label="Marketplace benefits">
          <p>MADE BY INDEPENDENT VENDORS</p>
          <span />
          <p>BUILT FOR EVERY KIND OF BUYER</p>
          <span />
          <p>DISCOVER SOMETHING DIFFERENT</p>
        </section>

        <section className="intro" id="get-started">
          <p className="eyebrow">A marketplace with more to offer</p>
          <h2>Find the right things<br />from the right people.</h2>
          <p>
            We’re building a home for independent vendors and the people who want
            to buy from them. Browse the collection and meet the makers behind it.
          </p>
          <a className="text-link" href="#discover">
            Back to the top <span aria-hidden="true">↑</span>
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <a className="wordmark" href="/" aria-label="Market home">
          market<span>place</span>
        </a>
        <p>Independent finds. Thoughtfully sourced.</p>
        <span>© {copyrightYear} Marketplace</span>
      </footer>
    </div>
  )
}

export default App
