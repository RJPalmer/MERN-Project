import { useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import { formatMoney } from '../lib/formatters'
import {
  getCustomerOrders,
  type CustomerOrderSummary,
  type OrderStatus,
} from '../lib/api'
import { dateLabel, orderStatusLabel, statusOptions } from './order-formatters'
import './OrderPages.css'

function OrderCard({ order }: { order: CustomerOrderSummary }) {
  const date = order.placedAt || order.createdAt
  return (
    <a className="order-card" href={`/orders/${encodeURIComponent(order.orderNumber)}`}>
      <div className="order-card-top">
        <div>
          <p className="order-card-number">Order {order.orderNumber}</p>
          <p className="order-card-date">{dateLabel(date)}</p>
        </div>
        <span className={`order-status order-status-${order.status}`}>{orderStatusLabel(order.status)}</span>
      </div>
      <div className="order-card-bottom">
        <span>{order.vendorOrders.length} {order.vendorOrders.length === 1 ? 'vendor' : 'vendors'}</span>
        <strong>{formatMoney(order.totals.grandTotal.amount, order.totals.grandTotal.currency)}</strong>
      </div>
    </a>
  )
}

function OrderHistoryPage() {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([])
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getCustomerOrders({ status: statusFilter || undefined })
      .then((page) => {
        if (!active) return
        setOrders(page.orders)
        setNextCursor(page.nextCursor)
        setError('')
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Your orders could not be loaded.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [statusFilter])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setError('')
    try {
      const page = await getCustomerOrders({ status: statusFilter || undefined, cursor: nextCursor })
      setOrders((current) => [...current, ...page.orders])
      setNextCursor(page.nextCursor)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'More orders could not be loaded.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <main className="order-page">
      <SiteHeader className="site-header catalog-header" />
      <section className="order-content" aria-labelledby="orders-title" aria-busy={loading}>
        <p className="eyebrow">Your account</p>
        <div className="order-heading-row">
          <div>
            <h1 id="orders-title">Your orders</h1>
            <p className="order-intro">Review past purchases and follow each vendor’s fulfillment.</p>
          </div>
          <label className="order-filter">
            <span>Filter by status</span>
            <select
              onChange={(event) => {
                setLoading(true)
                setStatusFilter(event.target.value as OrderStatus | '')
              }}
              value={statusFilter}
            >
              <option value="">All orders</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="order-error" role="alert">{error}</p>}
        {loading && <p className="order-message" role="status">Loading your orders…</p>}
        {!loading && !error && orders.length === 0 && (
          <div className="orders-empty">
            <p>No orders found{statusFilter ? ` with status “${orderStatusLabel(statusFilter)}”` : ' yet'}.</p>
            <a className="button" href="/products">Explore products</a>
          </div>
        )}

        <div className="order-list">
          {orders.map((order) => <OrderCard key={order.id || order.orderNumber} order={order} />)}
        </div>

        {!loading && nextCursor && (
          <button className="button order-load-more" disabled={loadingMore} onClick={() => void loadMore()} type="button">
            {loadingMore ? 'Loading…' : 'Load more orders'}
          </button>
        )}
      </section>
    </main>
  )
}

export default OrderHistoryPage
