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

async function getJson<T>(path: string): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
  } catch {
    throw new ApiError('Could not connect to the marketplace API.', 0, 'NETWORK_ERROR')
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const errorBody = body as { error?: { code?: string; message?: string } } | null
    throw new ApiError(
      errorBody?.error?.message || 'The request could not be completed.',
      response.status,
      errorBody?.error?.code || 'REQUEST_FAILED',
    )
  }

  return body as T
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

  return getJson<ProductPage>(`/products${queryString}`)
}

export async function getStorefrontProduct(
  vendorSlug: string,
  productSlug: string,
): Promise<StorefrontProduct> {
  const product = await getJson<{ product: StorefrontProduct }>(
    `/products/${encodeURIComponent(vendorSlug)}/${encodeURIComponent(productSlug)}`,
  )
  return product.product
}
