import type { OrderStatus } from '../lib/api'

export const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_fulfilled', label: 'Partially fulfilled' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
]

export function orderStatusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label ||
    status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function dateLabel(value: string | null, withTime = false) {
  if (!value) return 'Not placed yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return withTime ? date.toLocaleString() : date.toLocaleDateString()
}
