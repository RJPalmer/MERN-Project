# Local Demo Data Guide

This guide creates a small local marketplace using the current API. There is no seed-data command yet; the steps below use one registered account as customer, vendor owner, and platform admin so the full review flow can be demonstrated without editing MongoDB directly.

## Start the local services

From the repository root, install dependencies and prepare the server environment:

```bash
npm install
cp server/.env.example server/.env
```

Set different `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values in `server/.env`; each must be at least 32 characters. Then start MongoDB and Redis:

```bash
docker compose up -d
```

Start the API in one terminal:

```bash
npm run dev --workspace server
```

Start the client in another terminal:

```bash
cp client/.env.example client/.env
npm run dev --workspace client
```

The API defaults to `http://localhost:5000/api/v1`; the storefront defaults to `http://localhost:5173`.

## Register and grant the local demo account admin access

Register an account from the storefront at `/register`, or use the API:

```bash
curl -i http://localhost:5000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"Demo-password-123","displayName":"Demo User"}'
```

The response includes `accessToken` and `user.id`; copy the token for the following requests. Registration also sets the refresh cookie. The sample password is for a disposable local environment only.

Promote the registered account to admin using the existing script:

```bash
npm run admin:promote --workspace server -- demo@example.com
```

Set a shell variable to avoid repeating the token in each request. Replace the placeholder with the access token from registration:

```bash
API=http://localhost:5000/api/v1
TOKEN='<ACCESS_TOKEN_FROM_REGISTRATION>'
```

The token can be issued before promotion: protected requests load the user's current role from MongoDB on each request.

## Create and approve a vendor

Create a vendor profile. Save the returned `vendor.id` for later requests:

```bash
curl -sS "$API/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"slug":"north-star-goods","legalName":"North Star Goods LLC","displayName":"North Star Goods","description":"Small-batch home goods","contactEmail":"demo@example.com","contactPhone":""}'
```

Set the ID from that response and submit the profile:

```bash
VENDOR_ID='<VENDOR_ID_FROM_RESPONSE>'
curl -sS -X POST "$API/vendors/$VENDOR_ID/submit" \
  -H "Authorization: Bearer $TOKEN"
```

Approve it as the demo admin:

```bash
curl -sS "$API/admin/vendors/pending" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X PATCH "$API/admin/vendors/$VENDOR_ID/review" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"active"}'
```

Configure a flat shipping rate for US addresses:

```bash
curl -sS -X PUT "$API/vendors/$VENDOR_ID/shipping" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"flatRate":{"amount":700,"currency":"USD"},"eligibleCountryCodes":["US"]}'
```

Amounts are integer currency units; `700` represents USD 7.00 in the storefront.

## Add, stock, and publish a product

Create a product with an active variant. Save `product.id` and `product.variants[0].id` from the response:

```bash
curl -sS -X POST "$API/vendors/$VENDOR_ID/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"slug":"linen-tote","title":"Linen Tote","shortDescription":"A sturdy everyday bag","description":"Made in small batches.","brand":"North Star Goods","options":[{"name":"Color","values":["Natural"]}],"variants":[{"sku":"TOTE-NATURAL","title":"Natural","optionValues":[{"name":"Color","value":"Natural"}],"pricing":{"list":{"amount":2400,"currency":"USD"}}}]}'
```

```bash
PRODUCT_ID='<PRODUCT_ID_FROM_RESPONSE>'
VARIANT_ID='<VARIANT_ID_FROM_RESPONSE>'
```

Receive demo stock before publishing:

```bash
curl -sS -X POST "$API/vendors/$VENDOR_ID/inventory/$VARIANT_ID/adjustments" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"type":"receipt","quantityDelta":25,"note":"Initial demo stock"}'
```

Submit the product and approve it:

```bash
curl -sS -X POST "$API/vendors/$VENDOR_ID/products/$PRODUCT_ID/submit" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X PATCH "$API/admin/products/$PRODUCT_ID/review" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"active"}'
```

Check the public catalog:

```bash
curl -sS "$API/products?q=linen"
curl -sS "$API/products/north-star-goods/linen-tote"
```

The product should appear in the storefront at `/products` and at `/products/north-star-goods/linen-tote`.

## Try the customer cart and quote

Add an address using the demo account:

```bash
curl -sS -X POST "$API/me/addresses" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"label":"Demo home","recipientName":"Demo User","phone":"","addressLine1":"10 Market Street","addressLine2":"","city":"Portland","region":"ME","postalCode":"04101","countryCode":"US","isDefaultShipping":true,"isDefaultBilling":true}'
```

Set the variant quantity in the cart:

```bash
curl -sS -X PUT "$API/cart/items/$VARIANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantity":2}'
```

Request the checkout preview:

```bash
curl -sS -X POST "$API/checkout/quote" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}'
```

With this data the quote should show two units, the vendor's USD 7.00 flat shipping rate, and an item subtotal of USD 48.00. It will still include `TAX_NOT_CONFIGURED` and `PAYMENTS_NOT_CONFIGURED`; `readyForPayment` remains false. Checkout does not place an order or reserve stock, so customer and vendor order lists will remain empty through the supported demo flow.

## Reset demo data

To remove all local MongoDB and Redis data, stop the containers and delete their volumes:

```bash
docker compose down --volumes
```

This permanently deletes all data stored in the local Compose volumes. Restart with `docker compose up -d` to begin again.
