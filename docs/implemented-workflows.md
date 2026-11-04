# Implemented Workflows and Statuses

This guide describes behavior implemented in the current API and customer storefront. It separates working flows from model fields and architecture plans that are not yet connected to an API route. See the [API reference](api-reference.md) for request formats and [local demo guide](demo-data.md) for a runnable example.

## Customer discovery and cart

1. Public catalog requests return products only when the product is `active`, its vendor is `active` and visible, and it has active variants.
2. A signed-in customer sets a quantity for a variant in their cart. The cart stores the variant, vendor, and quantity; prices and availability are calculated from current catalog and inventory data when the cart is read.
3. Cart lines can be non-purchasable if their product/vendor is no longer active or if current available inventory is below the requested quantity. The response includes an `issue` for those cases.
4. Cart contents are scoped to one customer and one currency. Adding an item in a different currency returns `409 CURRENCY_MISMATCH`. Quantity changes use optimistic concurrency; a conflicting update returns `409 CART_CHANGED` and the client should reload.

The cart is not an order and does not hold inventory. Prices and stock may change between cart reads and later quote requests.

## Vendor onboarding and catalog review

### Vendor status

| Current status | Implemented transition | Effect |
|---|---|---|
| `draft` | Owner submits for review → `pending_review` | Vendor enters admin queue |
| `pending_review` | Admin approves → `active` | Vendor becomes visible and can publish products |
| `pending_review` | Admin rejects → `rejected` | Rejection reason and review history are recorded |
| `rejected` | Owner resubmits → `pending_review` | Review fields are reset and submission is recorded |
| `active` | No suspension route currently exists | Status remains active through the exposed API |

Vendor creation also creates an active `owner` membership for the creator. `manager` and `fulfillment` roles exist in the membership model, but there is no API route to invite or manage additional members. The `suspended` status is modeled and excluded from membership access, but no admin status-change route is implemented.

### Product status

| Current status | Implemented transition | Effect |
|---|---|---|
| `draft` | Vendor owner/manager submits → `pending_review` | Product enters admin queue |
| `pending_review` | Admin approves → `active` | Product receives `publishedAt` and can appear publicly if its vendor is active/visible |
| `pending_review` | Admin rejects → `rejected` | Rejection reason and review history are recorded |
| `rejected` | Vendor owner/manager resubmits → `pending_review` | Review fields are reset and submission is recorded |

Admin approval requires an active, visible vendor and at least one active variant. Product creation creates variants, but stock is initialized separately through inventory adjustment. `archived` is a model enum value; there is no archive endpoint in the current API.

## Inventory adjustments and holds

Inventory is represented by `onHand`, `reserved`, and `available` quantities, with a movement ledger. The vendor inventory endpoint supports receipts and manual adjustments:

- A `receipt` must add a positive quantity.
- An `adjustment` must be nonzero. A negative adjustment cannot reduce available stock below zero.
- Each accepted change updates the inventory item, the variant's available/reserved display values, and records a movement.

Checkout quote generation reads inventory and reports `available` and `inStock`; it does not reserve stock. The hold service and expiry worker exist in the codebase: holds can be `active`, `consumed`, `released`, or `expired`, and the worker releases expired active holds. However, the current quote route does not call the hold service, and there is no public endpoint to create, release, or consume holds. Treat hold lifecycle as implemented backend support that is not yet wired into customer checkout.

## Shipping settings and quote preview

Vendor shipping settings currently support one flat rate and a list of eligible two-letter country codes. During quote preview, the API groups cart items by vendor and adds each vendor's flat rate when:

- A saved shipping address is selected or a default shipping address exists.
- The vendor has a configured rate.
- The destination country is eligible.
- The rate currency matches the cart currency.

Otherwise the quote includes a blocker such as `SHIPPING_ADDRESS_REQUIRED`, `VENDOR_SHIPPING_NOT_CONFIGURED`, `SHIPPING_DESTINATION_UNAVAILABLE`, or `SHIPPING_CURRENCY_MISMATCH`. The quote also always includes `TAX_NOT_CONFIGURED` and `PAYMENTS_NOT_CONFIGURED`. It returns `readyForPayment: false`, with null tax and total fields. It does not create an order, charge payment, or reserve stock.

## Order and fulfillment status fields

The order models define customer order statuses (`pending_payment`, `paid`, `partially_fulfilled`, `fulfilled`, `cancelled`, `refunded`) and payment statuses (`pending`, `authorized`, `paid`, `partially_refunded`, `refunded`, `failed`). Vendor orders define `awaiting_payment`, `processing`, `partially_shipped`, `shipped`, `delivered`, `cancelled`, and `returned`.

These values describe the planned order lifecycle, but the current application has no customer order creation or payment/webhook route. As a result, the regular customer checkout flow cannot create records for order history. The order read routes can return records created through other means, and the shipment route requires a vendor order already in `processing` plus a parent order with `paymentStatus: "paid"`.

When those preconditions are met, recording a shipment stores carrier/tracking details and marks that vendor order `shipped`. The parent order becomes `partially_fulfilled` if only some vendor orders are shipped, and `fulfilled` when all sibling vendor orders are `shipped` or `delivered`. There are no current endpoints to mark delivery, cancellation, refund, or payment state.

## Authentication and access boundaries

- New registrations create active users with `platformRole: "customer"`.
- Admin routes check `platformRole: "admin"`.
- Vendor routes check an active vendor membership and the required vendor role.
- Customer cart, address, and order routes filter data by the authenticated user.
- Access tokens use bearer authorization; refresh tokens are stored in an HTTP-only cookie and rotate on refresh.

The account model includes `active`, `suspended`, and `invited` user statuses. Login and bearer authentication reject non-active accounts. The current API does not expose user suspension, invitations, password resets, or email verification flows.

## Planned behavior not yet implemented

The architecture document includes a broader B2B/B2C design. The following are not part of the current API: payment intents and webhooks, order placement from checkout, reservation of inventory from checkout, tax calculation, refunds and returns, company accounts and purchase approvals, quotes/RFQs, discounts/promotions, reviews, notifications, vendor member management, and delivery status updates. These should be treated as roadmap items until their routes and service logic are added.
