# E-commerce API Reference

This document is the canonical, implementation-backed summary of the HTTP API exposed by the e-commerce backend. Every section lists the **highest priority workflows first** so onboarding teams can focus on the endpoints that unblock real users.

- **Base URL**: `http://localhost:4001` in development (set `PORT` in `.env`).
- **Prefix**: All business endpoints live under `/api` unless explicitly called out.
- **Content Type**: Send and expect `application/json`.
- **Authentication**: Supply a Bearer token (`Authorization: Bearer <JWT>`) for any protected route.
- **Idempotency**: Write operations accept `Idempotency-Key` headers. Reusing a key returns the very first response.
- **Errors**: The backend wraps errors consistently:

```json
{
  "error": {
    "name": "HttpError",
    "message": "Human readable message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

Common error codes include: `INVALID_CREDENTIALS`, `EMAIL_IN_USE`, `PRODUCT_NOT_FOUND`, `INSUFFICIENT_STOCK`, `CART_EMPTY`, `ORDER_NOT_FOUND`, `FORBIDDEN`, `TOKEN_EXPIRED`.

---

## 1. Authentication & Account Lifecycle

| Method | Path | Purpose / Priority | Request Payload | Success Response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Create the very first customer/admin. First registered user becomes **admin** automatically. | `{ "name", "email", "password" }` | `201 { "user": { id, name, email, roles, isActive, isVerified, createdAt } }`
| `POST` | `/api/auth/login` | Login customer/admin. Returns tokens used everywhere else. | `{ "email", "password" }` | `{ "token", "refreshToken", "user": { ...profile } }`
| `GET` | `/api/auth/me` | Validate session & fetch profile (used on app refresh). | — | `{ "user": { id, name, email, roles, isActive, isVerified } }`
| `POST` | `/api/auth/logout` | Invalidate refresh token for current device. | `{ "refreshToken" }` | `{ "success": true }`
| `POST` | `/api/auth/refresh` | Rotate JWT/refresh token pair. | `{ "refreshToken" }` | `{ "token", "refreshToken", "user" }`
| `POST` | `/api/auth/password/forgot` | Triggers password reset email. | `{ "email", "baseUrl?" }` | `{ "success": true }`
| `POST` | `/api/auth/password/reset` | Resets password with emailed token. | `{ "token", "password" }` | `{ "success": true }`

**Profile & preferences**

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `PATCH` | `/api/auth/profile` | `{ "name?", "avatarUrl?" }` | `{ "user": { ...updated fields... } }`
| `GET` | `/api/auth/preferences` | — | `{ "preferences": { locale, notifications } }`
| `PATCH` | `/api/auth/preferences` | `{ "locale?", "notifications?": { "email?", "sms?", "push?" } }` | `{ "preferences": { ... } }`

---

## 2. Catalog Discovery (public)

These endpoints drive the storefront landing, search, and product detail experiences.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/products` | Query: `q`, `category`, `brand`, `page`, `limit`, `sort` | `{ "items": [ProductSummary], "total", "page", "pages" }`
| `GET` | `/api/products/:id` | — | `{ "product": ProductDetail }`
| `GET` | `/api/categories` | Query: `parent?`, `page?`, `limit?` | `{ "items": [Category], "total" }` *(soft-deleted categories are excluded)*
| `GET` | `/api/categories/:id` | — | `{ "category": Category }`
| `GET` | `/api/products/:id/reviews` | Query: `page`, `limit` | `{ "items": [Review], "total", "page", "pages" }`
| `POST` | `/api/products/:id/reviews` | Auth required; `{ "rating": 1-5, "title?", "body?" }` | `201 { "review": Review }`
| `DELETE` | `/api/products/:id/reviews/:reviewId` | Auth; owner or admin | `{ "success": true }`

**Product payloads**

`ProductSummary` → `{ _id, name, slug, price, compareAtPrice?, currency, images, category: { _id, name, slug }, brand?: { _id, name, slug }, vendor?, tags?, rating?: { average, count } }`

`ProductDetail` → `ProductSummary` + `{ description?, longDescription?, costPrice?, taxClass?, weight?, weightUnit, dimensions?: { length?, width?, height?, unit }, attributes, tags?, metaTitle?, metaDescription?, metaKeywords?, variants: [Variant], inventory: { quantity, reserved } }`

`Variant` → `{ _id, sku, attributes, price, currency, image?, createdAt, updatedAt }`

---

## 3. Customer Cart & Checkout

Once authenticated, customers manipulate their cart and create orders. These are the mission-critical transactional paths.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/cart` | — | `{ "cart": { items: [CartItem], subtotal, discounts, tax, total, currency } }`
| `POST` | `/api/cart/items` | `{ "productId", "variantId?", "quantity" }` | `{ "cart": { ...updated totals... } }`
| `PATCH` | `/api/cart/items/:productId` | `{ "variantId?", "quantity" }` | `{ "cart": { ... } }`
| `DELETE` | `/api/cart/items/:productId` | Query `variantId?` | `{ "cart": { ... } }`
| `POST` | `/api/cart/clear` | — | `{ "cart": { items: [], subtotal: 0, total: 0 } }`
| `POST` | `/api/cart/estimate` | `{ "items?": [CartItemInput], "destination?": { "country": "ISO2", "state?", "postalCode?" }, "shippingOptionId?", "currency?" }` | `{ "estimation": { subtotal, discounts, shipping, tax, duties?, total, currency, taxRegion: { country, label } } }`

Defaults to India (`destination.country = "IN"`, `currency = "INR"`) when omitted so carts surface predictable taxes immediately. Update this section as new regional tax engines are enabled.

**Orders**

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `POST` | `/api/orders` | `{ "shippingAddressId?", "billingAddressId?", "shipping?", "taxRate?", "paymentIntentId?" }` | `201 { "order": OrderDetail }`
| `GET` | `/api/orders` | Query `page`, `limit`, `status?` | `{ "items": [OrderSummary], "total", "page", "pages" }`
| `GET` | `/api/orders/:id` | — | `{ "order": OrderDetail }`
| `POST` | `/api/orders/:id/cancel` | — | `{ "order": { status: "cancelled" } }`

`OrderDetail` → `{ _id, number, status, totals: { subtotal, discountTotal, taxTotal, shippingTotal, grandTotal }, currency, items: [ { product, variant?, name, price, quantity } ], shippingAddress, billingAddress, paymentStatus, fulfillmentStatus, createdAt }`

---

## 4. Payments & Returns

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `POST` | `/api/payments/stripe/intent` | `{ "orderId", "paymentMethodId" }` | `{ "clientSecret", "order": OrderDetail }`
| `POST` | `/api/payments/stripe/webhook` | Raw Stripe payload | `200` with empty body on success |
| `POST` | `/api/orders/:id/returns` | `{ "items": [{ "orderItemId", "quantity", "reason?" }], "notes?" }` | `201 { "returnRequest": Return }`
| `GET` | `/api/orders/:id/returns` | — | `{ "items": [Return], "total" }`

`Return` → `{ _id, order, items: [{ orderItemId, product, variant?, quantity, amount? }], status, notes?, createdAt }`

---

## 5. Admin Management (requires `admin` role)

Prioritized to match day-to-day operations for support teams.

### Users

| Method | Path | Purpose | Request | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/users` | List customers/admins | Query `q`, `role`, `page`, `limit` | `{ "items": [UserSummary], "total", "page", "pages" }`
| `GET` | `/api/admin/users/:id` | Fetch profile | — | `{ "user": UserDetail }`
| `PATCH` | `/api/admin/users/:id` | Update roles/status | `{ "roles?": ["admin"], "isActive?": bool }` | `{ "user": UserDetail }`
| `POST` | `/api/admin/users/:id/promote` | Elevate to admin | — | `{ "user": UserDetail }`
| `POST` | `/api/admin/users/:id/demote` | Remove admin role | — | `{ "user": UserDetail }`

`UserSummary` → `{ _id, name, email, roles, isActive, isVerified, createdAt, lastLoginAt? }`

### Products & Categories

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `POST` | `/api/products` | `ProductInput` (name, description?, longDescription?, price, compareAtPrice?, costPrice?, currency, images[], attributes{}, categoryId, brandId?, vendor?, taxClass?, weight?, weightUnit?, dimensions?, tags[], metaTitle?, metaDescription?, metaKeywords[], variants[]) — arrays are trimmed & deduped. | `201 { "product": ProductDetail }`
| `PUT` | `/api/products/:id` | Partial `ProductInput` | `{ "product": ProductDetail }`
| `DELETE` | `/api/products/:id` | — | `{ "success": true }` (fails with `409` if referenced)
| `POST` | `/api/categories` | `{ "name", "parent?", "description?" }` | `201 { "category": Category }`
| `PUT` | `/api/categories/:id` | Same fields | `{ "category": Category }`
| `DELETE` | `/api/categories/:id` | — (soft delete sets `deletedAt`, `isActive=false`, `status="inactive"`) | `{ "success": true }`
| `POST` | `/api/admin/categories/:id/restore` | — | `{ "category": Category }`

> Admin listing endpoints accept `includeDeleted=true` to surface soft-deleted categories for restoration workflows.

### Inventory & Reservations

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/admin/inventory` | Query `product`, `variant`, `location`, `page`, `limit` | `{ "items": [InventorySnapshot], "total", "page", "pages" }`
| `GET` | `/api/admin/inventory/low` | Query `threshold`, pagination | `{ "items": [InventorySnapshot], "threshold", "total" }`
| `POST` | `/api/admin/inventory/adjustments` | `{ "productId", "variantId?", "qtyChange": +/-int, "reason", "note?", "location?" }` | `201 { "adjustment": Adjustment, "inventory": InventorySnapshot }`
| `GET` | `/api/admin/reservations` | Query `order`, `status`, `page`, `limit` | `{ "items": [Reservation], "total", "page", "pages" }`
| `POST` | `/api/admin/reservations/:id/release` | — | `{ "reservation": { status: "released" } }`

`InventorySnapshot` → `{ product, variant?, location?, quantity, reserved, updatedAt }`

`Adjustment` → `{ _id, product, variant?, qtyChange, reason, note?, location?, createdAt, user }`

`Reservation` → `{ _id, product, variant?, quantity, order?, expiresAt, status, createdAt }`

### Order Administration

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/admin/orders` | Query `status`, `customer`, pagination | `{ "items": [OrderSummary], "total" }`
| `GET` | `/api/admin/orders/:id` | — | `{ "order": OrderDetail }`
| `PATCH` | `/api/admin/orders/:id` | `{ "status?", "fulfillmentStatus?", "tracking?", "notes?" }` | `{ "order": OrderDetail }`
| `POST` | `/api/admin/orders/:id/fulfill` | `{ "items": [{ "orderItemId", "quantity" }], "carrier?", "tracking?" }` | `{ "order": OrderDetail }`
| `POST` | `/api/admin/orders/:id/refund` | `{ "items": [{ "orderItemId", "amount", "reason?" }], "note?" }` | `{ "order": OrderDetail, "refund": Refund }`

`Refund` → `{ _id, order, items, totalAmount, currency, status, createdAt }`

### Analytics & Reporting

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/admin/reports/sales` | Query `from`, `to`, `groupBy=day|week|month` | `{ "groupBy", "series": [{ "period", "revenue", "orders" }] }`
| `GET` | `/api/admin/reports/top-products` | Query `from`, `to`, `by=quantity|revenue`, `limit` | `{ "items": [{ "product", "name", "quantity", "revenue" }] }`
| `GET` | `/api/admin/reports/top-customers` | Query `from`, `to`, `limit` | `{ "items": [{ "user", "name", "email", "orders", "revenue" }] }`

---

## 6. Support Utilities

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/health` | `{ "status": "ok", "name": "ecombackend" }`
| `GET` | `/docs` | Swagger UI for the entire API |
| `GET` | `/docs/openapi.json` | Raw OpenAPI specification |

---

## Object Shape Appendix

- **Category** → `{ _id, name, slug, parent?, description?, breadcrumbs?, createdAt, updatedAt }`
- **Review** → `{ _id, product, user, rating, title?, body?, isApproved, createdAt }`
- **CartItem** → `{ product, variant?, name, price, currency, quantity, image? }`
- **OrderSummary** → `{ _id, number, status, paymentStatus, fulfillmentStatus, totals: { grandTotal, currency }, createdAt }`
- **ReturnRequest** → `{ _id, order, status, items, notes?, createdAt }`

This reference stays aligned with `src/docs/spec.js` (OpenAPI generator) and the Postman collection in `docs/postman_collection.json`. When in doubt, consult Swagger at runtime for field-level constraints.
