const mongoose = require('mongoose');
const Order = require('../../models/Order');
const VendorOrder = require('../../models/VendorOrder');
const { nextCursor, pageQuery } = require('./order.pagination');

class OrderError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function customerOrderSummary(order) {
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    totals: order.totals,
    placedAt: order.placedAt,
    createdAt: order.createdAt,
    vendorOrders: (order.vendorOrderIds || []).map((vendorOrder) => ({
      id: vendorOrder._id,
      vendorOrderNumber: vendorOrder.vendorOrderNumber,
      status: vendorOrder.status,
      totals: vendorOrder.totals,
    })),
  };
}

function customerOrderDetail(order) {
  return {
    ...customerOrderSummary(order),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    vendorOrders: (order.vendorOrderIds || []).map((vendorOrder) => ({
      id: vendorOrder._id,
      vendorOrderNumber: vendorOrder.vendorOrderNumber,
      status: vendorOrder.status,
      items: vendorOrder.items,
      shipping: vendorOrder.shipping,
      totals: vendorOrder.totals,
    })),
  };
}

async function listCustomerOrders(customerId, { limit, cursor, status }) {
  const filter = { customerId, ...pageQuery(cursor) };
  if (status) filter.status = status;
  const records = await Order.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate({ path: 'vendorOrderIds', select: 'vendorOrderNumber status totals' })
    .lean();
  const hasMore = records.length > limit;
  const page = hasMore ? records.slice(0, limit) : records;
  return {
    orders: page.map(customerOrderSummary),
    nextCursor: hasMore ? nextCursor(page[page.length - 1]) : null,
  };
}

async function getCustomerOrder(customerId, orderNumber) {
  const order = await Order.findOne({ customerId, orderNumber })
    .populate({ path: 'vendorOrderIds' })
    .lean();
  if (!order) throw new OrderError(404, 'ORDER_NOT_FOUND', 'Order not found');
  return customerOrderDetail(order);
}

async function listVendorOrders(vendorId, { limit, cursor, status }) {
  const filter = { vendorId, ...pageQuery(cursor) };
  if (status) filter.status = status;
  const records = await VendorOrder.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = records.length > limit;
  const orders = hasMore ? records.slice(0, limit) : records;
  return { orders, nextCursor: hasMore ? nextCursor(orders[orders.length - 1]) : null };
}

async function getVendorOrder(vendorId, vendorOrderNumber) {
  const order = await VendorOrder.findOne({ vendorId, vendorOrderNumber }).lean();
  if (!order) throw new OrderError(404, 'VENDOR_ORDER_NOT_FOUND', 'Vendor order not found');
  return order;
}

async function recordShipment(vendorId, vendorOrderNumber, tracking) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const vendorOrder = await VendorOrder.findOne({ vendorId, vendorOrderNumber }).session(
        session,
      );
      if (!vendorOrder)
        throw new OrderError(404, 'VENDOR_ORDER_NOT_FOUND', 'Vendor order not found');
      if (vendorOrder.status !== 'processing') {
        throw new OrderError(
          409,
          'ORDER_NOT_READY_TO_SHIP',
          'Only paid orders in processing can be shipped',
        );
      }

      const parentOrder = await Order.findById(vendorOrder.parentOrderId).session(session);
      if (!parentOrder || parentOrder.paymentStatus !== 'paid') {
        throw new OrderError(
          409,
          'PAYMENT_NOT_CONFIRMED',
          'Order payment must be confirmed before shipment',
        );
      }

      const shippedAt = new Date();
      vendorOrder.status = 'shipped';
      vendorOrder.fulfillment.shippedAt = shippedAt;
      vendorOrder.shipping.tracking.push({ ...tracking, shippedAt });
      await vendorOrder.save({ session });

      const siblingOrders = await VendorOrder.find({ parentOrderId: parentOrder._id }).session(
        session,
      );
      const allShipped =
        siblingOrders.length > 0 &&
        siblingOrders.every((item) => ['shipped', 'delivered'].includes(item.status));
      const anyShipped = siblingOrders.some((item) =>
        ['shipped', 'delivered'].includes(item.status),
      );
      if (anyShipped && ['paid', 'partially_fulfilled'].includes(parentOrder.status)) {
        parentOrder.status = allShipped ? 'fulfilled' : 'partially_fulfilled';
        await parentOrder.save({ session });
      }
      result = vendorOrder;
    });
  } finally {
    await session.endSession();
  }
  return result;
}

module.exports = {
  OrderError,
  getCustomerOrder,
  getVendorOrder,
  listCustomerOrders,
  listVendorOrders,
  recordShipment,
};
