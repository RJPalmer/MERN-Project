import { useEffect, useState } from 'react'
import { getStorefrontProducts, type StorefrontProduct } from '../lib/api'
import './ProductCatalog.css'

const PAGE_SIZE = 20

function getPrice(product: StorefrontProduct) {
  const prices = product.variants.map((variant) => {
    const price = variant.pricing.sale || variant.pricing.list
    return { amount: price.amount, currency: price.currency }
  })
  const firstPrice = prices[0]
  if (!firstPrice) return null

  const currency = firstPrice.currency
  const matchingPrices = prices.filter((price) => price.currency === currency)
  const lowestPrice = matchingPrices.reduce(
    (lowest, price) => (price.amount < lowest.amount ? price : lowest),
    firstPrice,
  )

  const fractionDigits = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2
  const divisor = 10 ** fractionDigits
  const formattedPrice = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(lowestPrice.amount / divisor)

  return `From ${formattedPrice}`
}

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
            <div className="product-grid">
              {products.map((product) => {
                const image = product.media.find((media) => media.type === 'image')

                return (
                  <a
                    className="product-card"
                    href={`/products/${encodeURIComponent(product.vendor.slug)}/${encodeURIComponent(product.slug)}`}
                    key={product.id}
                  >
                    <div className="product-card-image">
                      {image ? (
                        <img src={image.url} alt={image.alt || product.title} loading="lazy" />
                      ) : (
                        <span className="image-placeholder" aria-hidden="true">No image yet</span>
                      )}
                    </div>
                    <div className="product-card-copy">
                      <p className="product-vendor">{product.vendor.displayName}</p>
                      <h2>{product.title}</h2>
                      {product.shortDescription && (
                        <p className="product-description">{product.shortDescription}</p>
                      )}
                      <p className="product-price">{getPrice(product) || 'Price unavailable'}</p>
                    </div>
                  </a>
                )
              })}
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
