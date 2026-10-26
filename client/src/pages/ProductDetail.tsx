import { useEffect, useState } from 'react'
import { getStorefrontProduct, type StorefrontProduct } from '../lib/api'
import { formatMoney } from '../lib/formatters'
import SiteHeader from '../components/SiteHeader'
import './ProductDetail.css'

type ProductDetailProps = {
  vendorSlug: string
  productSlug: string
}

function ProductDetail({ vendorSlug, productSlug }: ProductDetailProps) {
  const [product, setProduct] = useState<StorefrontProduct | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true

    getStorefrontProduct(vendorSlug, productSlug)
      .then((result) => {
        if (!active) return
        setProduct(result)
        setSelectedVariantId(result.variants[0]?.id || '')
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'Unable to load this product.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [vendorSlug, productSlug, requestVersion])

  function retry() {
    setError('')
    setProduct(null)
    setLoading(true)
    setRequestVersion((version) => version + 1)
  }

  const variant = product?.variants.find((item) => item.id === selectedVariantId) || product?.variants[0]
  const images = product?.media.filter((media) => media.type === 'image') || []
  const image = images[selectedImage]
  const price = variant?.pricing.sale || variant?.pricing.list

  return (
    <main className="detail-page">
      <SiteHeader className="site-header catalog-header" />

      {loading ? (
        <p className="detail-message" role="status" aria-live="polite">Loading product…</p>
      ) : error || !product ? (
        <section className="detail-message" role="alert">
          <h1>We couldn’t find that product.</h1>
          <p>{error || 'This product may have been removed or is no longer available.'}</p>
          {error && <button className="button detail-retry" onClick={retry} type="button">Try again</button>}
          <a className="button" href="/products">Browse products</a>
        </section>
      ) : (
        <>
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <a href="/products">Products</a>
            <span aria-hidden="true">/</span>
            <a href={`/products?vendor=${encodeURIComponent(product.vendor.slug)}`}>
              {product.vendor.displayName}
            </a>
            <span aria-hidden="true">/</span>
            <span>{product.title}</span>
          </nav>

          <article className="product-detail">
            <section className="detail-gallery" aria-label="Product images">
              <div className="detail-image">
                {image ? (
                  <img src={image.url} alt={image.alt || product.title} />
                ) : (
                  <span className="image-placeholder">No image yet</span>
                )}
              </div>
              {images.length > 1 && (
                <div className="detail-thumbnails" aria-label="Choose product image">
                  {images.map((item, index) => (
                    <button
                      aria-label={`Show image ${index + 1}`}
                      aria-pressed={selectedImage === index}
                      className={selectedImage === index ? 'thumbnail is-selected' : 'thumbnail'}
                      key={item.url}
                      onClick={() => setSelectedImage(index)}
                      type="button"
                    >
                      <img src={item.url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="detail-copy">
              <p className="eyebrow">{product.vendor.displayName}</p>
              {product.brand && <p className="detail-brand">{product.brand}</p>}
              <h1>{product.title}</h1>
              {product.shortDescription && <p className="detail-summary">{product.shortDescription}</p>}
              {price && <p className="detail-price">{formatMoney(price.amount, price.currency)}</p>}

              {product.variants.length > 1 && (
                <label className="variant-picker">
                  <span>Choose an option</span>
                  <select
                    onChange={(event) => setSelectedVariantId(event.target.value)}
                    value={variant?.id || ''}
                  >
                    {product.variants.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title || item.optionValues.map(({ value }) => value).join(' / ')}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {variant && (
                <p className={variant.available === 0 ? 'detail-stock is-unavailable' : 'detail-stock'}>
                  {variant.available === 0 ? 'Currently unavailable' : 'In stock'}
                </p>
              )}

              {product.description && <p className="detail-description">{product.description}</p>}

              {product.attributes.length > 0 && (
                <dl className="detail-attributes">
                  {product.attributes.map((attribute) => (
                    <div key={attribute.key}>
                      <dt>{attribute.label}</dt>
                      <dd>{attribute.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          </article>
        </>
      )}
    </main>
  )
}

export default ProductDetail
