# End‑to‑End Flows (with API links)

Auth
1. Register: `POST /api/auth/register` → Login: `POST /api/auth/login` → set `Authorization: Bearer <token>`
2. Refresh as needed: `POST /api/auth/refresh`

Catalog Setup (Admin)
1. Create category: `POST /api/admin/categories`
2. Create brand: `POST /api/admin/brands`
3. Create product: `POST /api/products` (admin)

Shop & Checkout
1. Add to cart: `POST /api/cart/items` { productId, variantId?, quantity }
2. Estimate totals: `POST /api/cart/estimate` { taxRate?, shipping? }
3. Apply coupon (optional): `POST /api/cart/coupon` { code }
4. Place order: `POST /api/orders` { shippingAddress?, billingAddress?, shipping?, taxRate? }
   - Invoices generated; defaults to Address Book if addresses omitted

Payments (Stripe)
1. Create intent: `POST /api/payments/stripe/intent` { orderId }
2. Confirm on frontend with Stripe.js (clientSecret)
3. Webhook (dev via Stripe CLI): `POST /api/payments/stripe/webhook`

Returns & Refunds
1. Customer requests: `POST /api/orders/:id/returns`
2. Admin approves (partial supported): `POST /api/admin/returns/:id/approve` { items?, amount? }
3. Refund recorded; inventory restocked; return links to refund

Shipments (Admin)
1. Create: `POST /api/admin/orders/:id/shipments` { carrier?, tracking?, service?, items?[] }
2. List: `GET /api/admin/shipments?order=&page=&limit=` or `GET /api/admin/orders/:id/shipments`

Safe Delete UX (Admin)
- Product references: `GET /api/admin/products/:id/references` → { inventory, reviews, orders, shipments }
- Brand references: `GET /api/admin/brands/:id/references` → { products }
- Deletes return `409 Conflict` with typed codes if in use
