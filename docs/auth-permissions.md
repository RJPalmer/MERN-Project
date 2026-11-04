# Authentication and Permissions Guide

This guide explains how users sign in to the current API and how the server decides which routes they can use. Authentication answers “who is making this request?” Platform roles, vendor memberships, and ownership checks answer “which resources can they access?” For endpoint payloads, see the [API reference](api-reference.md).

## Register and sign in

Registration is public and creates an active user with the platform role `customer`:

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "buyer@example.com",
  "password": "at-least-12-chars",
  "displayName": "Buyer"
}
```

Email is trimmed and converted to lowercase. Passwords must contain 12–128 characters and are stored as Argon2id hashes. A duplicate email returns `409 EMAIL_IN_USE`; invalid input returns `400 VALIDATION_ERROR`.

Login uses the same email/password fields:

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "buyer@example.com", "password": "at-least-12-chars" }
```

Registration and successful login return a JSON body containing `user` and `accessToken`. The user summary includes `id`, `email`, `displayName`, `status`, `platformRole`, and `emailVerifiedAt`. The response also sets the refresh cookie described below. Login returns `401 INVALID_CREDENTIALS` for an unknown email, incorrect password, or non-active account.

## Access tokens and refresh cookies

Protected API requests use the short-lived access token in an Authorization header:

```http
Authorization: Bearer <accessToken>
```

Access tokens expire after 15 minutes. The server verifies the signature, issuer, token type, expiry, and that the user still exists and has `status: "active"`. Missing, invalid, or expired access tokens return `401 UNAUTHENTICATED`.

Registration, login, and refresh set the `marketplace_refresh` cookie with these options:

- HTTP-only, so browser JavaScript cannot read the token.
- `SameSite=Lax` and path `/api/v1/auth`.
- Secure in production; not marked Secure in development.
- 30-day maximum age.

The refresh token is a signed token with its own secret and a unique token ID. The database stores a SHA-256 hash of that ID rather than the raw refresh token. `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each be at least 32 characters and must differ.

When an access token expires, a client can call:

```http
POST /api/v1/auth/refresh
```

The browser sends the HTTP-only cookie; the server validates it, rotates it, and returns a new `accessToken` and user summary while setting the replacement cookie. Refreshing with a missing, expired, invalid, or already-used token returns `401` (`UNAUTHENTICATED` or `INVALID_REFRESH_TOKEN`). Only one refresh-token hash is stored per user, so a new login or refresh invalidates the previously issued refresh token for that account.

The React API client sends requests with credentials included. When an authenticated API request returns `401`, it attempts one refresh and retries the original request. If refresh fails, it clears the in-memory access token and dispatches the `marketplace:auth-expired` event. Access tokens are held in client memory rather than browser local storage.

## Logout and session limits

Call `POST /api/v1/auth/logout` to invalidate the refresh token and clear the browser cookie. It returns `204 No Content`. The route does not require an access token; it uses the refresh cookie if present and clears that cookie even if it is expired or invalid.

Logout does not immediately revoke an access token that was already issued. That token can continue to authenticate until its 15-minute expiry, unless the user's account is made inactive. There is no password-reset, account suspension, email-verification, or session-management endpoint in the current API.

Because a user record stores one refresh-token hash, signing in or refreshing in one browser invalidates refresh in another browser for the same account. Access tokens previously issued to that other browser remain valid until they expire.

## User roles and vendor membership

### Platform role

`User.platformRole` is one of:

| Role | Current permission |
|---|---|
| `customer` | Standard authenticated customer routes |
| `admin` | Admin vendor and product review routes, plus routes allowed to any authenticated user |
| `support` | No additional routes currently use this role |

New registrations receive `customer`. The existing `npm run admin:promote --workspace server -- <email>` script changes a registered user's role to `admin`; it is intended for local administration and must be run against the configured database deliberately. There is no admin role-management API.

### Vendor membership

Vendor membership is a separate record joining a user to a vendor. Membership roles are `owner`, `manager`, and `fulfillment`; membership status is `active`, `invited`, or `suspended`. Vendor-protected routes require a matching **active** membership with an allowed role. A caller-supplied vendor ID is always checked against the authenticated user's membership.

The vendor creator automatically gets an active `owner` membership. The current API does not expose invitations or membership role changes. An invalid vendor ID, inaccessible vendor, suspended membership, or suspended vendor is generally hidden behind `404 VENDOR_NOT_FOUND` rather than disclosing that the vendor exists. Vendor lifecycle status is separate from membership status; for example, product submission has an additional requirement that the vendor is active and visible.

## Route permission matrix

All paths below are relative to `/api/v1`.

| Routes | Required permission |
|---|---|
| `GET /health` | Public |
| `POST /auth/register`, `POST /auth/login` | Public |
| `POST /auth/refresh`, `POST /auth/logout` | Valid refresh cookie when refreshing; logout can clear an absent/invalid cookie |
| `GET /auth/me` | Active user with a valid bearer access token |
| `GET /products`, `GET /products/:vendorSlug/:productSlug` | Public; only active published catalog entries are returned |
| `POST /vendors`, `GET /vendors/mine` | Any authenticated active user; each new vendor is owned by its creator |
| `POST /vendors/:vendorId/submit` | Active owner membership for that vendor |
| `GET/PUT /vendors/:vendorId/shipping` | Active owner or manager membership |
| `/vendors/:vendorId/products/**` | Active owner or manager membership |
| `/vendors/:vendorId/inventory/**` | Active owner or manager membership |
| `/vendors/:vendorId/orders/**` | Active owner, manager, or fulfillment membership |
| `/admin/**` | Active user with `platformRole: "admin"` |
| `/cart/**`, `/checkout/**`, `/me/addresses/**`, `/me/orders/**` | Any authenticated active user; data is limited to that user |

For vendor order shipment recording, the user must also satisfy the order-state checks: only a `processing` vendor order whose parent order has confirmed `paid` payment can be marked shipped. The current customer checkout does not create those orders.

The customer UI implements customer registration, login, cart, addresses, checkout quote review, and order reading. Vendor and admin workflows are API-only.

## Credentialed browser requests and CORS

The API allows the configured `CLIENT_URL` origin and credentials. Keep the client origin aligned with `CLIENT_URL` when developing or deploying; the client must send credentials for refresh and logout cookies to work. The API uses `SameSite=Lax`, so configure the client and API under a compatible site arrangement for production. Keep both JWT secrets private and never put them in client environment variables; only the client API base URL belongs in `client/.env`.

## Not implemented

The current API has no public account activation or email verification flow, password reset/change route, user/session administration, vendor member invitation or role management, or support-only permissions. These status and role fields exist in the data model, but should not be mistaken for fully implemented account-management workflows.
