import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  clearCart as clearCartRequest,
  getCart,
  removeCartItem,
  setCartItemQuantity,
  type Cart,
} from '../lib/api'
import { CartContext, type CartStatus } from './context'

type CartSnapshot = {
  userId: string
  cart: Cart | null
  status: CartStatus
  error: string
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus } = useAuth()
  const [snapshot, setSnapshot] = useState<CartSnapshot | null>(null)
  const userId = user?.id

  useEffect(() => {
    if (authStatus !== 'authenticated' || !userId) return
    let active = true

    getCart()
      .then((cart) => {
        if (active) setSnapshot({ userId, cart, status: 'ready', error: '' })
      })
      .catch((requestError: unknown) => {
        if (active) {
          setSnapshot({
            userId,
            cart: null,
            status: 'error',
            error: requestError instanceof Error ? requestError.message : 'Unable to load your cart.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [authStatus, userId])

  const ownsSnapshot = Boolean(userId && snapshot?.userId === userId)
  const cart = authStatus === 'authenticated' && ownsSnapshot ? snapshot?.cart || null : null
  const status: CartStatus =
    authStatus === 'loading'
      ? 'loading'
      : authStatus === 'anonymous'
        ? 'ready'
        : ownsSnapshot
          ? snapshot?.status || 'loading'
          : 'loading'
  const error = ownsSnapshot ? snapshot?.error || '' : ''

  async function updateCart(action: () => Promise<Cart>) {
    if (!user || authStatus !== 'authenticated') throw new Error('Sign in to update your cart.')
    try {
      const nextCart = await action()
      setSnapshot({ userId: user.id, cart: nextCart, status: 'ready', error: '' })
    } catch (requestError) {
      setSnapshot({
        userId: user.id,
        cart,
        status: 'error',
        error: requestError instanceof Error ? requestError.message : 'Unable to update your cart.',
      })
      throw requestError
    }
  }

  function refreshCart() {
    return updateCart(getCart)
  }

  function updateQuantity(variantId: string, quantity: number) {
    return updateCart(() => setCartItemQuantity(variantId, quantity))
  }

  function removeItem(variantId: string) {
    return updateCart(() => removeCartItem(variantId))
  }

  function emptyCart() {
    return updateCart(clearCartRequest)
  }

  const value = {
    cart,
    status,
    error,
    itemCount: cart?.items.reduce((total, item) => total + item.quantity, 0) || 0,
    refreshCart,
    setItemQuantity: updateQuantity,
    removeItem,
    emptyCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
