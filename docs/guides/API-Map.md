# API Map (by area & role)

Public
- Health: `GET /health`
- Products: `GET /api/products`, `GET /api/products/:id`
- Categories: `GET /api/categories`, `GET /api/categories/:id`

Auth (public → auth)
- Register/Login/Me/Refresh
- Password: change/forgot/reset
- Email: verification & change

Customer (auth required)
- Reviews: list/create/update/delete under `/api/products/:id/reviews`
- Cart: get/add/update/remove/clear, coupon, estimate
- Orders: create from cart, list/get, invoice, timeline
- Returns: request
- Addresses: CRUD + set default

Admin
- Users: list/get/update, promote/demote
- Metrics: `GET /api/admin/metrics`
- Orders: list/get/update
- Returns: list/approve/reject (partial supported)
- Transactions/Refunds: list/get
- Shipments: list/get, create for order, list by order
- Inventory: adjustments list/create, inventory list, low stock
- Categories: CRUD, reorder children
- Brands: CRUD (409 on delete in use), references
- Coupons: CRUD (targeting/limits)
- Products helpers: import/export, price bulk, category bulk, variants‑matrix, references

Docs
- Swagger UI: `/docs` ; OpenAPI JSON: `/docs/openapi.json`
