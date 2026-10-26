import { useState, type FormEvent } from 'react'
import { useCart } from '../cart/useCart'
import { formatMoney } from '../lib/formatters'
import type { CartItem } from '../lib/api'
import SiteHeader from '../components/SiteHeader'
import './CartPage.css'

type CartLineProps = {
  item: CartItem
  currency: string
  disabled: boolean
  onUpdate: (variantId: string, quantity: number) => Promise<void>
  onRemove: (variantId: string) => Promise<void>
}

function CartLine({ item, currency, disabled, onUpdate, onRemove }: CartLineProps) {
  const image = item.product?.media.find((media) => media.type === 'image')

  async function submitQuantity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!item.variantId) return
    const formData = new FormData(event.currentTarget)
    const quantity = Number(formData.get('quantity'))
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return
    await onUpdate(item.variantId, quantity)
  }

  async function handleRemove() {
    if (item.variantId) await onRemove(item.variantId)
  }

  return (
    <article className="cart-line">
      <div className="cart-line-image">
        {image ? (
          <img src={image.url} alt={image.alt || item.product?.title || ''} loading="lazy" />
        ) : (
          <span aria-hidden="true">No image</span>
        )}
      </div>
      <div className="cart-line-main">
        <p className="cart-vendor">{item.vendor?.displayName || 'Marketplace vendor'}</p>
        <h2>{item.product?.title || 'Unavailable product'}</h2>
        {item.variant?.title && <p className="cart-variant">{item.variant.title}</p>}
        {item.issue && <p className="cart-issue" role="status">{item.issue}</p>}
        <div className="cart-line-controls">
          {item.variantId ? (
            <form className="cart-quantity-form" onSubmit={submitQuantity}>
              <label>
                <span>Quantity</span>
                <input
                  defaultValue={item.quantity}
                  max={9999}
                  min={1}
                  name="quantity"
                  required
                  type="number"
                />
              </label>
              <button className="cart-text-button" disabled={disabled} type="submit">Update</button>
            </form>
          ) : (
            <p className="cart-remove-note">Clear the cart to remove this unavailable item.</p>
          )}
          {item.variantId && (
            <button
              className="cart-text-button cart-remove"
              disabled={disabled}
              onClick={() => void handleRemove()}
              type="button"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="cart-line-price">
        <p>{formatMoney(item.unitPrice.amount, item.unitPrice.currency)} each</p>
        <strong>
          {item.lineSubtotal === null
            ? 'Unavailable'
            : formatMoney(item.lineSubtotal, currency)}
        </strong>
      </div>
    </article>
  )
}

function CartPage() {
  const { cart, status, error, itemCount, refreshCart, setItemQuantity, removeItem, emptyCart } =
    useCart()
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')

  async function runAction(action: () => Promise<void>) {
    if (pending) return
    setPending(true)
    setActionError('')
    try {
      await action()
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'The cart could not be updated.')
    } finally {
      setPending(false)
    }
  }

  async function update(variantId: string, quantity: number) {
    await runAction(async () => {
      await setItemQuantity(variantId, quantity)
    })
  }

  async function remove(variantId: string) {
    await runAction(async () => {
      await removeItem(variantId)
    })
  }

  async function clear() {
    await runAction(emptyCart)
  }

  return (
    <main className="cart-page">
      <SiteHeader className="site-header catalog-header" />
      <section className="cart-content" aria-labelledby="cart-title" aria-busy={status === 'loading'}>
        <p className="eyebrow">Your selections</p>
        <h1 id="cart-title">Shopping cart</h1>
        {status === 'loading' && <p className="cart-status" role="status">Loading your cart…</p>}
        {status === 'error' && !cart && (
          <div className="cart-status cart-error" role="alert">
            <p>{error || 'Your cart could not be loaded.'}</p>
            <button className="cart-text-button" disabled={pending} onClick={() => void refreshCart()} type="button">
              Try again
            </button>
          </div>
        )}
        {status === 'error' && cart && <p className="cart-error" role="alert">{error}</p>}
        {actionError && <p className="cart-error" role="alert">{actionError}</p>}

        {status !== 'loading' && cart && cart.items.length === 0 && (
          <div className="cart-empty">
            <p>Your cart is empty.</p>
            <a className="button" href="/products">Browse products</a>
          </div>
        )}

        {cart && cart.items.length > 0 && (
          <div className="cart-layout">
            <div className="cart-items">
              {cart.items.map((item) => (
                <CartLine
                  currency={cart.currency}
                  disabled={pending}
                  item={item}
                  key={`${item.id}-${item.quantity}`}
                  onRemove={remove}
                  onUpdate={update}
                />
              ))}
              <button className="cart-text-button cart-clear" disabled={pending} onClick={() => void clear()} type="button">
                Clear cart
              </button>
            </div>
            <aside className="cart-summary" aria-label="Order summary">
              <p>{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(cart.subtotal.amount, cart.subtotal.currency)}</strong>
              </div>
              <p className="cart-summary-note">Shipping and taxes are calculated at checkout.</p>
              <a className="button cart-continue" href="/products">Continue shopping</a>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}

export default CartPage
