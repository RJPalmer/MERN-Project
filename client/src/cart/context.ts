import { createContext } from 'react'
import type { Cart } from '../lib/api'

export type CartStatus = 'loading' | 'ready' | 'error'

export type CartContextValue = {
  cart: Cart | null
  status: CartStatus
  error: string
  itemCount: number
  refreshCart: () => Promise<void>
  setItemQuantity: (variantId: string, quantity: number) => Promise<void>
  removeItem: (variantId: string) => Promise<void>
  emptyCart: () => Promise<void>
}

export const CartContext = createContext<CartContextValue | null>(null)
