# Addresses (Address Book)

Endpoints (auth)
- `GET /api/addresses` (optional `?type=shipping|billing`)
- `POST /api/addresses` { type, line1, city?, country?, isDefault? }
- `GET|PUT|DELETE /api/addresses/:id`
- `POST /api/addresses/:id/default`

Checkout
- If `shippingAddress`/`billingAddress` omitted in `POST /api/orders`, defaults are auto‑used.
