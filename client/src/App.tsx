import './App.css'

const copyrightYear = new Date().getFullYear()

function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Market home">
          market<span>place</span>
        </a>
        <nav className="primary-nav" aria-label="Main navigation">
          <a href="#discover">Discover</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="header-actions">
          <a className="sign-in" href="#sign-in">
            Sign in
          </a>
          <a className="button button-small" href="#get-started">
            Get started
          </a>
        </div>
      </header>

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
              <a className="button" href="#get-started">
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
