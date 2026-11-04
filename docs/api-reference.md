# API Reference

This reference covers the Express API currently mounted by the application. It is based on the implemented routes and schemas; it does not describe planned payment, order placement, or B2B endpoints.

## Basics

- Base path: `/api/v1`
- Content type: JSON for request and response bodies unless a route returns `204 No Content`.
- Authentication: send `Authorization: Bearer <accessToken>` for protected routes.
- Money: `{ "amount": 1299, "currency": "USD" }`; `amount` is an integer in the currency's smallest unit (for example, cents for USD).
- IDs: MongoDB ObjectId strings unless a route uses a slug or order number.
- Error envelope: `{ "error": { "code": "...", "message": "...", "details": [...] } }`. Validation details are included where the route schema supplies them. In production, unhandled server errors use a generic message.

The API uses the `CLIENT_URL` setting for credentialed CORS. The health endpoint returns `200` when MongoDB and Redis are connected and `503` with `status: "degraded"` otherwise.

## Health and authentication

| Method and path | Auth | Behavior |
|---|---|---|
| `GET /health` | No | API uptime, timestamp, and MongoDB/Redis connection status |
| `POST /auth/register` | No | Creates an active customer and returns a session (`201`) |
| `POST /auth/login` | No | Returns a session |
| `POST /auth/refresh` | Refresh cookie | Rotates the refresh token and returns a new access token |
| `POST /auth/logout` | Refresh cookie | Revokes the refresh token and clears the cookie (`204`) |
| `GET /auth/me` | Bearer | Returns the authenticated user |

Registration body:

```json
{ "email": "buyer@example.com", "password": "at-least-12-chars", "displayName": "Buyer" }
```

Email is trimmed and lowercased. Password length must be 12–128 characters. Registration returns `{ "user": ..., "accessToken": "..." }` and sets the HTTP-only `marketplace_refresh` cookie (30 day lifetime, `/api/v1/auth` path, `SameSite=Lax`; `Secure` in production). Access tokens last 15 minutes. The refresh endpoint requires the cookie; refresh tokens rotate on use.

Login body:

```json
{ "email": "buyer@example.com", "password": "at-least-12-chars" }
```

Duplicate email returns `409 EMAIL_IN_USE`. Invalid credentials return `401 INVALID_CREDENTIALS`. Missing/invalid bearer access tokens return `401 UNAUTHENTICATED`. The user object includes `id`, `email`, `displayName`, `status`, `platformRole`, and `emailVerifiedAt`.

## Storefront catalog

| Method and path | Auth | Behavior |
|---|---|---|
| `GET /products` | No | Lists active products from active, visible vendors |
| `GET /products/:vendorSlug/:productSlug` | No | Returns one published product and its active variants |

List query parameters: `q` (up to 100 characters; searches title, brand, short description), `vendor` (vendor slug), `limit` (default 20, clamped to 1–50), and `cursor` (last product ObjectId). Response: `{ "products": [...], "nextCursor": "..." | null }`. Product results include vendor slug/name, media, options, variant pricing, and available stock. An invalid slug or missing/unpublished product returns `404 PRODUCT_NOT_FOUND`.

## Vendor and catalog management

All routes in this section require a bearer token and active membership in the vendor. Vendor roles are `owner`, `manager`, and `fulfillment`; owner/manager can manage catalog and inventory, while owner/manager/fulfillment can access vendor orders. Some actions require the owner specifically.

| Method and path | Permission | Behavior |
|---|---|---|
| `POST /vendors` | Any signed-in user | Creates a vendor in `draft`; creator becomes owner (`201`) |
| `GET /vendors/mine` | Any signed-in user | Lists the caller's active vendor memberships |
| `POST /vendors/:vendorId/submit` | Owner | Submits a draft or rejected vendor for review |
| `GET /vendors/:vendorId/shipping` | Owner/manager | Reads the flat-rate shipping settings |
| `PUT /vendors/:vendorId/shipping` | Owner/manager | Replaces flat-rate settings |
| `POST /vendors/:vendorId/products` | Owner/manager | Creates a draft product with one or more variants (`201`) |
| `GET /vendors/:vendorId/products` | Owner/manager | Lists the vendor's products and variants |
| `POST /vendors/:vendorId/products/:productId/submit` | Owner/manager | Submits a draft or rejected product for review |
| `GET /vendors/:vendorId/inventory` | Owner/manager | Lists inventory records |
| `GET /vendors/:vendorId/inventory/:variantId/movements` | Owner/manager | Lists recent movements (`limit` defaults to 50, capped at 100) |
| `POST /vendors/:vendorId/inventory/:variantId/adjustments` | Owner/manager | Adds received stock or adjusts stock (`201`) |

Create vendor body:

```json
{
  "slug": "north-star-goods",
  "legalName": "North Star Goods LLC",
  "displayName": "North Star Goods",
  "description": "Small-batch home goods",
  "contactEmail": "maker@example.com",
  "contactPhone": ""
}
```

Shipping body:

```json
{ "flatRate": { "amount": 700, "currency": "USD" }, "eligibleCountryCodes": ["US"] }
```

Product creation body (optional text/media/attributes/options fields may be omitted; at least one variant is required):

```json
{
  "slug": "linen-tote",
  "title": "Linen Tote",
  "shortDescription": "A sturdy everyday bag",
  "description": "Made in small batches.",
  "brand": "North Star Goods",
  "media": [],
  "attributes": [],
  "options": [{ "name": "Color", "values": ["Natural"] }],
  "variants": [{
    "sku": "TOTE-NATURAL",
    "title": "Natural",
    "optionValues": [{ "name": "Color", "value": "Natural" }],
    "pricing": { "list": { "amount": 2400, "currency": "USD" } }
  }]
}
```

Variant stock starts at zero; use an inventory adjustment to receive stock. Product and variant prices must use integer amounts. A sale price, if supplied, must use the same currency as list price and cannot exceed it.

Inventory adjustment body:

```json
{ "type": "receipt", "quantityDelta": 25, "note": "Initial demo stock" }
```

`receipt` requires a positive delta. `adjustment` accepts a nonzero positive or negative delta, but cannot make available stock negative. Product and vendor slugs are lowercase words separated by single hyphens.

## Administration

All admin routes require bearer authentication and `platformRole: "admin"`.

| Method and path | Behavior |
|---|---|
| `GET /admin/vendors/pending?limit=50` | Lists pending vendors; limit defaults to 50 and is capped at 100 |
| `PATCH /admin/vendors/:vendorId/review` | Approves or rejects a pending vendor |
| `GET /admin/products/pending?limit=50` | Lists pending products; limit defaults to 50 and is capped at 100 |
| `PATCH /admin/products/:productId/review` | Approves or rejects a pending product |

Approval body: `{ "status": "active" }`. Rejection body: `{ "status": "rejected", "reason": "Please add a product image." }`. A product can be approved only after its vendor is active and visible and it has an active variant. Non-admin users receive `403 FORBIDDEN`.

## Cart and checkout quote

| Method and path | Auth | Behavior |
|---|---|---|
| `GET /cart` | Bearer | Returns the caller's cart, creating an empty cart if needed |
| `PUT /cart/items/:variantId` | Bearer | Sets the variant quantity (`1`–`9999`) |
| `DELETE /cart/items/:variantId` | Bearer | Removes a variant |
| `DELETE /cart` | Bearer | Clears the cart |
| `POST /checkout/quote` | Bearer | Builds a merchandise and flat-rate shipping preview |

Set quantity body: `{ "quantity": 2 }`. A cart can contain only one currency. Cart lines report current purchasability and stock issues; cart totals use current sale price when present.

Quote body: `{ "addressId": "<customer-address-id>" }`; omit `addressId` to use the customer's default shipping address. The result contains `quote.type: "merchandise_preview"`, vendor-grouped items and subtotals, shipping when configured/eligible, blockers, `readyForPayment`, and total fields. Current blockers always include `TAX_NOT_CONFIGURED` and `PAYMENTS_NOT_CONFIGURED`; unavailable items, missing address, or missing/ineligible vendor shipping may add blockers. This endpoint does not reserve inventory, create an order, or accept payment.

## Customer addresses and orders

All routes require bearer authentication and operate only on the caller's records.

| Method and path | Behavior |
|---|---|
| `GET /me/addresses` | Lists saved addresses |
| `POST /me/addresses` | Creates an address (`201`); first address becomes default for shipping and billing |
| `PUT /me/addresses/:addressId` | Replaces address fields |
| `DELETE /me/addresses/:addressId` | Deletes an address; if it was default, the earliest remaining address becomes default |
| `GET /me/orders` | Lists existing customer orders |
| `GET /me/orders/:orderNumber` | Returns one existing customer order and vendor order details |

Address body:

```json
{
  "label": "Home",
  "recipientName": "Alex Buyer",
  "phone": "",
  "addressLine1": "10 Market Street",
  "addressLine2": "",
  "city": "Portland",
  "region": "ME",
  "postalCode": "04101",
  "countryCode": "US",
  "isDefaultShipping": true,
  "isDefaultBilling": true
}
```

Order list query: `limit` (default 20, range 1–100), `cursor` (opaque base64url cursor from the previous response), and optional `status`. Response: `{ "orders": [...], "nextCursor": "..." | null }`. Customer order statuses are `pending_payment`, `paid`, `partially_fulfilled`, `fulfilled`, `cancelled`, and `refunded`. This API currently has no order-creation route, so order history is empty unless records were created outside the implemented checkout flow.

## Vendor orders

Routes require bearer authentication and active vendor membership in owner, manager, or fulfillment role.

| Method and path | Behavior |
|---|---|
| `GET /vendors/:vendorId/orders` | Lists vendor orders; supports `limit`, `cursor`, and `status` filters |
| `GET /vendors/:vendorId/orders/:vendorOrderNumber` | Returns one vendor order |
| `POST /vendors/:vendorId/orders/:vendorOrderNumber/shipments` | Records tracking and marks a paid processing order shipped |

Shipment body: `{ "carrier": "Parcel Post", "number": "TRACK123", "url": "https://tracking.example/TRACK123" }`; `url` may be omitted or empty. Vendor order statuses are `awaiting_payment`, `processing`, `partially_shipped`, `shipped`, `delivered`, `cancelled`, and `returned`. Shipment creation is currently usable only for an order already in `processing` with parent payment status `paid`; the current checkout flow does not create such orders.

## Common error codes

| HTTP status | Example codes | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR`, `INVALID_QUANTITY` | Request data is invalid |
| `401` | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN` | Authentication is missing or invalid |
| `403` | `FORBIDDEN` | Authenticated user lacks platform admin permission |
| `404` | `PRODUCT_NOT_FOUND`, `ADDRESS_NOT_FOUND`, `ORDER_NOT_FOUND` | Resource is missing or not visible to caller |
| `409` | `EMAIL_IN_USE`, `INSUFFICIENT_STOCK`, `VENDOR_NOT_PENDING`, `CURRENCY_MISMATCH` | Conflict with current resource state |
| `503` | Health response `status: "degraded"` | MongoDB or Redis is disconnected |

There is no OpenAPI document yet. The Zod schemas under `server/src/modules/` remain the definitive request validation rules.
