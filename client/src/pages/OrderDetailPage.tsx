import { useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import { formatMoney } from '../lib/formatters'
import { getCustomerOrder, type CustomerOrderDetail, type OrderAddressSnapshot } from '../lib/api'
import { dateLabel, orderStatusLabel } from './order-formatters'
import './OrderPages.css'

function AddressBlock({ title, address }: { title: string; address: OrderAddressSnapshot }) {
  return (
    <section className="order-address-block">
      <h2>{title}</h2>
      <p>{address.recipientName}</p>
      {address.phone && <p>{address.phone}</p>}
      <p>{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}</p>
      <p>{address.city}, {address.region} {address.postalCode}</p>
      <p>{address.countryCode}</p>
    </section>
  )
}

function OrderDetailPage({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getCustomerOrder(orderNumber)
      .then((result) => { if (active) setOrder(result) })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Order details could not be loaded.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orderNumber])

  return (
    <main className="order-page">
      <SiteHeader className="site-header catalog-header" />
      <section className="order-content order-detail-content" aria-labelledby="order-detail-title" aria-busy={loading}>
        <a className="order-back" href="/orders">← All orders</a>
        {loading && <p className="order-message" role="status">Loading order details…</p>}
        {error && <p className="order-error" role="alert">{error}</p>}
        {order && (
          <>
            <div className="order-detail-heading">
              <div>
                <p className="eyebrow">Order details</p>
                <h1 id="order-detail-title">{order.orderNumber}</h1>
                <p className="order-detail-date">Placed {dateLabel(order.placedAt || order.createdAt, true)}</p>
              </div>
              <span className={`order-status order-status-${order.status}`}>{orderStatusLabel(order.status)}</span>
            </div>

            <div className="order-detail-layout">
              <div className="order-detail-main">
                <section className="order-panel" aria-labelledby="fulfillment-title">
                  <h2 id="fulfillment-title">Vendor fulfillment</h2>
                  {order.vendorOrders.map((vendorOrder) => (
                    <article className="vendor-order" key={vendorOrder.id || vendorOrder.vendorOrderNumber}>
                      <div className="vendor-order-heading">
                        <div>
                          <h3>{vendorOrder.vendorOrderNumber}</h3>
                          <p>Shipment from vendor</p>
                        </div>
                        <span className={`order-status order-status-${vendorOrder.status}`}>{orderStatusLabel(vendorOrder.status)}</span>
                      </div>
                      {vendorOrder.items.map((item) => (
                        <div className="order-item" key={`${item.variantId}-${item.sku}`}>
                          <div className="order-item-image">
                            {item.image ? <img alt="" loading="lazy" src={item.image} /> : <span aria-hidden="true">No image</span>}
                          </div>
                          <div className="order-item-info">
                            <strong>{item.title}</strong>
                            <span>SKU {item.sku} · Qty {item.quantity}</span>
                            {item.optionValues.length > 0 && <span>{item.optionValues.map((option) => `${option.name}: ${option.value}`).join(' · ')}</span>}
                          </div>
                          <strong>{formatMoney(item.lineTotal.amount, item.lineTotal.currency)}</strong>
                        </div>
                      ))}
                      <div className="vendor-shipping">
                        <strong>Shipping</strong>
                        <span>{formatMoney(vendorOrder.shipping.cost.amount, vendorOrder.shipping.cost.currency)}</span>
                      </div>
                      {vendorOrder.shipping.tracking.length > 0 && (
                        <div className="tracking-list">
                          <h4>Tracking</h4>
                          {vendorOrder.shipping.tracking.map((tracking, index) => (
                            <p key={`${tracking.number}-${index}`}>
                              {tracking.carrier || 'Carrier'}{tracking.number ? ` · ${tracking.number}` : ''}
                              {tracking.url && <> · <a href={tracking.url} rel="noreferrer" target="_blank">Track package</a></>}
                              {tracking.shippedAt && <small> Shipped {dateLabel(tracking.shippedAt, true)}</small>}
                            </p>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </section>
                <div className="order-address-grid">
                  <AddressBlock address={order.shippingAddress} title="Shipping address" />
                  <AddressBlock address={order.billingAddress} title="Billing address" />
                </div>
              </div>

              <aside className="order-panel order-totals" aria-label="Order totals">
                <h2>Order summary</h2>
                <div><span>Payment status</span><strong>{orderStatusLabel(order.paymentStatus)}</strong></div>
                <div><span>Subtotal</span><strong>{formatMoney(order.totals.subtotal.amount, order.totals.subtotal.currency)}</strong></div>
                <div><span>Discount</span><strong>{formatMoney(order.totals.discount.amount, order.totals.discount.currency)}</strong></div>
                <div><span>Shipping</span><strong>{formatMoney(order.totals.shipping.amount, order.totals.shipping.currency)}</strong></div>
                <div><span>Tax</span><strong>{formatMoney(order.totals.tax.amount, order.totals.tax.currency)}</strong></div>
                <div className="order-grand-total"><span>Total</span><strong>{formatMoney(order.totals.grandTotal.amount, order.totals.grandTotal.currency)}</strong></div>
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

export default OrderDetailPage
