# Frontend Integration API Reference

This document summarizes every HTTP endpoint exposed by the e-commerce backend so frontend clients can integrate without reading the codebase. All endpoints send and receive `application/json` unless explicitly stated. File uploads use `multipart/form-data`.

## Base URLs & Global Requirements

| Environment | Base URL | Notes |
| --- | --- | --- |
| Development | `http://localhost:4001/api` | Replace host/port as needed. |
| Production | `<PRODUCTION_HOST>/api` | Determined by deployment. |

**Standard headers**

- `Content-Type: application/json` for JSON requests.
- `Authorization: Bearer <JWT>` for protected routes.
- `Idempotency-Key: <uuid>` is recommended for writes that mutate state (orders, returns approvals, etc.). Duplicate keys return the first response with `409`.

**Error envelope**

```json
{
  "error": {
    "name": "ErrorName",          // optional
    "message": "Human readable message",
    "code": "ERROR_CODE",          // optional, typed for UI handling
    "details": { "field": "Issue" } // optional per-endpoint metadata
  }
}
```

Rate limiting is enforced per route group, with stricter limits on `/auth`, `/uploads`, and `/payments` endpoints.

---

## Authentication & Session

| Method | Path | Auth | Request Body | Response |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | Public | `{ "name", "email", "password" }` | `201 { "user": { id, name, email, roles, isActive, isVerified, createdAt, ... } }`
| POST | `/auth/login` | Public | `{ "email", "password" }` | `{ "token", "refreshToken", "user": { ...profile fields... } }`
| GET | `/auth/me` | Bearer | — | `{ "user": { id, name, email, roles, isActive, isVerified } }`
| POST | `/auth/refresh` | Public | `{ "refreshToken" }` | `{ "token", "refreshToken", "user" }` (refresh token rotation; backend stores caller IP)
| POST | `/auth/logout` | Public | `{ "refreshToken" }` | `{ "success": true }` (revokes refresh token for caller IP)
| PATCH | `/auth/profile` | Bearer | `{ "name?", "avatarUrl?" }` | `{ "user": { ...updated profile... } }`

### Password, Email & Preferences

| Method | Path | Auth | Request Body | Response |
| --- | --- | --- | --- | --- |
| POST | `/auth/password/change` | Bearer | `{ "currentPassword", "newPassword" }` | `{ "success": true }`
| POST | `/auth/password/forgot` | Public | `{ "email", "baseUrl?" }` | `{ "success": true }` (sends reset email)
| POST | `/auth/password/reset` | Public | `{ "token", "password" }` | `{ "success": true }`
| POST | `/auth/email/verify/request` | Bearer | `{ "baseUrl?" }` | `{ "success": true }` (triggers verification email)
| POST | `/auth/email/verify` | Public | `{ "token" }` | `{ "success": true }`
| POST | `/auth/email/change/request` | Bearer | `{ "newEmail", "baseUrl?" }` | `{ "success": true }`
| GET | `/auth/preferences` | Bearer | — | `{ "preferences": { "locale": "en", "notifications": { "email": true, "sms": false, "push": true } } }`
| PATCH | `/auth/preferences` | Bearer | `{ "locale?", "notifications?": { "email?", "sms?", "push?" } }` | `{ "preferences": { ...updated... } }`

---

## Customer Address Book

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/addresses` | Query: `type=shipping|billing?` | `{ "items": [Address], "total", "page", "pages" }` (defaults first)
| POST | `/addresses` | `{ "type": "shipping|billing", "line1", "line2?", "city?", "region?", "postalCode?", "country?", "phone?", "isDefault?" }` | `201 { "address": Address }`
| GET | `/addresses/{id}` | — | `{ "address": Address }`
| PUT | `/addresses/{id}` | Any mutable fields above | `{ "address": Address }`
| DELETE | `/addresses/{id}` | — | `{ "success": true }`
| POST | `/addresses/{id}/default` | — | `{ "address": Address }` (ensures single default per type)

`Address` objects contain `{ _id, user, type, name?, company?, line1, line2?, city?, region?, postalCode?, country?, phone?, isDefault, createdAt, updatedAt }`.

---

## Catalog & Discovery

### Products

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/products` | Public | Query: `q`, `category`, `brand`, `page`, `limit`, `sort?` | `{ "items": [ProductSummary], "total", "page", "pages" }` (category & brand populated with `{ _id, name, slug }`)
| GET | `/products/{id}` | Public | — | `{ "product": ProductDetail }` (includes variants, images, attributes)
| POST | `/products` | Admin | `ProductInput` (see below; `category` must be leaf) | `201 { "product": ProductDetail }`
| PUT | `/products/{id}` | Admin | Partial `ProductInput` | `{ "product": ProductDetail }`
| DELETE | `/products/{id}` | Admin | — | `{ "success": true }` when no inventory/review/order references

**ProductInput skeleton**

```json
{
  "name": "string",
  "description": "string?",
  "longDescription": "string?",
  "price": 0,
  "compareAtPrice": 0,
  "costPrice": 0,
  "currency": "USD",
  "images": [{ "url": "https://...", "alt": "string?" }],
  "attributes": { "color": "Blue" },
  "category": "<categoryId>",
  "brand": "<brandId?>",
  "vendor": "string?",
  "sku": "string?",
  "tags": ["tshirt"],
  "variants": [{
    "sku": "TSHIRT-BLU-M",
    "attributes": { "size": "M" },
    "price": 21.99,
    "compareAtPrice?": 25,
    "currency?": "USD",
    "stock": 5,
    "barcode?": "string"
  }],
  "requiresShipping": true,
  "weight": 0.5,
  "weightUnit": "kg",
  "dimensions": { "length": 30, "width": 20, "height": 2, "unit": "cm" },
  "metaTitle": "string?",
  "metaDescription": "string?"
}
```

### Categories

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/categories` | Public | Query: `q`, `parent`, `page`, `limit` | `{ "items": [Category], "total", "page", "pages" }`
| GET | `/categories/{id}` | Public | — | `{ "category": Category }`
| GET | `/categories/{id}/children` | Public | Query: pagination | `{ "items": [Category], ... }`
| POST | `/categories` | Admin | `{ "name", "slug?", "description?", "parent?" }` | `201 { "category": Category }`
| PUT | `/categories/{id}` | Admin | Same as create | `{ "category": Category }`
| POST | `/categories/{id}/reorder` | Admin | `{ "ids": [childId1, ...] }` | `{ "items": [Category] }` sorted per new order
| DELETE | `/categories/{id}` | Admin | — | `{ "success": true }` only when leaf without products

### Brands (Admin)

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/admin/brands` | Admin | Query: `q`, `page`, `limit` | `{ "items": [Brand], "total", "page", "pages" }`
| POST | `/admin/brands` | Admin | `{ "name", "slug?" }` | `201 { "brand": Brand }`
| GET | `/admin/brands/{id}` | Admin | — | `{ "brand": Brand }`
| PUT | `/admin/brands/{id}` | Admin | `{ "name?", "slug?" }` | `{ "brand": Brand }`
| DELETE | `/admin/brands/{id}` | Admin | — | `{ "success": true }` or `{ "success": false, "message": "Brand has products" }`
| GET | `/admin/brands/{id}/references` | Admin | — | `{ "products": <count> }`

### Product Reviews

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/products/{productId}/reviews` | Public | Query `page`, `limit` | `{ "items": [Review], "total", "page", "pages" }` (only approved reviews)
| POST | `/products/{productId}/reviews` | Bearer | `{ "rating": 1..5, "comment?" }` | `201 { "review": Review }` (upserts for current user; marks verified purchase when applicable)
| DELETE | `/products/{productId}/reviews/{reviewId}` | Owner/Admin | — | `{ "success": true }`
| POST | `/products/{productId}/reviews/{reviewId}/approve` | Admin | — | `{ "review": Review }`
| POST | `/products/{productId}/reviews/{reviewId}/hide` | Admin | — | `{ "review": Review }`

`Review` includes `{ _id, product, user, rating, comment?, status, isVerifiedPurchase, createdAt }`.

### Media Uploads (Admin)

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/uploads` | multipart with `file` | `201 { "url", "filename", "mimetype", "size" }` (served from `/uploads/<filename>` in dev)
| POST | `/uploads/cloudinary` | multipart `file` | `201 { "url", "publicId", "width", "height", "format", "bytes" }`
| POST | `/uploads/cloudinary/delete` | `{ "publicId" }` | `{ "result": <cloudinaryResponse> }`

---

## Cart & Checkout (Customer)

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/cart` | — | `{ "cart": Cart }` (auto-creates cart for user)
| POST | `/cart/items` | `{ "productId", "variantId?", "quantity?": 1 }` | `201 { "cart": Cart }`
| PATCH | `/cart/items/{productId}` | `{ "quantity", "variantId?" }` | `{ "cart": Cart }`
| DELETE | `/cart/items/{productId}` | Query `variantId?` | `{ "cart": Cart }`
| POST | `/cart/clear` | — | `{ "cart": Cart }` (empty items)
| POST | `/cart/coupon` | `{ "code" }` | `{ "cart": Cart }` with `couponCode`/`discount` applied when valid
| DELETE | `/cart/coupon` | — | `{ "cart": Cart }` (removes coupon)
| POST | `/cart/estimate` | `{ "shipping?": { ... }, "taxRate?": 0.08 }` | `{ "subtotal", "discount", "shipping", "tax", "total", "currency" }`

`Cart` payload contains `{ _id, user, items: [{ product, variant?, name, price, currency, quantity, image? }], subtotal, discount?, shipping?, tax?, total, currency, status, couponCode?, createdAt, updatedAt }`.

---

## Orders, Returns & Timeline

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/orders` | Bearer + `Idempotency-Key` | `{ "shippingAddress?", "billingAddress?", "shipping?", "taxRate?" }` | `201 { "order": Order }` (validates inventory, applies coupon, reserves stock, clears cart)
| GET | `/orders` | Bearer | Query `page`, `limit` | `{ "items": [OrderSummary], "total", "page", "pages" }`
| GET | `/orders/{id}` | Bearer | — | `{ "order": Order }`
| GET | `/orders/{id}/invoice` | Bearer | — | `302` redirect to `order.invoiceUrl`
| GET | `/orders/{id}/timeline` | Bearer | Query pagination | `{ "items": [TimelineEntry], "total", "page", "pages" }`
| POST | `/orders/{id}/returns` | Bearer | `{ "reason?": "Too small" }` | `201 { "return": Return }` (one pending per order; adds timeline entry)

`Order` objects include `{ _id, number, user, items: [{ product, variant?, name, price, currency, quantity }], subtotal, discount?, shipping, tax, total, currency, status, paymentStatus, shippingAddress, billingAddress, invoiceUrl?, createdAt, updatedAt }`.

`TimelineEntry` contains `{ _id, type, message, actor, createdAt, meta }`. `Return` includes `{ _id, order, user, status (pending|approved|rejected), reason?, items, amount?, createdAt }`.

---

## Payments (Stripe)

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/payments/stripe/intent` | Bearer | `{ "orderId" }` | `{ "clientSecret": "pi_..._secret_..." }` or `{ "clientSecret": null, "alreadyPaid": true }`
| POST | `/payments/stripe/webhook` | Stripe (no auth) | Raw JSON signed with webhook secret | `{ "received": true }` (handles `payment_intent.succeeded`, updates order/payment timeline)

Webhook endpoint must receive the unparsed raw payload; do not JSON.stringify when posting.

---

## Admin APIs (require `admin` role)

### User & Metrics

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/admin/users` | Query: `q`, `page`, `limit` | `{ "items": [UserSummary], "total", "page", "pages" }`
| GET | `/admin/users/{id}` | — | `{ "user": UserDetail }`
| PATCH | `/admin/users/{id}` | `{ "isActive?": true/false }` | `{ "user": UserDetail }`
| POST | `/admin/users/{id}/promote` | — | `{ "user": UserDetail }` (ensures `admin` role present)
| POST | `/admin/users/{id}/demote` | — | `{ "user": UserDetail }` (removes `admin`, defaults to `customer`)
| GET | `/admin/metrics` | — | `{ "usersTotal", "usersActive", "adminsCount", "productsCount", "ordersTotal", "ordersByStatus": { ... }, "revenueLast7Days": [{ "day", "revenue" }] }`

### Orders, Returns, Shipments

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/admin/orders` | Query: `status`, `paymentStatus`, `user`, `from`, `to`, `page`, `limit` | `{ "items": [Order], "total", "page", "pages" }`
| GET | `/admin/orders/{id}` | — | `{ "order": Order }`
| PATCH | `/admin/orders/{id}` | `{ "status?", "paymentStatus?" }` | `{ "order": Order }` (writes timeline entries)
| GET | `/admin/returns` | Query `status`, `page`, `limit` | `{ "items": [Return], "total", "page", "pages" }`
| POST | `/admin/returns/{id}/approve` | Headers: `Idempotency-Key` recommended; body `{ "items?": [{ "product", "variant?", "quantity" }], "amount?": 10.5 }` | `{ "return": Return, "order": Order, "refund?": Refund }` (restocks items, triggers Stripe refund)
| POST | `/admin/returns/{id}/reject` | — | `{ "return": Return }`
| GET | `/admin/shipments` | Query `order`, `page`, `limit` | `{ "items": [Shipment], "total", "page", "pages" }`
| POST | `/admin/orders/{id}/shipments` | `{ "carrier?", "tracking?", "service?", "items?": [{ "product", "variant?", "quantity" }] }` | `201 { "shipment": Shipment }` (copies shipping address by default, logs timeline)
| GET | `/admin/shipments/{id}` | — | `{ "shipment": Shipment }`
| GET | `/admin/orders/{id}/shipments` | Query pagination | `{ "items": [Shipment], "total", "page", "pages" }`

`Shipment` objects: `{ _id, order, carrier?, tracking?, service?, items: [{ product, variant?, quantity }], shippedAt, deliveredAt?, address, createdAt }`.

### Transactions & Refunds

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/admin/transactions` | Query `order`, `provider`, `status`, `page`, `limit` | `{ "items": [Transaction], "total", "page", "pages" }`
| GET | `/admin/transactions/{id}` | — | `{ "transaction": Transaction }`
| GET | `/admin/refunds` | Query `order`, `provider`, `status`, `page`, `limit` | `{ "items": [Refund], "total", "page", "pages" }`
| GET | `/admin/refunds/{id}` | — | `{ "refund": Refund }`

`Transaction` includes `{ _id, order, provider, status, amount, currency, reference, raw, createdAt }`. `Refund` objects mirror Stripe refunds.

### Coupons & Promotions

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/admin/coupons` | Query `q`, `page`, `limit` | `{ "items": [Coupon], "total", "page", "pages" }`
| POST | `/admin/coupons` | `{ "code", "type", "value", "minSubtotal?", "maxRedemptions?", "expiresAt?", "isActive?", "includeProducts?": [ids], "excludeProducts?": [ids], "includeCategories?": [ids], "excludeCategories?": [ids] }` | `201 { "coupon": Coupon }`
| GET | `/admin/coupons/{id}` | — | `{ "coupon": Coupon }`
| PUT | `/admin/coupons/{id}` | Same as create | `{ "coupon": Coupon }`
| DELETE | `/admin/coupons/{id}` | — | `{ "success": true }`

`Coupon` contains `{ _id, code (uppercase), type (percent|fixed), value, minSubtotal?, startsAt?, expiresAt?, isActive, usageCount, includeProducts?, excludeProducts?, includeCategories?, excludeCategories? }`.

### Inventory Management

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/admin/inventory/adjustments` | `{ "productId", "variantId?", "qtyChange": -5|5, "reason": "manual|restock|damage", "note?", "location?" }` | `201 { "adjustment": Adjustment, "product": ProductDetail, "inventory": InventorySnapshot }`
| GET | `/admin/inventory/adjustments` | Query `product`, `variant`, `reason`, `page`, `limit` | `{ "items": [Adjustment], "total", "page", "pages" }`
| GET | `/admin/inventory` | Query `product`, `variant`, `location`, `page`, `limit` | `{ "items": [InventorySnapshot], "total", "page", "pages" }`
| GET | `/admin/inventory/low` | Query `threshold`, `page`, `limit` | `{ "items": [InventorySnapshot], "total", "page", "pages", "threshold" }`

`InventorySnapshot` includes `{ product, variant?, location?, quantity, reserved, updatedAt }`. `Adjustment` records `{ _id, product, variant?, qtyChange, reason, note?, location?, user, createdAt }`.

### Product Operations Helpers

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/admin/products/import` | `{ "items": [ProductInput, ...] }` | `201 { "inserted": <count>, "failed": <count>, "errors": [ { "index", "message" } ] }`
| GET | `/admin/products/export` | Query `format=json|csv` | Streams product export (`Content-Disposition` attachment)
| POST | `/admin/products/price-bulk` | `{ "factorPercent": 10, "filter?": { "q?", "category?", "brand?" } }` | `{ "matched": <count>, "modified": <count>, "factor": 1.1 }`
| POST | `/admin/products/category-bulk` | `{ "categoryId", "productIds": ["..."] }` | `{ "matched": <count>, "modified": <count> }`
| POST | `/admin/products/variants-matrix` | `{ "options": { "color": ["Blue","Black"], "size": ["S","M","L"] }, "base?": { "skuPrefix?": "TEE" } }` | `{ "count": <combinations>, "variants": [ { "attributes": { ... }, "sku?": "TEE-BLUE-S" } ] }`
| GET | `/admin/products/{id}/references` | — | `{ "inventory", "reviews", "orders", "shipments" }`

### Reporting & Analytics

| Method | Path | Query | Response |
| --- | --- | --- | --- |
| GET | `/admin/reports/sales` | `from`, `to`, `groupBy=day|week|month` | `{ "groupBy", "series": [{ "period": "2024-01-01", "revenue": 1234.56, "orders": 25 }] }`
| GET | `/admin/reports/top-products` | `from`, `to`, `by=quantity|revenue`, `limit` | `{ "by", "items": [{ "product": "<id>", "name", "quantity", "revenue" }] }`
| GET | `/admin/reports/top-customers` | `from`, `to`, `by=revenue|orders`, `limit` | `{ "by", "items": [{ "user": "<id>", "name", "email", "orders", "revenue" }] }`

---

## Health & Diagnostics

| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/health` (no `/api`) | Public | `{ "status": "ok", "name": "<appName>" }`

---

## Object Type Reference (abridged)

- **UserSummary/UserDetail**: `{ _id, name, email, roles: ["customer", "admin"], isActive, isVerified, createdAt, updatedAt, lastLoginAt? }`
- **ProductSummary**: `{ _id, name, slug, price, compareAtPrice?, currency, images, category: { _id, name, slug }, brand?: { _id, name, slug }, rating?: { average, count }, variants?: [VariantSummary] }`
- **VariantSummary**: `{ _id, sku, attributes, price, currency, stock }`
- **Category**: `{ _id, name, slug, description?, parent?, breadcrumbs?, sortOrder?, createdAt }`
- **CartItem**: `{ product, variant?, name, price, currency, quantity, image? }`
- **Return item**: `{ product, variant?, quantity, amount? }`
- **PaymentTransaction**: `{ _id, order, provider: "stripe", status, amount, currency, reference, raw, createdAt }`

Use this reference when typing frontend API clients.

---

## Integration Tips

1. **JWT storage** – store `token` for API calls, and `refreshToken` for re-auth when `401` occurs. Refresh tokens are IP bound.
2. **Idempotent writes** – for checkout and return approvals, retry the same request with identical `Idempotency-Key` to avoid duplicate operations.
3. **Webhooks** – Stripe webhook handler expects raw body. Configure frontend to avoid intercepting or mutating the payload when testing.
4. **Pagination** – list endpoints use zero-based `page` with `limit`; responses echo `page` and `pages` for UI pagination controls.
5. **Currency & totals** – all monetary values return as decimals in primary store currency (default USD). Frontend should format using locale-aware helpers.
6. **Default addresses** – `isDefault` ensures only one default per type; when creating orders without explicit addresses, backend copies defaults automatically.
7. **Inventory truth** – rely on cart/order payloads for stock availability rather than product `stock` fields (deprecated in schema).

---

This document should be shared with frontend teams and imported into API tooling (Postman, Bruno, Hoppscotch, etc.) as the canonical contract for integration.
