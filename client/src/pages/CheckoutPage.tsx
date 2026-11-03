import { useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import { useCart } from '../cart/useCart'
import { formatMoney } from '../lib/formatters'
import {
  getAddresses,
  getCheckoutQuote,
  type CheckoutQuote,
  type CustomerAddress,
} from '../lib/api'
import './AddressBookPage.css'

function addressId(address: CustomerAddress) {
  return address.id || address._id || ''
}

function CheckoutPage() {
  const { cart, status: cartStatus, error: cartError } = useCart()
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [addressesLoaded, setAddressesLoaded] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [quote, setQuote] = useState<CheckoutQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState('')

  useEffect(() => {
    let active = true
    getAddresses()
      .then((savedAddresses) => {
        if (!active) return
        setAddresses(savedAddresses)
        const initialAddress =
          savedAddresses.find((address) => address.isDefaultShipping) ||
          savedAddresses[0]
        setSelectedAddressId(initialAddress ? addressId(initialAddress) : '')
      })
      .catch((requestError) => {
        if (active)
          setAddressError(
            requestError instanceof Error
              ? requestError.message
              : 'Saved addresses could not be loaded.',
          )
      })
      .finally(() => {
        if (active) setAddressesLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (
      !addressesLoaded ||
      cartStatus !== 'ready' ||
      !cart ||
      cart.items.length === 0
    ) {
      return
    }

    let active = true
    Promise.resolve()
      .then(async () => {
        if (!active) return
        setQuote(null)
        setQuoteLoading(true)
        setQuoteError('')
        return getCheckoutQuote(selectedAddressId || undefined)
      })
      .then((nextQuote) => {
        if (active && nextQuote) setQuote(nextQuote)
      })
      .catch((requestError) => {
        if (active)
          setQuoteError(
            requestError instanceof Error
              ? requestError.message
              : 'The checkout quote could not be loaded.',
          )
      })
      .finally(() => {
        if (active) setQuoteLoading(false)
      })

    return () => {
      active = false
    }
  }, [addressesLoaded, cartStatus, cart, selectedAddressId])

  return (
    <main className="checkout-page">
      <SiteHeader className="site-header catalog-header" />
      <section className="checkout-content" aria-labelledby="checkout-title">
        <div className="checkout-heading-row">
          <div>
            <p className="eyebrow">Checkout preview</p>
            <h1 id="checkout-title">Review your order</h1>
            <p className="checkout-intro">
              Choose a shipping address to see vendor shipping and any issues
              that need attention.
            </p>
          </div>
          <a className="address-back" href="/cart">
            Back to cart
          </a>
        </div>

        {cartStatus === 'loading' && (
          <p className="checkout-loading" role="status">
            Loading your cart…
          </p>
        )}
        {cartStatus === 'error' && (
          <p className="checkout-error" role="alert">
            {cartError || 'Your cart could not be loaded.'}
          </p>
        )}
        {cartStatus === 'ready' && cart?.items.length === 0 && (
          <div className="checkout-empty">
            <p>Your cart is empty, so there’s nothing to review yet.</p>
            <a className="button" href="/products">
              Browse products
            </a>
          </div>
        )}

        {cartStatus === 'ready' && cart && cart.items.length > 0 && (
          <div className="checkout-layout">
            <div>
              <section aria-labelledby="shipping-address-title">
                <div className="checkout-section-title">
                  <h2 id="shipping-address-title">Shipping address</h2>
                  <a href="/addresses">Manage addresses</a>
                </div>
                {addressError && (
                  <p className="checkout-error" role="alert">
                    {addressError}
                  </p>
                )}
                {!addressesLoaded && (
                  <p className="checkout-loading" role="status">
                    Loading saved addresses…
                  </p>
                )}
                {addressesLoaded && addresses.length === 0 && (
                  <div className="checkout-address-option">
                    <p>
                      You need a shipping address before vendors can confirm
                      delivery.
                    </p>
                    <a href="/addresses">Add an address</a>
                  </div>
                )}
                <div className="checkout-address-list">
                  {addresses.map((address) => {
                    const id = addressId(address)
                    return (
                      <div className="checkout-address-option" key={id}>
                        <input
                          checked={selectedAddressId === id}
                          id={`shipping-${id}`}
                          name="shippingAddress"
                          onChange={() => setSelectedAddressId(id)}
                          type="radio"
                        />
                        <label htmlFor={`shipping-${id}`}>
                          <strong>
                            {address.label}
                            {address.isDefaultShipping ? ' · Default' : ''}
                          </strong>
                          <p>{address.recipientName}</p>
                          <p>
                            {address.addressLine1}
                            {address.addressLine2
                              ? `, ${address.addressLine2}`
                              : ''}
                          </p>
                          <p>
                            {address.city}, {address.region}{' '}
                            {address.postalCode} · {address.countryCode}
                          </p>
                        </label>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section
                className="checkout-vendors"
                aria-labelledby="quote-details-title"
              >
                <div className="checkout-section-title">
                  <h2 id="quote-details-title">Items and shipping</h2>
                </div>
                {quoteLoading && (
                  <p className="checkout-loading" role="status">
                    Updating your quote…
                  </p>
                )}
                {quoteError && (
                  <p className="checkout-error" role="alert">
                    {quoteError}
                  </p>
                )}
                {quote &&
                  quote.vendors.map((group) => (
                    <article
                      className="checkout-vendor-card"
                      key={group.vendor.id}
                    >
                      <h2>{group.vendor.displayName}</h2>
                      <p className="checkout-vendor-name">Vendor items</p>
                      {group.items.map((item) => (
                        <div
                          className="checkout-quote-line"
                          key={item.variantId}
                        >
                          <span>
                            {item.productTitle} · {item.variantTitle}
                            <small className="checkout-line-detail">
                              Qty {item.quantity} ·{' '}
                              {formatMoney(
                                item.unitPrice.amount,
                                item.unitPrice.currency,
                              )}{' '}
                              each
                            </small>
                            {!item.inStock && (
                              <small className="checkout-line-detail checkout-inline-issue">
                                Only {item.available} currently available
                              </small>
                            )}
                          </span>
                          <strong>
                            {formatMoney(
                              item.lineSubtotal.amount,
                              item.lineSubtotal.currency,
                            )}
                          </strong>
                        </div>
                      ))}
                      <div className="checkout-quote-line">
                        <span>Vendor subtotal</span>
                        <strong>
                          {formatMoney(
                            group.subtotal.amount,
                            group.subtotal.currency,
                          )}
                        </strong>
                      </div>
                      <div
                        className={`checkout-quote-line${group.shipping ? '' : ' checkout-line-blocked'}`}
                      >
                        <span>Shipping</span>
                        <strong>
                          {group.shipping
                            ? formatMoney(
                                group.shipping.amount,
                                group.shipping.currency,
                              )
                            : 'Unavailable'}
                        </strong>
                      </div>
                    </article>
                  ))}
                {!quote && !quoteLoading && !quoteError && addressesLoaded && (
                  <p className="checkout-loading">
                    A quote will appear here when available.
                  </p>
                )}
              </section>
            </div>

            <aside
              className="checkout-summary"
              aria-label="Quote summary"
              aria-busy={quoteLoading}
            >
              <h2>Quote summary</h2>
              <div className="checkout-total-line">
                <span>Items</span>
                <strong>
                  {quote
                    ? formatMoney(
                        quote.subtotal.amount,
                        quote.subtotal.currency,
                      )
                    : '—'}
                </strong>
              </div>
              <div className="checkout-total-line">
                <span>Shipping</span>
                <strong>
                  {quote?.shipping
                    ? formatMoney(
                        quote.shipping.amount,
                        quote.shipping.currency,
                      )
                    : quote
                      ? 'Unavailable'
                      : '—'}
                </strong>
              </div>
              <div className="checkout-total-line">
                <span>Total before tax</span>
                <strong>
                  {quote?.totalBeforeTax
                    ? formatMoney(
                        quote.totalBeforeTax.amount,
                        quote.totalBeforeTax.currency,
                      )
                    : quote
                      ? 'Unavailable'
                      : '—'}
                </strong>
              </div>
              <div className="checkout-total-line">
                <span>Tax</span>
                <strong>
                  {quote?.tax
                    ? formatMoney(quote.tax.amount, quote.tax.currency)
                    : 'Not calculated'}
                </strong>
              </div>
              {quote && quote.blockers.length > 0 && (
                <div className="checkout-blockers" role="status">
                  <h3>Needs attention</h3>
                  <ul>
                    {quote.blockers.map((blocker, index) => (
                      <li
                        key={`${blocker.code}-${blocker.vendorId || blocker.variantId || index}`}
                      >
                        {blocker.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="checkout-not-ready">
                This is a quote preview only. Payment and order placement aren’t
                available yet.
              </p>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}

export default CheckoutPage
