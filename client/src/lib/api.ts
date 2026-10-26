const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(
  /\/+$/,
  '',
)

export type Money = {
  amount: number
  currency: string
}

export type ProductMedia = {
  url: string
  alt: string
  type: 'image' | 'video'
  sortOrder: number
}

export type ProductVariant = {
  id: string
  title: string
  optionValues: Array<{ name: string; value: string }>
  pricing: {
    list: Money
    sale?: Money
  }
  available?: number
}

export type StorefrontProduct = {
  id: string
  slug: string
  title: string
  shortDescription: string
  description: string
  brand: string
  media: ProductMedia[]
  attributes: Array<{ key: string; label: string; value: string }>
  options: Array<{ name: string; values: string[] }>
  vendor: {
    slug: string
    displayName: string
  }
  variants: ProductVariant[]
}

export type ProductPage = {
  products: StorefrontProduct[]
  nextCursor: string | null
}

export type CartItem = {
  id: string
  variantId: string | null
  vendorId: string
  quantity: number
  addedAt?: string
  available: boolean
  issue: string | null
  product: { title: string; slug: string; media: ProductMedia[] } | null
  vendor: { slug: string; displayName: string } | null
  variant: {
    title: string
    sku: string
    optionValues: Array<{ name: string; value: string }>
  } | null
  unitPrice: Money
  lineSubtotal: number | null
}

export type Cart = {
  id: string
  currency: string
  items: CartItem[]
  subtotal: Money
  updatedAt: string
}

export type User = {
  id: string
  email: string
  displayName: string
  status: string
  platformRole: string
  emailVerifiedAt: string | null
}

export type AuthSession = {
  user: User
  accessToken: string
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  authenticated?: boolean
  retryAuthentication?: boolean
}

let accessToken: string | null = null
let refreshRequest: Promise<AuthSession> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

function parseError(body: unknown, status: number): ApiError {
  const errorBody = body as { error?: { code?: string; message?: string } } | null
  return new ApiError(
    errorBody?.error?.message || 'The request could not be completed.',
    status,
    errorBody?.error?.code || 'REQUEST_FAILED',
  )
}

async function fetchJson<T>(path: string, options: RequestOptions, token: string | null) {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      credentials: 'include',
    })
  } catch {
    throw new ApiError('Could not connect to the marketplace API.', 0, 'NETWORK_ERROR')
  }

  if (response.status === 204) return undefined as T
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw parseError(body, response.status)

  return body as T
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const tokenUsed = accessToken

  try {
    return await fetchJson<T>(path, options, tokenUsed)
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      !options.authenticated ||
      options.retryAuthentication === false
    ) {
      throw error
    }

    let refreshedToken: string
    try {
      const session =
        accessToken && accessToken !== tokenUsed ? { accessToken } : await refreshAuthSession()
      refreshedToken = session.accessToken
    } catch (refreshError) {
      setAccessToken(null)
      window.dispatchEvent(new Event('marketplace:auth-expired'))
      throw refreshError
    }

    return fetchJson<T>(path, options, refreshedToken)
  }
}

export function refreshAuthSession(): Promise<AuthSession> {
  if (!refreshRequest) {
    refreshRequest = fetchJson<AuthSession>('/auth/refresh', { method: 'POST' }, null)
      .then((session) => {
        setAccessToken(session.accessToken)
        return session
      })
      .finally(() => {
        refreshRequest = null
      })
  }
  return refreshRequest
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const session = await requestJson<AuthSession>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  setAccessToken(session.accessToken)
  return session
}

export async function register(input: {
  email: string
  password: string
  displayName: string
}): Promise<AuthSession> {
  const session = await requestJson<AuthSession>('/auth/register', {
    method: 'POST',
    body: input,
  })
  setAccessToken(session.accessToken)
  return session
}

export async function logout(): Promise<void> {
  try {
    await requestJson<void>('/auth/logout', { method: 'POST' })
  } finally {
    setAccessToken(null)
  }
}

export function getStorefrontProducts(options: {
  query?: string
  vendor?: string
  cursor?: string
  limit?: number
} = {}): Promise<ProductPage> {
  const params = new URLSearchParams()
  if (options.query) params.set('q', options.query)
  if (options.vendor) params.set('vendor', options.vendor)
  if (options.cursor) params.set('cursor', options.cursor)
  if (options.limit) params.set('limit', String(options.limit))
  const queryString = params.size > 0 ? `?${params.toString()}` : ''

  return requestJson<ProductPage>(`/products${queryString}`)
}

export async function getStorefrontProduct(
  vendorSlug: string,
  productSlug: string,
): Promise<StorefrontProduct> {
  const product = await requestJson<{ product: StorefrontProduct }>(
    `/products/${encodeURIComponent(vendorSlug)}/${encodeURIComponent(productSlug)}`,
  )
  return product.product
}

export async function getCart(): Promise<Cart> {
  const result = await requestJson<{ cart: Cart }>('/cart', { authenticated: true })
  return result.cart
}

export async function setCartItemQuantity(variantId: string, quantity: number): Promise<Cart> {
  const result = await requestJson<{ cart: Cart }>(`/cart/items/${encodeURIComponent(variantId)}`, {
    method: 'PUT',
    body: { quantity },
    authenticated: true,
  })
  return result.cart
}

export async function removeCartItem(variantId: string): Promise<Cart> {
  const result = await requestJson<{ cart: Cart }>(`/cart/items/${encodeURIComponent(variantId)}`, {
    method: 'DELETE',
    authenticated: true,
  })
  return result.cart
}

export async function clearCart(): Promise<Cart> {
  const result = await requestJson<{ cart: Cart }>('/cart', {
    method: 'DELETE',
    authenticated: true,
  })
  return result.cart
}
