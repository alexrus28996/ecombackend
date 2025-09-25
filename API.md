# E-commerce HTTP API

All business endpoints are served under the `API_PREFIX` (`/api` by default). Responses are JSON and wrap domain objects without a global `data` envelope. Errors follow the shape `{ "error": { message, code?, details? } }`.

- **Authentication**: Supply `Authorization: Bearer <JWT>` for any non-public route.
- **Idempotency**: Write-heavy routes accept an optional `Idempotency-Key` header (orders, returns, Stripe webhook) and will replay the first response for duplicate keys.
- **Permissions**: Role based access is enforced either through explicit permissions (e.g. `product:create`) or the `ADMIN` role for the `/admin` namespace.

---

## Service Health

### `GET /health`
- **Description**: Readiness probe. Returns `{ status, name }`.
- **Auth**: None.

---

## Authentication & Account Lifecycle

### `POST /api/auth/register`
- **Description**: Register a new customer account. The very first user receives the `ADMIN` role.
- **Auth**: None.
- **Body**: `{ "name": string, "email": string, "password": string }`.
- **Response**: `201 { "user": { id, name, email, roles, isActive, isVerified, createdAt } }`.

### `POST /api/auth/login`
- **Description**: Exchange credentials for an access token.
- **Auth**: None.
- **Body**: `{ "email": string, "password": string }`.
- **Response**: `{ "token": string, "refreshToken": string, "user": { id, name, email, roles, permissions?, isVerified } }`.

### `GET /api/auth/me`
- **Description**: Resolve the current user from the presented JWT.
- **Auth**: Bearer token.
- **Response**: `{ "user": { id, name, email, roles, isActive, isVerified } }`.

### `POST /api/auth/refresh`
- **Description**: Rotate a refresh token and receive a new access pair.
- **Auth**: None.
- **Body**: `{ "refreshToken": string }`.
- **Response**: `{ "token": string, "refreshToken": string, "user": {...} }`.

### `POST /api/auth/logout`
- **Description**: Revoke a refresh token for the current device.
- **Auth**: None (token supplied in body).
- **Body**: `{ "refreshToken": string }`.
- **Response**: `{ "success": true }`.

### `POST /api/auth/password/forgot`
- **Description**: Trigger password reset email.
- **Auth**: None.
- **Body**: `{ "email": string, "baseUrl?": string }` (optional base URL for reset links).
- **Response**: `{ "success": true }`.

### `POST /api/auth/password/reset`
- **Description**: Reset password using emailed token.
- **Auth**: None.
- **Body**: `{ "token": string, "password": string }`.
- **Response**: `{ "success": true }`.

### `POST /api/auth/password/change`
- **Description**: Change password for current user.
- **Auth**: Bearer token.
- **Body**: `{ "currentPassword": string, "newPassword": string }`.
- **Response**: `{ "success": true }`.

### `PATCH /api/auth/profile`
- **Description**: Update current user's name.
- **Auth**: Bearer token.
- **Body**: `{ "name": string }`.
- **Response**: `{ "user": { ...updated profile } }`.

### `GET /api/auth/preferences`
- **Description**: Fetch notification and locale preferences.
- **Auth**: Bearer token.
- **Response**: `{ "preferences": { locale, notifications: { email, sms, push } } }`.

### `PATCH /api/auth/preferences`
- **Description**: Update notification or locale preferences.
- **Auth**: Bearer token.
- **Body**: `{ "locale?": string, "notifications?": { "email?": boolean, "sms?": boolean, "push?": boolean } }`.
- **Response**: `{ "preferences": {...} }`.

### `POST /api/auth/email/verify/request`
- **Description**: Send a verification email to the current user.
- **Auth**: Bearer token.
- **Body**: `{ "baseUrl?": string }`.
- **Response**: `{ "success": true }`.

### `POST /api/auth/email/verify`
- **Description**: Verify email or apply email-change token.
- **Auth**: None.
- **Body**: `{ "token": string }`.
- **Response**: `{ "success": true }`.

### `POST /api/auth/email/change/request`
- **Description**: Request an email change for the signed-in user.
- **Auth**: Bearer token.
- **Body**: `{ "newEmail": string, "baseUrl?": string }`.
- **Response**: `{ "success": true }`.

---

## Permissions

### `GET /api/permissions/me`
- **Description**: Convenience endpoint to inspect the permission array embedded in the JWT.
- **Auth**: Bearer token.
- **Response**: `{ "userId": string, "permissions": string[] }`.

---

## Catalog & Discovery

### Products (`/api/products`)
- `GET /api/products`
  - **Description**: Paginated catalog search.
  - **Query**: `q`, `category`, `brand`, `page`, `limit`.
  - **Auth**: Public.
  - **Response**: `{ items: ProductSummary[], total, page, pages }`.
- `GET /api/products/:id`
  - **Description**: Product detail including attributes, variants, category, brand.
  - **Auth**: Public.
  - **Response**: `{ product: ProductDetail }`.
- `POST /api/products`
  - **Description**: Create a product.
  - **Auth**: Bearer token with `product:create` permission.
  - **Body**: `{ name, description?, price, currency?, images?, attributes?, category, brandId?, isActive? }`.
  - **Response**: `201 { product }`.
- `PUT /api/products/:id` & `PATCH /api/products/:id`
  - **Description**: Update product metadata.
  - **Auth**: Bearer token with `product:edit`.
  - **Body**: Same shape as create (all fields optional).
  - **Response**: `{ product }`.
- `DELETE /api/products/:id`
  - **Description**: Soft delete/deactivate product.
  - **Auth**: Bearer token with `product:delete`.
  - **Response**: `{ success: true }` style payload from service (includes removal metadata).

### Product Attributes & Options
All routes below require `product:edit` permission.
- `GET /api/products/:productId/attributes` → `{ items: Attribute[] }`.
- `POST /api/products/:productId/attributes` → create attribute, body `{ name, displayName?, type?, required?, position? }`.
- `PUT /api/products/:productId/attributes/:attributeId` → update attribute, body similar to create.
- `DELETE /api/products/:productId/attributes/:attributeId` → removes attribute and associated options/variants.
- `GET /api/products/:productId/attributes/:attributeId/options` → `{ items: Option[] }`.
- `POST /api/products/:productId/attributes/:attributeId/options` → create option, body `{ value, label?, position? }`.
- `PUT /api/products/:productId/attributes/:attributeId/options/:optionId` → update option metadata.
- `DELETE /api/products/:productId/attributes/:attributeId/options/:optionId` → delete option.

### Product Variants
All write operations require `product:edit`.
- `GET /api/products/:productId/variants` → `{ items: Variant[] }` including attribute map.
- `GET /api/products/:productId/variants/:variantId` → `{ variant }`.
- `POST /api/products/:productId/variants` → create variant, body `{ sku, price, quantity?, attributes }`.
- `PUT /api/products/:productId/variants/:variantId` → update variant.
- `DELETE /api/products/:productId/variants/:variantId` → remove variant.
- `POST /api/products/:productId/variants-matrix` → generate variants from attribute values, body `{ options: { color: string[], size: string[] }, base?: { skuPrefix?: string } }`, response `{ items: Variant[] }`.

### Reviews (`/api/products/:productId/reviews`)
- `GET /` → Public list, query `page`, `limit`. Response `{ items, total, page, pages }`.
- `POST /` → Authenticated customers upsert review. Body `{ rating: 1..5, title?, body? }`. Response `201 { review }`.
- `DELETE /:reviewId` → Authenticated user (author) or admin removes review.
- `POST /:reviewId/approve` & `POST /:reviewId/hide` → Admin moderation. Response `{ review }`.

### Categories (`/api/categories`)
- `GET /` → Public tree listing, query `parent`, `page`, `limit`. Response `{ items, total, page, pages }`.
- `GET /:id` → `{ category }`.
- `GET /:id/children` → `{ items, total, page, pages }`.
- `POST /` → Create category. Requires `category:create`. Body `{ name, slug?, description?, parent? }`.
- `PUT /:id` → Update category. Requires `category:edit`.
- `POST /:id/reorder` → Update child ordering. Requires `category:edit`. Body `{ ids: string[] }`.
- `DELETE /:id` → Soft delete. Requires `category:delete`.

### Brands (`/api/brands`)
- `GET /` → Public list/search (`q`, `page`, `limit`). Response `{ items, total, page, pages }`.
- `GET /:id` → `{ brand }`.
- `POST /` → Create brand (admin role required). Body `{ name, slug?, description?, logo? }`.
- `PUT /:id` → Update brand (admin).
- `DELETE /:id` → Remove brand (admin).

---

## Cart (`/api/cart`)
All cart endpoints require a logged-in customer.
- `GET /api/cart` → `{ cart }`.
- `POST /api/cart/items` → Add item. Body `{ productId, variantId?, quantity }`. Response `201 { cart }`.
- `PATCH /api/cart/items/:productId` → Update quantity/variant. Body `{ quantity, variantId? }`. Response `{ cart }`.
- `DELETE /api/cart/items/:productId` → Remove item. Response `{ cart }`.
- `POST /api/cart/clear` → Clear cart. Response `{ cart }`.
- `POST /api/cart/coupon` → Apply coupon. Body `{ code }`. Response `{ cart }`.
- `DELETE /api/cart/coupon` → Remove coupon. Response `{ cart }`.
- `POST /api/cart/estimate` → Shipping & tax estimate. Body `{ shipping?: number, taxRate?: number }`. Response `{ subtotal, discount, shipping, tax, total, currency }`.

---

## Orders (`/api/orders`)
All routes require a signed-in customer.
- `POST /api/orders`
  - **Description**: Convert active cart into an order (idempotent).
  - **Headers**: Optional `Idempotency-Key`.
  - **Body**: `{ shippingAddress?, billingAddress?, shipping?, taxRate? }`.
  - **Response**: `201 { order }`.
- `GET /api/orders` → `{ items, total, page, pages }` (orders for current user).
- `GET /api/orders/:id` → `{ order }`.
- `GET /api/orders/:id/invoice` → Redirect (302) to hosted invoice URL.
- `GET /api/orders/:id/timeline` → `{ items, total, page, pages }` timeline events.
- `POST /api/orders/:id/returns` → Request a return/refund. Body `{ reason? }`. Response `201 { return }` or existing request.

---

## Addresses (`/api/addresses`)
All routes require authentication.
- `GET /` → `{ items: Address[] }` (optional query `type=shipping|billing`).
- `POST /` → Create address, body `{ fullName, line1, city, state, postalCode, country, phone?, type }`. Response `201 { address }`.
- `GET /:id` → `{ address }`.
- `PUT /:id` → Update address, same shape as create.
- `DELETE /:id` → `{ success: true }`.
- `POST /:id/default` → Mark address as default for its type. Response `{ address }`.

---

## Payments (`/api/payments`)
- `POST /api/payments/stripe/intent`
  - **Description**: Create or reuse a Stripe PaymentIntent for an order.
  - **Auth**: Bearer token.
  - **Body**: `{ "orderId": string }`.
  - **Response**: `{ clientSecret, paymentIntentId, requiresAction }` (depends on service configuration).
- `POST /api/payments/stripe/webhook`
  - **Description**: Stripe webhook endpoint (raw body, no auth). Handles `payment_intent.succeeded` events.
  - **Headers**: `Stripe-Signature`.
  - **Response**: `{ received: true }`.

---

## Uploads (`/api/uploads`)
- `POST /api/uploads`
  - **Description**: Local disk upload (field name `file`).
  - **Auth**: Admin role.
  - **Response**: `{ url, filename, mimetype, size }`.
- `POST /api/uploads/cloudinary`
  - **Description**: Upload buffer to Cloudinary (field `file`).
  - **Auth**: Admin role.
  - **Response**: `{ url, publicId, width, height, format, bytes }`.
- `POST /api/uploads/cloudinary/delete`
  - **Description**: Delete Cloudinary asset.
  - **Auth**: Admin role.
  - **Body**: `{ publicId: string }`.
  - **Response**: `{ result: string }`.

---

## Admin APIs (`/api/admin`)
All routes below require an authenticated user with the `ADMIN` role.

### Users
- `GET /api/admin/users` → List users (query `q`, `page`, `limit`). Response `{ items: [{ id, name, email, roles, isActive }], total, page, pages }`.
- `GET /api/admin/users/:id` → `{ user }`.
- `PATCH /api/admin/users/:id` → Body `{ isActive?: boolean }`. Response `{ user }`.
- `POST /api/admin/users/:id/promote` → Adds `ADMIN` role. Response `{ user }`.
- `POST /api/admin/users/:id/demote` → Removes `ADMIN` role. Response `{ user }`.

### Metrics
- `GET /api/admin/metrics` → Aggregate counts `{ usersTotal, usersActive, adminsCount, productsCount, ordersTotal, ordersByStatus, revenueLast7Days }`.

### Orders
- `GET /api/admin/orders` → Query filters `status`, `paymentStatus`, `user`, `from`, `to`, pagination. Response `{ items, total, page, pages }`.
- `GET /api/admin/orders/:id` → `{ order }`.
- `PATCH /api/admin/orders/:id` → Body `{ status?, paymentStatus? }`. Response `{ order }`.

### Coupons
- `GET /api/admin/coupons` → Search with `q`, pagination. Response `{ items, total, page, pages }`.
- `POST /api/admin/coupons` → Body `{ code, type, value, minSubtotal?, includeCategories?, excludeCategories?, includeProducts?, excludeProducts?, perUserLimit?, globalLimit?, expiresAt?, isActive? }`. Response `201 { coupon }`.
- `GET /api/admin/coupons/:id` → `{ coupon }`.
- `PUT /api/admin/coupons/:id` → Update coupon (same fields as create). Response `{ coupon }`.
- `DELETE /api/admin/coupons/:id` → `{ success: true }`.

### Currency Rates
- `GET /api/admin/currency-rates` → Query optional `baseCurrency`. Response `{ baseCurrency, rates }`.
- `POST /api/admin/currency-rates` → Body `{ baseCurrency?, currency, rate, source?, metadata? }`. Response `201 { rate }`.
- `DELETE /api/admin/currency-rates/:currency` → Query optional `baseCurrency`. Response `{ success: true }`.

### Inventory
- `GET /api/admin/inventory/adjustments` → Filter `product`, `variant`, `reason`, `direction`, `locationId`, pagination. Response `{ items, total, page, pages }`.
- `POST /api/admin/inventory/adjustments` → Body `{ productId, variantId?, locationId, qtyChange?, reservedChange?, reason, refId? }`. Response `201 { inventory }` (updated stock record).
- `GET /api/admin/inventory` → List stock items. Query `product`, `variant`, `locationId`, pagination. Response `{ items, total, page, pages }`.
- `GET /api/admin/inventory/low` → Low stock report. Query `threshold?`, pagination. Response `{ items, total, page, pages, threshold }`.

### Returns
- `GET /api/admin/returns` → Query `status`, pagination. Response `{ items, total, page, pages }`.
- `POST /api/admin/returns/:id/approve` → Body may include `{ items?, amount?, locationId? }`. Response `{ return, order, refund? }`.
- `POST /api/admin/returns/:id/reject` → Response `{ return }`.

### Payments & Refunds
- `GET /api/admin/transactions` → Query `order`, `provider`, `status`, pagination. Response `{ items, total, page, pages }`.
- `GET /api/admin/transactions/:id` → `{ transaction }`.
- `GET /api/admin/refunds` → Query `order`, `provider`, `status`, pagination. Response `{ items, total, page, pages }`.
- `GET /api/admin/refunds/:id` → `{ refund }`.

### Shipments
- `GET /api/admin/shipments` → Query `order`, pagination. Response `{ items, total, page, pages }`.
- `POST /api/admin/orders/:id/shipments` → Body `{ carrier?, tracking?, service?, items? }`. Response `201 { shipment }`.
- `GET /api/admin/shipments/:id` → `{ shipment }`.
- `GET /api/admin/orders/:id/shipments` → `{ items, total, page, pages }`.

### Product Operations
- `GET /api/admin/products` -> Paginated admin catalog search. Response `{ items, total, page, pages }`.
- `GET /api/admin/products/:id` -> `{ product }`.
- `POST /api/admin/products` -> Body `ProductInput`. Response `201 { product }`.
- `PUT /api/admin/products/:id` (also `PATCH`) -> Body `Partial<ProductInput>`. Response `{ product }`.
- `DELETE /api/admin/products/:id` -> `{ success: true }`.
- `POST /api/admin/products/import` → Body `{ items: ProductInput[] }`. Response `201 { inserted, failed, errors: [{ name, message }] }`.
- `GET /api/admin/products/export` → Download all products (`format=json|csv`).
- `POST /api/admin/products/price-bulk` → Body `{ factorPercent, filter?: { q?, category? } }`. Response `{ matched, modified, factor }`.
- `POST /api/admin/products/category-bulk` → Body `{ categoryId, productIds: string[] }`. Response `{ matched, modified }`.
- `POST /api/admin/products/variants-matrix` → Body `{ options, base? }`. Response `{ count, variants }`.
- `GET /api/admin/products/:id/references` → Counts references `{ inventory, reviews, orders, shipments }`.

### Reports
- `GET /api/admin/reports/sales` → Query `from`, `to`, `groupBy=day|week|month`. Response `{ groupBy, series: [{ period, revenue, orders }] }`.
- `GET /api/admin/reports/top-products` → Query `from`, `to`, `by=quantity|revenue`, `limit`. Response `{ by, items: [{ product, name, quantity, revenue }] }`.
- `GET /api/admin/reports/top-customers` → Query `from`, `to`, `by=revenue|orders`, `limit`. Response `{ by, items: [{ user, orders, revenue }] }`.

### Admin Category & Brand Mirrors
Admin routes mirror the public CRUD but live under `/api/admin/categories` and `/api/admin/brands`, sharing request/response shapes. Use them when building admin UIs.

---

## Reservations (`/api/admin/reservations`)
- `GET /api/admin/reservations` → Requires admin role. Query `orderId`, `productId`, `status`, pagination. Response `{ items, total, page, pages }`.
- `POST /api/admin/reservations/:orderId/release` → Body `{ reason?: string, notes?: string }`. Response `{ released }` (count of reservations released).

---

## Stripe Webhook Testing
When testing locally, expose `/api/payments/stripe/webhook` through a tunneling tool (e.g., `stripe listen`). Ensure the raw body middleware remains in place; do not send `application/json` with a parsed body.
