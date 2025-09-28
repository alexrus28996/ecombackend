# E-commerce HTTP API

Last reviewed: 2025-10-21.

All business endpoints are served under the configured `API_PREFIX` (`/api` by default). Responses are JSON and are returned without a global `data` envelope. Errors follow:

```json
{
  "error": {
    "message": "Human readable error",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

- Authentication: supply `Authorization: Bearer <JWT>` on any non-public route. The first registered account is promoted to the `admin` role.
- Idempotency: endpoints that mutate orders (`POST /api/orders`, `POST /api/admin/returns/:id/approve`) accept an optional `Idempotency-Key` header and replay the first response for duplicate keys.
- Rate limiting: a global limiter wraps `/api`, with stricter buckets for `/api/auth`, `/api/uploads`, `/api/payments`, `/api/admin/audit-logs`, and `/api/admin/inventory/ledger`.
- Documentation: OpenAPI JSON is available at `/docs/openapi.json`, and the interactive explorer lives at `/docs`.
- Static uploads: files stored via the uploads API are served from `/uploads` in development.

## Validation snapshot (2025-09-26)

Command executed: `npm test`.

| Area | Status | Evidence / Notes |
| --- | --- | --- |
| Authentication, JWT rotation, address book, cart CRUD, coupon pricing, FX conversion, catalog CRUD | Working (automated) | Covered by Jest suites in `__tests__/auth.test.js`, `addresses.test.js`, `cart.test.js`, `coupons.test.js`, `currency.test.js`, `products.test.js`, `pricing.test.js`, `jwt.test.js`, `errors.test.js`. |
| Cart to order conversion, inventory reservations, Stripe payment success, admin reservation release | Working (automated) | Covered by Jest suites in `__tests__/checkout.test.js` and `__tests__/payments.test.js`, which exercise order creation, reservation release, and payment capture fallbacks. |
| Product review mutations (create/update/delete/moderation) | Working (automated) | Covered by `__tests__/reviews.test.js`, ensuring ratings recompute correctly after upsert, moderation, and deletion. |
| Product merchandising fields & category lifecycle (soft delete/restore) | Working (automated) | Covered by Jest suites `__tests__/products-extra-fields.test.js` and `categories-soft-delete.test.js`. |
| Admin audit logs, inventory locations, transfer orders, stock ledger, payment events, order timeline notes | Working (automated) | Covered by Jest suites `__tests__/audit-logs.test.js`, `inventory-locations.test.js`, `transfer-orders.test.js`, `inventory-ledger.test.js`, `payment-events.test.js`, and `order-timeline.test.js`. |
| Remaining admin operations (metrics, reports, stock adjustments, imports, uploads, shipments) | Working (manual review) | Code paths inspected; no automated coverage yet. |

## Endpoint reference

Audience legend: Public (no auth), Authenticated user (valid JWT), Admin (requires admin role), Permission (requires the listed permission). Status values reflect verification level: Working (automated), Working (manual review), Broken, or Blocked (dependent on an unfinished flow).

### Health & metadata

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /health` | Public | Working (manual review) | None | `200 { "status": "ok", "name": config.APP_NAME }`. Used by readiness checks. |
| `GET /docs` | Public | Working (manual review) | None | Swagger UI generated at runtime (`src/docs/spec.js`). |
| `GET /docs/openapi.json` | Public | Working (manual review) | None | OpenAPI 3.1 JSON describing the API. |

### Authentication & account lifecycle

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `POST /api/auth/register` | Public | Working (automated) | Body `{ "name", "email", "password" }` | `201 { "user": { id, name, email, roles, isActive, isVerified, createdAt } }`. First user gains `admin` role. |
| `POST /api/auth/login` | Public | Working (automated) | Body `{ "email", "password" }` | `{ "token", "refreshToken", "user": { ... } }`. |
| `GET /api/auth/me` | Authenticated user | Working (manual review) | None | `{ "user": { id, name, email, roles, isActive, isVerified } }`. |
| `POST /api/auth/refresh` | Public | Working (automated) | Body `{ "refreshToken" }` | `{ "token", "refreshToken", "user": { ... } }`. |
| `POST /api/auth/logout` | Public | Working (automated) | Body `{ "refreshToken" }` | `{ "success": true }`. |
| `POST /api/auth/password/forgot` | Public | Working (manual review) | Body `{ "email", "baseUrl?" }` | `{ "success": true }`. Emits log via `src/utils/email.js`. |
| `POST /api/auth/password/reset` | Public | Working (manual review) | Body `{ "token", "password" }` | `{ "success": true }`. |
| `POST /api/auth/password/change` | Authenticated user | Working (manual review) | Body `{ "currentPassword", "newPassword" }` | `{ "success": true }`. |
| `PATCH /api/auth/profile` | Authenticated user | Working (manual review) | Body `{ "name": string }` | `{ "user": { ... } }`. |
| `GET /api/auth/preferences` | Authenticated user | Working (manual review) | None | `{ "preferences": { locale, notifications: { email, sms, push } } }`. |
| `PATCH /api/auth/preferences` | Authenticated user | Working (manual review) | Body `{ "locale?", "notifications?": { "email?", "sms?", "push?" } }` | `{ "preferences": { ... } }`. |
| `POST /api/auth/email/verify/request` | Authenticated user | Working (manual review) | Body `{ "baseUrl?" }` | `{ "success": true }`. |
| `POST /api/auth/email/verify` | Public | Working (manual review) | Body `{ "token" }` | `{ "success": true }`. |
| `POST /api/auth/email/change/request` | Authenticated user | Working (manual review) | Body `{ "newEmail", "baseUrl?" }` | `{ "success": true }`. |

### Permissions

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/permissions/me` | Authenticated user | Working (manual review) | None | `{ "userId": string, "permissions": string[] }`. Helpful for debugging JWT payloads. |

### Address book

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/addresses` | Authenticated user | Working (automated) | Query `type?=shipping|billing` | `{ "items": Address[], "total?", "page?", "pages?" }`. Defaults sorted with `isDefault` first. |
| `POST /api/addresses` | Authenticated user | Working (automated) | Body `{ "type": "shipping"|"billing", "line1", "line2?", "city?", "state?", "postalCode?", "country?", "phone?", "label?", "isDefault?" }` | `201 { "address": Address }`. |
| `GET /api/addresses/:id` | Authenticated user | Working (automated) | Params `{ id }` | `{ "address": Address }`. 404 when not found or not owned. |
| `PUT /api/addresses/:id` | Authenticated user | Working (automated) | Body partial address fields | `{ "address": Address }`. |
| `DELETE /api/addresses/:id` | Authenticated user | Working (automated) | Params `{ id }` | `{ "success": true }`. |
| `POST /api/addresses/:id/default` | Authenticated user | Working (automated) | None | `{ "address": Address }`. Sets default for its type and clears others. |

### Catalog: categories

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/categories` | Public | Working (manual review) | Query `q?`, `parent?`, `page?`, `limit?` | `{ "items": Category[], "total", "page", "pages" }`. Soft-deleted categories are excluded. |
| `GET /api/categories/:id` | Public | Working (manual review) | Params `{ id }` | `{ "category": Category }`. Returns 404 for soft-deleted records. |
| `GET /api/categories/:id/children` | Public | Working (manual review) | Query `page?`, `limit?` | Same pager payload filtered by parent id. |
| `POST /api/categories` | Permission (category:create) | Working (manual review) | Body `{ "name", "slug?", "description?", "parent?" }` | `201 { "category": Category }`. Ensures parent exists and generates slug when missing. |
| `PUT /api/categories/:id` | Permission (category:edit) | Working (manual review) | Body `{ "name?", "slug?", "description?", "parent?" }` | `{ "category": Category }`. Guards against self-parenting and missing parent. |
| `POST /api/categories/:id/reorder` | Permission (category:edit) | Working (manual review) | Body `{ "ids": string[] }` | Returns updated child listing with new `sortOrder`. |
| `DELETE /api/categories/:id` | Permission (category:delete) | Working (manual review) | None | `{ "success": true }`. Performs a soft delete (`deletedAt`, `status="inactive"`, `isActive=false`). |
| `POST /api/admin/categories/:id/restore` | Permission (category:edit) | Working (manual review) | None | `{ "category": Category }`. Restores a soft-deleted category; requires unique slug check. |

### Catalog: brands

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/brands` | Public | Working (manual review) | Query `q?`, `page?`, `limit?` | `{ "items": Brand[], "total", "page", "pages" }`. |
| `GET /api/brands/:id` | Public | Working (manual review) | Params `{ id }` | `{ "brand": Brand }`. |
| `POST /api/brands` | Admin (role) | Working (manual review) | Body `{ "name", "slug?", "description?", "logo?", "isActive?" }` | `201 { "brand": Brand }`. Enforces unique name and slug. |
| `PUT /api/brands/:id` | Admin (role) | Working (manual review) | Body partial brand fields | `{ "brand": Brand }`. |
| `DELETE /api/brands/:id` | Admin (role) | Working (manual review) | None | `{ "success": true }` when no products reference the brand. |

### Catalog: products (public)

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/products` | Public | Working (automated) | Query `q?`, `category?`, `page?`, `limit?` | `{ "items": ProductSummary[], "total", "page", "pages" }`. Items include populated category and brand fields. |
| `GET /api/products/:id` | Public | Working (automated) | Params `{ id }` | `{ "product": ProductDetail }` including SEO fields (`metaTitle`, `metaDescription`, `metaKeywords`), merchandising copy (`longDescription`), pricing (`compareAtPrice`, `costPrice`, `taxClass`), sourcing info (`vendor`), shipping metrics (`weight`, `weightUnit`, `dimensions`), and cleaned `tags`. `attributeConfig` and variants populated. |

### Catalog: products (admin CRUD)

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `POST /api/products` | Permission (product:create) | Working (manual review) | Body `{ "name", "description?", "longDescription?", "price", "compareAtPrice?", "costPrice?", "currency?", "vendor?", "taxClass?", "weight?", "weightUnit?", "dimensions?": { "length?", "width?", "height?", "unit?" }, "tags?": string[], "images?", "attributes?", "metaTitle?", "metaDescription?", "metaKeywords?", "isActive?", "category", "brandId?" }` | `201 { "product": Product }`. Validates category is a leaf, brand exists if provided, and numeric fields are `>= 0`; tags are trimmed/deduped, weight defaults to `kg`, dimensions default to `cm`. |
| `PUT /api/products/:id` | Permission (product:edit) | Working (manual review) | Body same fields (all optional) | `{ "product": Product }`. Applies same validation/sanitization rules as create. |
| `PATCH /api/products/:id` | Permission (product:edit) | Working (manual review) | Body same as `PUT` | `{ "product": Product }`. |
| `DELETE /api/products/:id` | Permission (product:delete) | Working (manual review) | None | `{ "success": true }` when no inventory, orders, reviews, or shipments reference the product. |

### Product attributes and options

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/products/:productId/attributes` | Public | Working (manual review) | Params `{ productId }` | `{ "items": Attribute[] }` with nested options. |
| `POST /api/products/:productId/attributes` | Permission (product:edit) | Working (manual review) | Body `{ "name", "slug?", "description?", "sortOrder?", "isRequired?" }` | `201 { "attribute": Attribute }`. |
| `PUT /api/products/:productId/attributes/:attributeId` | Permission (product:edit) | Working (manual review) | Body partial attribute fields | `{ "attribute": Attribute }`. |
| `DELETE /api/products/:productId/attributes/:attributeId` | Permission (product:edit) | Working (manual review) | None | `{ "success": true }`. Removes attribute and dependent options. |
| `GET /api/products/:productId/attributes/:attributeId/options` | Public | Working (manual review) | Params `{ productId, attributeId }` | `{ "items": Option[] }`. |
| `POST /api/products/:productId/attributes/:attributeId/options` | Permission (product:edit) | Working (manual review) | Body `{ "name", "slug?", "sortOrder?", "metadata?" }` | `201 { "option": Option }`. |
| `PUT /api/products/:productId/attributes/:attributeId/options/:optionId` | Permission (product:edit) | Working (manual review) | Body partial option fields | `{ "option": Option }`. |
| `DELETE /api/products/:productId/attributes/:attributeId/options/:optionId` | Permission (product:edit) | Working (manual review) | None | `{ "success": true }`. |

### Product variants

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/products/:productId/variants` | Public | Working (manual review) | Params `{ productId }` | `{ "items": Variant[] }` including `attributeMap`. |
| `GET /api/products/:productId/variants/:variantId` | Public | Working (manual review) | Params `{ productId, variantId }` | `{ "variant": Variant }`. |
| `POST /api/products/:productId/variants` | Permission (product:edit) | Working (manual review) | Body `{ "sku", "selections": [{ "attribute", "option" }], "priceOverride?", "priceDelta?", "stock?", "barcode?", "isActive?" }` | `201 { "variant": Variant }`. |
| `PUT /api/products/:productId/variants/:variantId` | Permission (product:edit) | Working (manual review) | Body partial variant fields | `{ "variant": Variant }`. |
| `DELETE /api/products/:productId/variants/:variantId` | Permission (product:edit) | Working (manual review) | None | `{ "success": true }`. |
| `POST /api/products/:productId/variants-matrix` | Permission (product:edit) | Working (manual review) | Body `{ "options": { "<attribute>": string[] }, "base?": { "price?", "skuPrefix?" } }` | `{ "items": VariantPreview[], "count": number }`. Generates combinations without persisting. |

### Admin: audit logs

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/audit-logs` | Permission (audit:view) | Working (automated) | Query `q?`, `user?`, `method?`, `path?`, `status?`, `from?`, `to?`, `page?`, `limit?` | `{ "items": AuditLog[], "total", "page", "pages" }`. Responses redact sensitive headers and payload keys (e.g., `Authorization`, password fields). Subject to stricter rate limiting. |
| `GET /api/admin/audit-logs/:id` | Permission (audit:view) | Working (automated) | Params `{ id }` | `{ "log": AuditLog }`. Returns 404 if not found; payload mirrors list redaction rules. |

### Inventory: locations (admin)

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/locations` | Permission (inventory:location:view) | Working (automated) | Query `q?`, `type?`, `active?`, `page?`, `limit?`, `includeDeleted?` | `{ "items": Location[], "total", "page", "pages" }`. Supports soft-deleted visibility when `includeDeleted=true`. |
| `POST /api/admin/locations` | Permission (inventory:location:create) | Working (automated) | Body `{ "code", "name", "type?", "geo?", "priority?", "active?", "metadata?" }` | `201 { "location": Location }`. Validates unique code; defaults `active=true`. |
| `GET /api/admin/locations/:id` | Permission (inventory:location:view) | Working (automated) | Params `{ id }` | `{ "location": Location }`. Returns 404 when missing or soft-deleted without `includeDeleted`. |
| `PUT /api/admin/locations/:id` | Permission (inventory:location:edit) | Working (automated) | Body partial fields | `{ "location": Location }`. Revalidates uniqueness for `code` and supports toggling `active`. |
| `DELETE /api/admin/locations/:id` | Permission (inventory:location:delete) | Working (automated) | None | `{ "success": true }`. Soft deletes by setting `deletedAt` and `active=false`. |
| `POST /api/admin/locations/:id/restore` | Permission (inventory:location:edit) | Working (automated) | None | `{ "location": Location }`. Clears `deletedAt` and allows reactivation. |

### Inventory: transfer orders (admin)

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/inventory/transfers` | Permission (inventory:transfer:view) | Working (automated) | Query `status?`, `fromLocationId?`, `toLocationId?`, `page?`, `limit?`, `from?`, `to?` | `{ "items": TransferOrder[], "total", "page", "pages" }`. Filters by status/date and populates locations and lines. |
| `POST /api/admin/inventory/transfers` | Permission (inventory:transfer:create) | Working (automated) | Body `{ "fromLocationId", "toLocationId", "lines": [{ "productId", "variantId?", "qty" }], "metadata?" }` | `201 { "transfer": TransferOrder }`. Validates `qty >= 1` per line and distinct source/destination locations. |
| `GET /api/admin/inventory/transfers/:id` | Permission (inventory:transfer:view) | Working (automated) | Params `{ id }` | `{ "transfer": TransferOrder }`. Includes timeline of status transitions. |
| `PATCH /api/admin/inventory/transfers/:id` | Permission (inventory:transfer:edit) | Working (automated) | Body partial fields and lines | `{ "transfer": TransferOrder }`. Allowed only while status is `DRAFT`; enforces line validation. |
| `POST /api/admin/inventory/transfers/:id/submit` | Permission (inventory:transfer:submit) | Working (automated) | None | `{ "transfer": TransferOrder }`. Moves status `DRAFT → REQUESTED`; locks edits. |
| `POST /api/admin/inventory/transfers/:id/ship` | Permission (inventory:transfer:submit) | Working (automated) | None | `{ "transfer": TransferOrder }`. Transitions `REQUESTED → IN_TRANSIT`. |
| `POST /api/admin/inventory/transfers/:id/receive` | Permission (inventory:transfer:receive) | Working (automated) | None | `{ "transfer": TransferOrder }`. Transitions `IN_TRANSIT → RECEIVED`, writes StockLedger entries (`TRANSFER_OUT`/`TRANSFER_IN`), and updates `StockItem.onHand`/`incoming`. Forbidden once received. |
| `POST /api/admin/inventory/transfers/:id/cancel` | Permission (inventory:transfer:edit) | Working (automated) | None | `{ "transfer": TransferOrder }`. Cancels when status is `DRAFT` or `REQUESTED`. |

### Inventory: stock ledger (admin)

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/inventory/ledger` | Permission (inventory:ledger:view) | Working (automated) | Query `productId?`, `variantId?`, `locationId?`, `direction?`, `reason?`, `refType?`, `from?`, `to?`, `page?`, `limit?` | `{ "items": StockLedger[], "total", "page", "pages" }`. Strict rate limited; returns paginated chronological entries. |
| `GET /api/admin/inventory/ledger/:id` | Permission (inventory:ledger:view) | Working (automated) | Params `{ id }` | `{ "entry": StockLedger }`. 404 when unknown. |

### Payments: events (admin)

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/payment-events` | Permission (payments:events:view) | Working (automated) | Query `provider?`, `type?`, `order?`, `from?`, `to?`, `page?`, `limit?` | `{ "items": PaymentEvent[], "total", "page", "pages" }`. Stored payloads redact tokens/secrets; sorted newest first. |
| `GET /api/admin/payment-events/:id` | Permission (payments:events:view) | Working (automated) | Params `{ id }` | `{ "event": PaymentEvent }`. Includes provider response metadata with redaction. |

### Orders: timeline (admin)

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `POST /api/admin/orders/:id/timeline` | Permission (orders:timeline:write) | Working (automated) | Body `{ "type", "message", "meta?", "from?", "to?" }` | `201 { "entry": OrderTimeline }`. Persists author info, emits correlated AuditLog entry, and rejects empty messages. |

### Reviews

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/products/:productId/reviews` | Public | Working (automated) | Query `page?`, `limit?`, `includeUnapproved?` | `{ "items": Review[], "total", "page", "pages" }`. Covered by `__tests__/reviews.test.js`. |
| `POST /api/products/:productId/reviews` | Authenticated user | Working (automated) | Body `{ "rating": 1-5, "comment?" }` | Upserts the caller's review, recomputes product rating, and marks verified purchases when a paid order exists. |
| `DELETE /api/products/:productId/reviews/:reviewId` | Authenticated user or admin | Working (automated) | None | Deletes a review (author or admin) and refreshes product rating counts. |
| `POST /api/products/:productId/reviews/:reviewId/approve` | Admin (role) | Working (automated) | None | Approves a review and recalculates product rating averages. |
| `POST /api/products/:productId/reviews/:reviewId/hide` | Admin (role) | Working (automated) | None | Hides a review (sets `isApproved=false`) and excludes it from rating aggregates. |

### Cart management

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/cart` | Authenticated user | Working (automated) | None | `{ "cart": { items, subtotal, discount, total, currency, couponCode? } }`. |
| `POST /api/cart/items` | Authenticated user | Working (automated) | Body `{ "productId", "variantId?", "quantity" }` | `201 { "cart": { ... } }`. Validates stock via `getAvailableStock`. |
| `PATCH /api/cart/items/:productId` | Authenticated user | Working (automated) | Body `{ "variantId?", "quantity" }` | `{ "cart": { ... } }`. |
| `DELETE /api/cart/items/:productId` | Authenticated user | Working (automated) | Query `variantId?` | `{ "cart": { ... } }`. |
| `POST /api/cart/clear` | Authenticated user | Working (automated) | None | `{ "cart": { items: [], subtotal: 0, total: 0 } }`. |
| `POST /api/cart/coupon` | Authenticated user | Working (automated) | Body `{ "code" }` | `{ "cart": { ... } }`. Applies coupon when eligible. |
| `DELETE /api/cart/coupon` | Authenticated user | Working (automated) | None | `{ "cart": { ... } }` with discounts cleared. |
| `POST /api/cart/estimate` | Authenticated user | Working (manual review) | Body `{ "shipping?", "taxRate?" }` (all optional) | `{ "subtotal", "discount", "shipping", "tax", "total", "currency" }`. Uses current cart totals. |

### Orders and returns (customer)

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `POST /api/orders` | Authenticated user | Working (automated) | Body `{ "shippingAddress?", "billingAddress?", "shipping?", "taxRate?" }` | Creates an order from the active cart, generates a PDF invoice, and reserves stock. Covered by `__tests__/checkout.test.js`. |
| `GET /api/orders` | Authenticated user | Working (automated) | Query `page?`, `limit?` | `{ "items": Order[], "total", "page", "pages" }`. Verified via `__tests__/checkout.test.js`. |
| `GET /api/orders/:id` | Authenticated user | Working (automated) | Params `{ id }` | `{ "order": Order }`. Verified via `__tests__/checkout.test.js`. |
| `GET /api/orders/:id/invoice` | Authenticated user | Working (manual review) | None | HTTP 302 redirect to `invoiceUrl`, 404 if invoice missing. |
| `GET /api/orders/:id/timeline` | Authenticated user | Working (manual review) | Query `page?`, `limit?` | `{ "items": TimelineEntry[], "total", "page", "pages" }`. |
| `POST /api/orders/:id/returns` | Authenticated user | Working (manual review) | Body `{ "reason?" }` | `201 { "return": ReturnRequest }` when order exists and is paid. |

### Payments

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `POST /api/payments/stripe/intent` | Authenticated user | Working (manual review) | Body `{ "orderId" }` | Returns 503 `PAYMENTS_NOT_CONFIGURED` when Stripe keys are absent; otherwise creates a PaymentIntent and returns `{ "clientSecret" }`. |
| `POST /api/payments/stripe/webhook` | Public (Stripe) | Working (automated) | Raw Stripe payload with `Stripe-Signature` header | Processes `payment_intent.succeeded`, marks orders as paid, and converts reservations to stock. Covered by `__tests__/payments.test.js`. |

### Media uploads

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `POST /api/uploads` | Admin (role) | Working (manual review) | Multipart form-data with field `file` | `201 { "url", "filename", "mimetype", "size" }`. Stores file under `uploads/`. |
| `POST /api/uploads/cloudinary` | Admin (role) | Working (automated) | Multipart form-data with field `file` | `201 { "url", "publicId", "width", "height", "format", "bytes" }`. Validates image uploads, surfaces auth failures, and pulls credentials from `CLOUDINARY_*`. Covered by `__tests__/uploads.test.js`. |
| `POST /api/uploads/cloudinary/delete` | Admin (role) | Working (automated) | Body `{ "publicId" }` | `{ "result": { ... } }`. Returns 400 for missing ids and 401 on Cloudinary auth errors. Covered by `__tests__/uploads.test.js`. |

### Admin: users and roles

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/users` | Admin (role) | Working (manual review) | Query `q?`, `page?`, `limit?` | `{ "items": [{ id, name, email, roles, isActive }], "total", "page", "pages" }`. |
| `GET /api/admin/users/:id` | Admin (role) | Working (manual review) | Params `{ id }` | `{ "user": { ... } }`. |
| `PATCH /api/admin/users/:id` | Admin (role) | Working (manual review) | Body `{ "isActive?" }` | `{ "user": { ... } }`. |
| `POST /api/admin/users/:id/promote` | Admin (role) | Working (manual review) | None | `{ "user": { ...roles updated... } }`. Adds `admin` role. |
| `POST /api/admin/users/:id/demote` | Admin (role) | Working (manual review) | None | `{ "user": { ...roles updated... } }`. Removes `admin`, ensures at least `customer`. |
| `GET /api/admin/users/:id/permissions` | Admin (role) | Working (automated) | Params `{ id }` | `{ "userId", "permissions" }`. Covered by `__tests__/admin-permissions.test.js`. |
| `POST /api/admin/users/:id/permissions` | Admin (role) | Working (automated) | Body `{ "permissions": string[] }` | Replaces the full permission set. Covered by `__tests__/admin-permissions.test.js`. |
| `PATCH /api/admin/users/:id/permissions/add` | Admin (role) | Working (automated) | Body `{ "permissions": string[] }` | Adds unique permissions without duplicates. Covered by `__tests__/admin-permissions.test.js`. |
| `PATCH /api/admin/users/:id/permissions/remove` | Admin (role) | Working (automated) | Body `{ "permissions": string[] }` | Removes any matching permissions. Covered by `__tests__/admin-permissions.test.js`. |

### Admin: metrics

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/metrics` | Admin (role) | Working (manual review) | None | `{ "usersTotal", "usersActive", "adminsCount", "productsCount", "ordersTotal", "ordersByStatus", "revenueLast7Days": [{ period, revenue, orders }] }`. |

### Admin: orders

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/orders` | Admin (role) | Working (manual review) | Query `status?`, `paymentStatus?`, `user?`, `from?`, `to?`, `page?`, `limit?` | `{ "items": Order[], "total", "page", "pages" }` sorted by newest. Supports status and payment filters. |
| `GET /api/admin/orders/:id` | Admin (role) | Working (manual review) | Params `{ id }` | `{ "order": Order }`. |
| `PATCH /api/admin/orders/:id` | Admin (role) | Working (manual review) | Body `{ "status?", "paymentStatus?" }` | Enforces linear status transitions (pending → paid → shipped → delivered or cancelled) and releases reservations on cancellation. |

### Admin: coupons

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/coupons` | Admin (role) | Working (automated) | Query `q?`, `page?`, `limit?` | `{ "items": Coupon[], "total", "page", "pages" }`. |
| `POST /api/admin/coupons` | Admin (role) | Working (automated) | Body `{ "code", "description?", "type": "percent"|"fixed", "value", "minSubtotal?", "includeCategories?", "excludeCategories?", "includeProducts?", "excludeProducts?", "perUserLimit?", "globalLimit?", "expiresAt?", "isActive?" }` | `201 { "coupon": Coupon }`. |
| `GET /api/admin/coupons/:id` | Admin (role) | Working (automated) | Params `{ id }` | `{ "coupon": Coupon }`. |
| `PUT /api/admin/coupons/:id` | Admin (role) | Working (automated) | Body same as create | `{ "coupon": Coupon }`. |
| `DELETE /api/admin/coupons/:id` | Admin (role) | Working (automated) | None | `{ "success": true }`. |

### Admin: currency rates

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/currency-rates` | Admin (role) | Working (automated) | Query `baseCurrency?` | `{ "baseCurrency": string, "rates": Rate[] }`. |
| `POST /api/admin/currency-rates` | Admin (role) | Working (automated) | Body `{ "baseCurrency?", "currency", "rate", "source?" }` | `201 { "rate": Rate }`. |
| `DELETE /api/admin/currency-rates/:currency` | Admin (role) | Working (automated) | Query `baseCurrency?` | `{ "success": true }`. |

### Admin: inventory and stock

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/inventory/adjustments` | Admin (role) | Working (manual review) | Query `product?`, `variant?`, `reason?`, `direction?`, `locationId?`, `page?`, `limit?` | `{ "items": Adjustment[], "total", "page", "pages" }`. |
| `POST /api/admin/inventory/adjustments` | Admin (role) | Working (manual review) | Body `{ "productId", "variantId?", "locationId", "qtyChange?", "reservedChange?", "reason", "note?", "refId?" }` | `201 { "inventory": StockItem }`. |
| `GET /api/admin/inventory` | Admin (role) | Working (manual review) | Query `product?`, `variant?`, `locationId?`, `page?`, `limit?` | `{ "items": StockItem[], "total", "page", "pages" }`. |
| `GET /api/admin/inventory/low` | Admin (role) | Working (manual review) | Query `threshold?`, `page?`, `limit?` | `{ "items": StockItem[], "total", "page", "pages", "threshold" }`. |

### Admin: returns

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/returns` | Admin (role) | Working (manual review) | Query `status?`, `page?`, `limit?` | `{ "items": ReturnRequest[], "total", "page", "pages" }` with newest first. |
| `POST /api/admin/returns/:id/approve` | Admin (role) | Working (manual review) | Optional body `{ "items?" [{ "product", "variant?", "quantity", "locationId?" }], "amount?", "locationId?" }` with optional `Idempotency-Key` | `{ "return": ReturnRequest, "order": Order, "refund?": Refund }`. Processes Stripe refund when configured and restocks via `adjustStockLevels`. |
| `POST /api/admin/returns/:id/reject` | Admin (role) | Working (manual review) | None | `{ "return": ReturnRequest }`. |

### Admin: payments and refunds

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/transactions` | Admin (role) | Working (automated) | Query `orderId?`, `provider?`, `status?`, `page?`, `limit?` | `{ "items": PaymentTransaction[], "total", "page", "pages" }`. Returns an empty dataset when no orders exist. Covered by `__tests__/admin-payments.test.js`. |
| `GET /api/admin/transactions/:id` | Admin (role) | Working (automated) | Params `{ id }` | `{ "transaction": PaymentTransaction }`. Covered by `__tests__/admin-payments.test.js`. |
| `GET /api/admin/refunds` | Admin (role) | Working (automated) | Query `orderId?`, `provider?`, `status?`, `page?`, `limit?` | `{ "items": Refund[], "total", "page", "pages" }`. Syncs with Stripe refund webhooks; returns empty datasets when none exist. Covered by `__tests__/admin-payments.test.js`. |
| `GET /api/admin/refunds/:id` | Admin (role) | Working (automated) | Params `{ id }` | `{ "refund": Refund }`. Covered by `__tests__/admin-payments.test.js`. |

### Admin: shipments

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/shipments` | Admin (role) | Working (automated) | Query `orderId?`, `page?`, `limit?` | `{ "items": Shipment[], "total", "page", "pages" }`. Returns empty datasets until shipments exist. Covered by `__tests__/admin-shipments.test.js`. |
| `GET /api/admin/shipments/:id` | Admin (role) | Working (automated) | Params `{ id }` | `{ "shipment": Shipment }`. Covered by `__tests__/admin-shipments.test.js`. |
| `POST /api/admin/orders/:id/shipments` | Admin (role) | Working (automated) | Body `{ "carrier?", "tracking?", "service?", "items?" }` | `201 { "shipment": Shipment }`. Only allowed for paid orders; defaults to full order items when omitted. Covered by `__tests__/admin-shipments.test.js`. |
| `GET /api/admin/orders/:id/shipments` | Admin (role) | Working (automated) | Query `page?`, `limit?` | `{ "items": Shipment[], "total", "page", "pages" }`. Returns 404 when the order is not found. Covered by `__tests__/admin-shipments.test.js`. |

### Admin: products under /api/admin

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/products` | Admin (role) | Working (manual review) | Query `q?`, `category?`, `page?`, `limit?` | Same payload as public `/api/products`, restricted to admins. |
| `GET /api/admin/products/:id` | Admin (role) | Working (manual review) | Params `{ id }` | `{ "product": ProductDetail }`. |
| `POST /api/admin/products` | Admin (role) | Working (manual review) | Same body as `/api/products` create | `201 { "product": Product }`. |
| `PUT /api/admin/products/:id` | Admin (role) | Working (manual review) | Same body as `/api/products` update | `{ "product": Product }`. |
| `PATCH /api/admin/products/:id` | Admin (role) | Working (manual review) | Same body as `/api/products` update | `{ "product": Product }`. |
| `DELETE /api/admin/products/:id` | Admin (role) | Working (manual review) | None | `{ "success": true }`. |

### Admin: product tooling

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `POST /api/admin/products/import` | Admin (role) | Working (manual review) | Body `{ "items": ProductInput[] }` | `201 { "inserted", "failed", "errors": [{ "name", "message" }] }`. Validates category leaf nodes. |
| `GET /api/admin/products/export` | Admin (role) | Working (manual review) | Query `format?=json|csv` | Streams all products as JSON or CSV with appropriate download headers. |
| `POST /api/admin/products/price-bulk` | Admin (role) | Working (manual review) | Body `{ "factorPercent", "filter?": { "q?", "category?" } }` | `{ "matched": number, "modified": number, "factor": number }`. |
| `POST /api/admin/products/category-bulk` | Admin (role) | Working (manual review) | Body `{ "categoryId", "productIds": string[] }` | `{ "matched": number, "modified": number }`. |
| `POST /api/admin/products/variants-matrix` | Admin (role) | Working (manual review) | Body `{ "options": { "<attribute>": string[] }, "base?": { "price?", "skuPrefix?" } }` | `{ "count": number, "variants": VariantPreview[] }`. |
| `GET /api/admin/products/:id/references` | Admin (role) | Working (manual review) | Params `{ id }` | `{ "inventory", "reviews", "orders", "shipments" }` counts for delete-impact analysis. |
| `GET /api/admin/brands/:id/references` | Admin (role) | Working (manual review) | Params `{ id }` | `{ "products": number }`. |

### Admin: reports

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/reports/sales` | Admin (role) | Working (manual review) | Query `from?`, `to?`, `groupBy?=day|week|month` | `{ "groupBy": string, "series": [{ "period", "revenue", "orders" }] }`. |
| `GET /api/admin/reports/top-products` | Admin (role) | Working (manual review) | Query `from?`, `to?`, `by?=quantity|revenue`, `limit?` | `{ "by": string, "items": [{ "product", "name", "quantity", "revenue" }] }`. |
| `GET /api/admin/reports/top-customers` | Admin (role) | Working (manual review) | Query `from?`, `to?`, `by?=revenue|orders`, `limit?` | `{ "by": string, "items": [{ "user", "orders", "revenue" }] }`. |

### Admin: category and brand mirrors

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET|POST|PUT|DELETE /api/admin/categories[...]` | Admin (role) | Working (manual review) | Identical payloads to `/api/categories` routes | Responses mirror the public category endpoints, with admin-only access. |
| `GET|POST|PUT|DELETE /api/admin/brands[...]` | Admin (role) | Working (manual review) | Identical payloads to `/api/brands` routes | Responses mirror the public brand endpoints, with admin-only access. |

### Admin: reservations

| Endpoint | Audience | Status | Request | Response / Notes |
| --- | --- | --- | --- | --- |
| `GET /api/admin/reservations` | Admin (role) | Working (manual review) | Query `orderId?`, `productId?`, `status?`, `page?`, `limit?` | `{ "items": Reservation[], "total", "page", "pages" }`. Useful for debugging holds. |
| `POST /api/admin/reservations/:orderId/release` | Admin (role) | Working (manual review) | Body `{ "reason?", "notes?" }` | Immediately releases active reservations for the order and restores stock quantities. |
