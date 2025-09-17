# Cart

Endpoints (auth required)
- Get: `GET /api/cart`
- Add item: `POST /api/cart/items` { productId, variantId?, quantity?=1 }
- Update item: `PATCH /api/cart/items/:productId` { quantity, variantId? }
- Remove item: `DELETE /api/cart/items/:productId?variantId=`
- Clear: `POST /api/cart/clear`
- Apply/Remove coupon: `POST|DELETE /api/cart/coupon` { code }
- Estimate totals: `POST /api/cart/estimate` { shipping?, taxRate? }

Notes
- Stock checks are variant‑aware.
- Coupons honor include/exclude product/category + usage limits (per user/global).
- Estimates compute `{ subtotal, discount, shipping, tax, total, currency }`.
