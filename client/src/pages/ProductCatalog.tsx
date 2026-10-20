import { useEffect, useState } from 'react'
import { getStorefrontProducts, type StorefrontProduct } from '../lib/api'
import './ProductCatalog.css'

const PAGE_SIZE = 20

function ProductCatalog() {
  const searchParams = new URLSearchParams(window.location.search)
  const query = searchParams.get('q') || ''
  const vendor = searchParams.get('vendor') || ''
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getStorefrontProducts({ query, vendor, limit: PAGE_SIZE })
      .then((page) => {
        if (!active) return
        setProducts(page.products)
        setNextCursor(page.nextCursor)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'Unable to load products.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [query, vendor])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setError('')

    try {
      const page = await getStorefrontProducts({ query, vendor, cursor: nextCursor, limit: PAGE_SIZE })
      setProducts((current) => [...current, ...page.products])
      setNextCursor(page.nextCursor)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load more products.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <a className="wordmark" href="/" aria-label="Marketplace home">
          market<span>place</span>
        </a>
        <a className="catalog-back" href="/">
          Back to home
        </a>
      </header>

      <section className="catalog-content" aria-labelledby="catalog-title">
        <p className="eyebrow">The marketplace</p>
        <h1 id="catalog-title">Discover something different.</h1>
        <p className="catalog-intro">Shop independent vendors and the products they’re proud to make.</p>

        <form className="catalog-filters" action="/products" method="get">
          <label>
            <span>Search products</span>
            <input name="q" defaultValue={query} maxLength={100} placeholder="Try a product or brand" />
          </label>
          <label>
            <span>Vendor slug</span>
            <input
              name="vendor"
              defaultValue={vendor}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="Filter by vendor"
            />
          </label>
          <button className="button" type="submit">
            Search
          </button>
        </form>

        {error && <p className="catalog-error" role="alert">{error}</p>}
        {loading ? (
          <p className="catalog-message">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="catalog-message">No products found. Try a different search.</p>
        ) : (
          <>
            <p className="catalog-result-count">Showing {products.length} products</p>
            <div className="catalog-list">
              {products.map((product) => (
                <article className="catalog-list-item" key={product.id}>
                  <h2>{product.title}</h2>
                  <p>{product.vendor.displayName}</p>
                  {product.shortDescription && <p>{product.shortDescription}</p>}
                </article>
              ))}
            </div>
            {nextCursor && (
              <button className="button catalog-more" type="button" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default ProductCatalog
