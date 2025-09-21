ne# E‑commerce API ReferenceThis document describes the HTTP API exposed by the backend for use by frontend clients and admin tools. All endpoints are JSON  - Note: `category` includes `{ _id, name, slug }` in this response.over HTTP.- Base URL: `http://localhost:<PORT>` (default `4001`, set by `.env` `PORT`)- API prefix: `API_PREFIX` (default `/api`) - Note: order items include `{ product, variant, name, price, currency, quantity }`- Docs UI: `GET /docs` (OpenAPI JSON: `GET /docs/openapi.json`)- Health: `GET /health` → `{ status: "ok", name }`## Conventions- Content type: send and expect `application/json`.- Auth: Bearer JWT in `Authorization` header for protected endpoints.- Error payload shape:  ```json  {    "error": {      "name": "HttpError",      "message": "...",      "code": "<ERROR_CODE>",      "details": { }    }  }  ```- Common error codes: `INVALID_CREDENTIALS`, `EMAIL_IN_USE`, `PRODUCT_NOT_FOUND`, `INSUFFICIENT_STOCK`, `CART_EMPTY`, `ORDER_NOT_FOUND`, `FORBIDDEN`, `TOKEN_INVALID`.- Rate limiting: requests under `/api` are limited (defaults: 200 req / 15 min / IP).## Authentication### POST /api/auth/register- Description: Create a user account. The very first registered user becomes `admin`; others are `customer`.- Body:  ```json  { "name": "string", "email": "email", "password": "string(min 6)" }  ```- Responses:  - 201 `{ "user": { "id", "name", "email", "roles", "isActive" } }`  - 409 `EMAIL_IN_USE`  - 422 validation error### POST /api/auth/login- Description: Authenticate and receive a JWT.- Body:  ```json  { "email": "email", "password": "string" }  ```- Responses:  - 200 `{ "token": "jwt", "refreshToken": "string", "user": { "id", "name", "email", "roles", "isActive" } }`  - 401 `INVALID_CREDENTIALS`### GET /api/auth/me- Auth: Bearer token required- Description: Returns current user profile from token.- Responses:  - 200 `{ "user": { "id", "name", "email", "roles", "isActive" } }`  - 401 `TOKEN_INVALID`### POST /api/auth/refresh- Description: Exchange a refresh token for a new access token (and a new refresh token).- Body: `{ "refreshToken": "string" }`- Response: `{ "token": "jwt", "refreshToken": "string", "user": { ... } }`### POST /api/auth/logout- Description: Revoke a refresh token to log out.- Body: `{ "refreshToken": "string" }`- Response: `{ "success": true }`### PATCH /api/auth/profile- Auth: Bearer token- Description: Update my profile (currently name only).- Body: `{ "name": "New Name" }`- Response: `{ "user": { ... } }`### POST /api/auth/password/change- Auth: Bearer token- Description: Change my password.- Body: `{ "currentPassword": "...", "newPassword": "..." }`- Response: `{ "success": true }`### POST /api/auth/password/forgot- Description: Request a password reset link. In development this logs the link to the server console; provide `baseUrl` to customize the link.- Body: `{ "email": "string", "baseUrl?": "https://your-frontend" }`- Response: `{ "success": true }`### POST /api/auth/password/reset- Description: Reset password using the token from the email.- Body: `{ "token": "string", "password": "newPass" }`- Response: `{ "success": true }`### POST /api/auth/email/verify/request- Auth: Bearer token- Description: Request a verification link to your current email.- Body: `{ "baseUrl?": "https://your-frontend" }`- Response: `{ "success": true }`### POST /api/auth/email/verify- Description: Verify email (or confirm email change) using token sent via email.- Body: `{ "token": "string" }`- Response: `{ "success": true }`### POST /api/auth/email/change/request- Auth: Bearer token- Description: Request to change email; sends verification link to the new address.- Body: `{ "newEmail": "new@example.com", "baseUrl?": "https://your-frontend" }`- Response: `{ "success": true }`### GET /api/auth/preferences- Auth: Bearer token- Description: Get my preferences.- Response: `{ "preferences": { "locale": "en", "notifications": { "email": true, "sms": false, "push": true } } }`### PATCH /api/auth/preferences- Auth: Bearer token- Description: Update my preferences.- Body: `{ "locale?": "en-GB", "notifications?": { "email?": false, "sms?": true, "push?": true } }`- Response: `{ "preferences": { ... } }`## Products### GET /api/products- Description: List products with optional search and pagination.- Query params:  - `q` string (optional) – search in name/description  - `category` string (optional) – category id  - `page` integer ≥ 1 (default 1)  - `limit` integer (default `API_DEFAULT_PAGE_SIZE`, max `API_MAX_PAGE_SIZE`)- Response:  ```json  {    "items": [      {        "_id": "string",        "name": "string",        "slug": "string",        "description": "string",        "price": 0,        "currency": "USD",        "images": [{ "url": "string", "alt": "string" }],        "attributes": { "key": "value" },        "variants": [ { "_id": "string", "sku": "string", "attributes": { "size": "M", "color": "Blue" }, "price": 19.99, "priceDelta": 0, "stock": 5, "isActive": true } ],        "ratingAvg": 0,        "ratingCount": 0,        "stock": 0,        "isActive": true      }    ],    "total": 0,    "page": 1,    "pages": 1  }  ```### GET /api/products/{id}- Description: Get product by id.- Path params: `id` string (product id)- Response: `{ "product": { ...product fields... } }`- Errors: 404 `PRODUCT_NOT_FOUND`### POST /api/products- Auth: Bearer token with role `admin`- Description: Create a new product.- Body:  ```json  {    "name": "string",    "description": "string?",    "price": 0,    "currency": "USD",    "images": [{ "url": "string", "alt": "string?" }],    "attributes": { "key": "value" },    "variants": [ { "sku": "TSHIRT-BLU-M", "attributes": { "size": "M", "color": "Blue" }, "price": 21.99, "stock": 5 } ],    "stock": 0,    "isActive": true  }  ```- Responses:  - 201 `{ "product": { ... } }`  - 401/403 on missing or insufficient roleImage Upload (admin)- `POST /api/uploads` (multipart/form-data, field `file`) → `{ url, filename, mimetype, size }`- Use returned `url` in product images array - Cloudinary: `POST /api/uploads/cloudinary` (field `file`) → `{ url, publicId, ... }` - Cloudinary delete: `POST /api/uploads/cloudinary/delete` { publicId }### PUT /api/products/{id}- Auth: Bearer token with role `admin`- Description: Update product fields.- Path params: `id` string- Body: same shape as create (any subset)- Response: `{ "product": { ... } }`- Errors: 404 `PRODUCT_NOT_FOUND`### DELETE /api/products/{id}- Auth: Bearer token with role `admin`- Description: Delete product by id.- Response: `{ "success": true }`- Errors: 404 `PRODUCT_NOT_FOUND`## Cart (requires login)All cart endpoints require `Authorization: Bearer <token>`.### GET /api/cart- Description: Get or create the current user's active cart.- Response:  ```json  {    "cart": {      "_id": "string",      "user": "userId",      "items": [        { "product": "productId", "name": "string", "price": 0, "currency": "USD", "quantity": 1 }      ],      "subtotal": 0,      "currency": "USD",      "status": "active"    }  }  ```### POST /api/cart/items- Description: Add an item (or increase quantity if already present).- Body:  ```json  { "productId": "string", "variantId": "string?", "quantity": 1 }  ```- Responses:  - 201 `{ "cart": { ... } }`  - 404 `PRODUCT_NOT_FOUND`  - 400 `INSUFFICIENT_STOCK`### PATCH /api/cart/items/{productId}- Description: Set quantity for an item in the cart.- Path params: `productId` string- Body:  ```json  { "quantity": 1, "variantId": "string?" }  ```- Responses:  - 200 `{ "cart": { ... } }`  - 404 `ITEM_NOT_IN_CART` or `PRODUCT_NOT_FOUND`  - 400 `INSUFFICIENT_STOCK` or `QUANTITY_POSITIVE`### DELETE /api/cart/items/{productId}- Description: Remove an item from the cart.- Query: `variantId` (optional if product has variants)- Response: `{ "cart": { ... } }`### POST /api/cart/clear- Description: Remove all items from the cart.- Response: `{ "cart": { ... } }`## Orders (requires login)- Headers: Idempotency-Key: <uuid> (recommended)\n- Description: Create an order from the current user's cart. If `shipping` or `taxRate` are omitted, defaults apply from configuration.- Body:  ```json  {    "shippingAddress": {      "fullName": "string?",      "line1": "string?",      "line2": "string?",      "city": "string?",      "state": "string?",      "postalCode": "string?",      "country": "string?",      "phone": "string?"    },    "shipping": 0,    "taxRate": 0.1  }  ```- Responses:  - 201 `{ "order": { ... } }`  - 400 `CART_EMPTY`, `INSUFFICIENT_STOCK`, `PRODUCT_UNAVAILABLE`### GET /api/orders- Description: List current user's orders.- Query params: `page`, `limit`- Response: `{ "items": [ ...orders ], "total": 0, "page": 1, "pages": 1 }` - Note: order items include `{ product, variant, name, price, currency, quantity }`### GET /api/orders/{id}- Description: Get a specific order for the current user.- Path params: `id` string- Response: `{ "order": { ... } }`- Errors: 404 `ORDER_NOT_FOUND`### GET /api/orders/{id}/invoice- Description: Download the invoice PDF for the order.- Response: HTTP 302 redirect to `/uploads/invoices/invoice-XXXX.pdf`- Auth: Bearer token- Description: Get the order’s timeline (status changes, payments, returns).- Response: `{ "items": [ { "type": "status_updated", "message": "...", "createdAt": "..." } ], "total": n, "page": 1, "pages": 1 }`### POST /api/orders/{id}/returns- Auth: Bearer token- Description: Request a return/refund for the order (full-order return for now). If a pending/approved return already exists for the order, returns that record.- Path params: `id` string- Body: `{ "reason?": "string" }`- Responses:  - 201 `{ "return": { "_id", "order", "user", "status": "requested" } }`  - 400 when order is not paid## Admin (requires login with role=admin)### POST /api/admin/users/{id}/promote- Description: Promote a user to admin.- Path params: `id` string (user id)- Response: `{ "user": { "id", "name", "email", "roles" } }`- Errors: 401 Unauthorized, 403 Forbidden, 404 User not found### POST /api/admin/users/{id}/demote- Description: Remove admin role from a user.- Path params: `id` string- Response: `{ "user": { "id", "name", "email", "roles" } }`- Errors: 401 Unauthorized, 403 Forbidden, 404 User not found### GET /api/admin/users- Description: List users with optional search/pagination.- Query params: `q`, `page`, `limit`- Response: `{ "items": [ { "id", "name", "email", "roles", "isActive" } ], "total", "page", "pages" }`### GET /api/admin/users/{id}- Description: Get a user by id.- Response: `{ "user": { "id", "name", "email", "roles", "isActive" } }`### PATCH /api/admin/users/{id}- Description: Update user fields (currently `isActive`).- Body: `{ "isActive": true }`- Response: `{ "user": { ... } }`### GET /api/admin/metrics- Description: Admin KPIs and counters.- Response:  ```json  {    "users": { "total": 0, "active": 0, "admins": 0 },    "products": { "total": 0 },    "orders": { "total": 0, "byStatus": { "pending": 0 } },    "revenueLast7Days": [ { "date": "YYYY-MM-DD", "total": 0 } ]  }  ```### GET /api/admin/orders- Description: List orders with filters.- Query: `status`, `paymentStatus`, `user`, `from`, `to`, `page`, `limit`- Response: `{ "items": [ ...orders ], "total", "page", "pages" }`### GET /api/admin/orders/{id}- Description: Get order by id.- Response: `{ "order": { ... } }`### PATCH /api/admin/orders/{id}- Description: Update order status/paymentStatus.- Body: `{ "status?": "...", "paymentStatus?": "..." }`### GET /api/admin/returns- Description: List return requests.- Query: `status?` one of `requested|approved|rejected|refunded`, `page`, `limit`- Response: `{ "items": [ ... ], "total", "page", "pages" }`- Headers: Idempotency-Key: <uuid> (recommended)\n- Description: Approve a return and attempt refund (Stripe supported) and restock items.- Path params: `id` string (return request id)- Response: `{ "return": { ... }, "order": { ... } }`### POST /api/admin/returns/{id}/reject- Description: Reject a return request.- Path params: `id` string (return request id)- Response: `{ "return": { ... } }`- Response: `{ "order": { ... } }`### Coupons (admin)- `GET /api/admin/coupons?q=&page=&limit=`- `POST /api/admin/coupons` { code, type: percent|fixed, value, minSubtotal?, expiresAt?, isActive? }- `GET /api/admin/coupons/:id`- `PUT /api/admin/coupons/:id` { ...fields }- `DELETE /api/admin/coupons/:id`### Products Bulk (admin)- `POST /api/admin/products/import` { items: [ProductInput, ...] }- `GET /api/admin/products/export?format=json|csv`- `POST /api/admin/products/price-bulk` { factorPercent, filter? { q?, category? } }- `POST /api/admin/products/category-bulk` { categoryId, productIds: [] }### Inventory (admin)- `GET /api/admin/inventory?product=&variant=&location=&page=&limit=`- `GET /api/admin/inventory/adjustments?product=&variant=&reason=&page=&limit=`- `POST /api/admin/inventory/adjustments` { productId, variantId?, location?, qtyChange, reason?, note? }- `GET /api/admin/inventory/low?threshold=&page=&limit=`### GET /api/admin/reports/sales- Description: Sales report aggregated by period.- Query: `from`, `to`, `groupBy` (`day`|`week`|`month`)- Response: `{ "groupBy": "day", "series": [ { "period": "YYYY-MM-DD", "revenue": 0, "orders": 0 } ] }`### GET /api/admin/reports/top-products- Description: Top products by quantity or revenue.- Query: `from`, `to`, `by` (`quantity`|`revenue`), `limit`- Response: `{ "by": "quantity", "items": [ { "product": "id", "name": "string", "quantity": 0, "revenue": 0 } ] }`### GET /api/admin/reports/top-customers- Description: Top customers by revenue or orders.- Query: `from`, `to`, `by` (`revenue`|`orders`), `limit`- Response: `{ "by": "revenue", "items": [ { "user": "id", "orders": 0, "revenue": 0 } ] }`### GET /api/admin/users- Description: List users with optional search/pagination.- Query params: `q`, `page`, `limit`- Response: `{ "items": [ { "id", "name", "email", "roles", "isActive" } ], "total", "page", "pages" }`### GET /api/admin/users/{id}- Description: Get a user by id.- Response: `{ "user": { "id", "name", "email", "roles", "isActive" } }`### PATCH /api/admin/users/{id}- Description: Update user fields (currently `isActive`).- Body: `{ "isActive": true }`- Response: `{ "user": { ... } }`### GET /api/admin/metrics- Description: Admin KPIs and counters.- Response:  ```json  {    "users": { "total": 0, "active": 0, "admins": 0 },    "products": { "total": 0 },    "orders": { "total": 0, "byStatus": { "pending": 0 } },    "revenueLast7Days": [ { "date": "YYYY-MM-DD", "total": 0 } ]  }  ```## Categories### GET /api/categories- Description: List categories. Use `parent` to list children; omit or pass empty to list root categories.- Query params: `q`, `parent`, `page`, `limit`- Response: `{ "items": [ { "_id", "name", "slug", "description" } ], "total", "page", "pages" }`### GET /api/categories/{id}- Description: Get category by id.- Response: `{ "category": { "_id", "name", "slug", "description" } }`### POST /api/categories- Auth: admin- Body: `{ "name": "string", "slug?": "string", "description?": "string", "parent?": "string|null" }`- Response: `{ "category": { ... } }`### PUT /api/categories/{id}- Auth: admin- Body: same as create- Response: `{ "category": { ... } }`### DELETE /api/categories/{id}- Auth: admin- Response: `{ "success": true }`### GET /api/categories/{id}/children- Description: List direct children of the category.- Response: `{ "items": [ ... ], "total": n, "page": 1, "pages": 1 }`### POST /api/categories/{id}/reorder- Auth: admin- Description: Set the order of child categories (updates `sortOrder`).- Body: `{ "ids": ["childId1", "childId2", ...] }` in the desired order.- Response: `{ "items": [ ...sorted children... ], "total": n, ... }`## Admin Categories (aliases)- Same operations as `/api/categories`, exposed under `/api/admin/categories*` and requiring `admin` role:  - `GET /api/admin/categories`  - `GET /api/admin/categories/{id}`  - `POST /api/admin/categories` (same body as public categories create)  - `PUT /api/admin/categories/{id}`  - `DELETE /api/admin/categories/{id}`  - `GET /api/admin/categories/{id}/children`  - `POST /api/admin/categories/{id}/reorder`## Reviews### GET /api/products/{id}/reviews- Description: List approved reviews for a product.- Query params: `page`, `limit`- Response: `{ "items": [ { "_id", "product", "user", "rating", "comment", "isApproved" } ], "total", "page", "pages" }`### POST /api/products/{id}/reviews- Auth: logged-in user- Body: `{ "rating": 1..5, "comment?": "string" }`- Response: `{ "review": { ... } }`### DELETE /api/products/{id}/reviews/{reviewId}- Auth: owner of the review or admin- Response: `{ "success": true }`### POST /api/products/{id}/reviews/{reviewId}/approve- Auth: admin- Description: Approve review so it shows publicly and counts toward rating.- Response: `{ "review": { ... } }`### POST /api/products/{id}/reviews/{reviewId}/hide- Auth: admin- Description: Hide review from the public and exclude from rating aggregation.- Response: `{ "review": { ... } }`## Headers Summary- `Content-Type: application/json` – for requests with a body- `Authorization: Bearer <jwt>` – for protected endpoints## ExamplesLogin and call a protected endpoint (PowerShell):```powershell$b = @{ email="admin@example.com"; password="ChangeMe123!" } | ConvertTo-Json$resp = Invoke-RestMethod "http://localhost:4001/api/auth/login" -Method Post -ContentType "application/json" -Body $b$token = $resp.tokenInvoke-RestMethod "http://localhost:4001/api/auth/me" -Headers @{ Authorization = "Bearer $token" }```Create a product (curl, as admin):```bashcurl -X POST http://localhost:4001/api/products \  -H "Authorization: Bearer <ADMIN_TOKEN>" \  -H "Content-Type: application/json" \  -d '{    "name": "Example", "description": "desc", "price": 19.99,    "currency": "USD", "stock": 5,    "images": [{"url":"https://example.com/img.jpg"}],    "category": "<categoryId>"  }'```Notes:- Email is normalized to lowercase during login/registration.- Product, Cart, and Order objects include MongoDB metadata like `_id`, `createdAt`, `updatedAt`.- CORS origin(s) are controlled by `CORS_ORIGIN` in `.env`.97939273468112493233## Payments (Stripe)### POST /api/payments/stripe/intent- Auth: logged-in user- Description: Create a PaymentIntent for an existing order; returns `clientSecret` for Stripe.js- Body: `{ "orderId": "string" }`- Response: `{ "clientSecret": "string" }` or `{ "alreadyPaid": true }`### POST /api/payments/stripe/webhook- Description: Stripe webhook endpoint. Marks order as paid on `payment_intent.succeeded`.- Note: requires `STRIPE_WEBHOOK_SECRET`. The endpoint expects raw JSON; configured in app.- Inventory  - `GET /api/admin/inventory/adjustments?product=&variant=&reason=&page=&limit=`  - `POST /api/admin/inventory/adjustments` { productId, variantId?, qtyChange, reason?, note? }
# E-commerce API Reference

This document summarizes the HTTP API exposed by the backend. All endpoints are JSON over HTTP and use ESM.

## Conventions
- Content type: send and expect `application/json` unless uploading files.
- Auth: Bearer JWT in `Authorization` header for protected endpoints.
- Idempotency: for write endpoints (e.g., `POST /api/orders`, `POST /api/admin/returns/{id}/approve`) send `Idempotency-Key: <uuid>`. Duplicate keys return `409` and are not reprocessed.
- Rate limiting: requests under `/api` are rate limited per route group (see server config).
- Error shape:
```json
{ "error": { "message": "...", "code": "ERROR_CODE", "details": {} } }
```

## Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`
- POST `/api/auth/refresh`
- POST `/api/auth/logout`
- PATCH `/api/auth/profile`
- POST `/api/auth/password/change`
- POST `/api/auth/password/forgot`
- POST `/api/auth/password/reset`
- POST `/api/auth/email/verify/request`
- POST `/api/auth/email/verify`
- POST `/api/auth/email/change/request`
- GET `/api/auth/preferences`
- PATCH `/api/auth/preferences`

## Products
- GET `/api/products` — list, with `q`, `category`, `page`, `limit`. Each product embeds `category` and `brand` (if assigned) as `{ _id, name, slug }`.
- GET `/api/products/{id}` — product detail with populated `category` and `brand` references.
- POST `/api/products` — admin; body per ProductInput; requires valid leaf `category`.
- PUT `/api/products/{id}` — admin; leaf category check applies when changing category.
- DELETE `/api/products/{id}` — admin.

ProductInput (summary):
```json
{
  "name": "string",
  "description": "string?",
  "longDescription": "string?",
  "price": 0,
  "compareAtPrice": 0,
  "costPrice": 0,
  "currency": "USD",
  "images": [ { "url": "https://...", "alt": "string?" } ],
  "attributes": { "color": "Blue" },
  "category": "<categoryId>",
  "brandId": "<brandId?>",
  "vendor": "string?",
  "sku": "string?",
  "tags": ["tshirt"],
  "variants": [ { "sku": "TSHIRT-BLU-M", "attributes": {"size":"M"}, "price": 21.99, "stock": 5 } ],
  "stock": 0,
  "requiresShipping": true,
  "weight": 0.5,
  "weightUnit": "kg",
  "dimensions": { "length": 30, "width": 20, "height": 2, "unit": "cm" },
  "metaTitle": "string?",
  "metaDescription": "string?"
}
```

## Categories
- GET `/api/categories`
- GET `/api/categories/{id}`
- GET `/api/categories/{id}/children`
- POST `/api/categories` — admin; create
- PUT `/api/categories/{id}` — admin; update
- POST `/api/categories/{id}/reorder` — admin; body `{ ids: [childId1, childId2, ...] }`
- DELETE `/api/categories/{id}` — admin; blocked if products exist or has children

Admin aliases (same semantics under `/api/admin/categories*`).

## Brands
- GET `/api/brands` — list/search brands; supports `q`, `page`, `limit`.
- GET `/api/brands/{id}` — fetch single brand.
- POST `/api/brands` — admin; body `{ name, slug?, logo?, description?, isActive? }`.
- PUT `/api/brands/{id}` — admin; update payload matches create (all fields optional).
- DELETE `/api/brands/{id}` — admin; blocked when products reference the brand.

## Cart (requires login)
- GET `/api/cart`
- POST `/api/cart/items` — add `{ productId, variantId?, quantity }`
- PATCH `/api/cart/items/{productId}` — `{ quantity, variantId? }`
- DELETE `/api/cart/items/{productId}` — optional `variantId` query
- POST `/api/cart/clear`
- POST `/api/cart/coupon` — `{ code }`
- DELETE `/api/cart/coupon`

## Orders (requires login)
- POST `/api/orders` — create order from cart
  - Headers: `Idempotency-Key: <uuid>` (recommended)
  - Body: `{ shippingAddress?, shipping?, taxRate? }`
- GET `/api/orders` — list my orders (items include `{ product, variant, name, price, currency, quantity }`)
- GET `/api/orders/{id}` — my order (items include `{ product, variant, name, price, currency, quantity }`)
- GET `/api/orders/{id}/invoice` — 302 redirect to invoice PDF
- GET `/api/orders/{id}/timeline`
- POST `/api/orders/{id}/returns` — request return (paid orders only)

Example order response:
```json
{
  "order": {
    "_id": "64ff...",
    "user": "64aa...",
    "items": [
      { "product": "64p1...", "variant": "64v1...", "name": "Tee Blue / M", "price": 21.99, "currency": "USD", "quantity": 2 },
      { "product": "64p2...", "name": "Sticker Pack", "price": 4.99, "currency": "USD", "quantity": 1 }
    ],
    "subtotal": 48.97,
    "shipping": 0,
    "tax": 0,
    "total": 48.97,
    "currency": "USD",
    "status": "pending",
    "paymentStatus": "unpaid",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

## Admin (requires admin)
- Users: GET `/api/admin/users`, GET `/api/admin/users/{id}`, PATCH `/api/admin/users/{id}`, POST `/api/admin/users/{id}/(promote|demote)`
- Orders: GET `/api/admin/orders`, GET `/api/admin/orders/{id}`, PATCH `/api/admin/orders/{id}`
- Returns:
  - GET `/api/admin/returns`
  - POST `/api/admin/returns/{id}/approve` — Headers: `Idempotency-Key: <uuid>` (recommended)
  - POST `/api/admin/returns/{id}/reject`
- Inventory: GET `/api/admin/inventory`, GET `/api/admin/inventory/adjustments`, POST `/api/admin/inventory/adjustments`
- Products: POST `/api/admin/products/import`, GET `/api/admin/products/export?format=json|csv`, bulk ops (`/price-bulk`, `/category-bulk`)
- Reports: `/api/admin/reports/sales`, `/api/admin/reports/top-products`, `/api/admin/reports/top-customers`
- Categories admin aliases: `/api/admin/categories*` (same as public CRUD, admin‑only)
- Brands admin: `/api/admin/brands` (list/create), `/api/admin/brands/{id}` (get/update/delete), `/api/admin/brands/{id}/references`

## Payments (Stripe)
- POST `/api/payments/stripe/intent` — create PaymentIntent for an order
- POST `/api/payments/stripe/webhook` — webhook (expects raw JSON)

## Uploads
- POST `/api/uploads` — admin; multipart `file`
- Cloudinary: POST `/api/uploads/cloudinary` (file), POST `/api/uploads/cloudinary/delete` `{ publicId }`

## Examples
Create a product (admin):
```bash
curl -X POST http://localhost:4001/api/products \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Tee",
    "description": "100% cotton",
    "price": 19.99,
    "currency": "USD",
    "images": [{"url":"https://example.com/img.jpg"}],
    "category": "<categoryId>"
  }'
```

Order item snapshot shape:
```json
{ "product": "<id>", "variant": "<variantId?>", "name": "Example Tee", "price": 19.99, "currency": "USD", "quantity": 2 }
```
