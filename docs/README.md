# Ecom Backend – Documentation Hub

This folder is the single place for frontend and QA engineers to understand and integrate with the API.

Read in this order for a smooth integration depending on your role:

**Everyone (start here)**
- Plain-language tour for stakeholders → `docs/NonTechnicalOverview.md`
- Snapshot of top-priority endpoints (payloads + responses) → `docs/API.md`

**Frontend & mobile developers**
1) Auth basics → `docs/guides/Auth.md`
2) Products + Categories + Brands → `docs/guides/Products.md`, `docs/guides/Brands.md`
3) Cart → `docs/guides/Cart.md`
4) Orders → `docs/guides/Orders.md`
5) Payments (Stripe) → `docs/guides/Payments.md`
6) Returns & Refunds → `docs/guides/Returns.md`
7) Shipments → `docs/guides/Shipments.md`
8) Addresses (Address Book) → `docs/guides/Addresses.md`
9) Coupons & Promotions → `docs/guides/Coupons.md`
10) Inventory & Reservations → `docs/guides/Inventory.md`
11) Admin overview → `docs/guides/Admin.md`

Cross‑cutting docs
- Architecture (modules, relationships) → `docs/guides/Architecture.md`
- End‑to‑End Flows (API links per step) → `docs/guides/Flows.md`
- API Map (all endpoints by area/role) → `docs/guides/API-Map.md`
- RBAC & Permissions → `docs/guides/RBAC.md`
- Constraints & Policies (rate‑limits, idempotency, delete guards, etc.) → `docs/guides/Constraints.md`

How to read the API
- Swagger UI (live, clickable): `GET {BASE_URL}/docs` (default `http://localhost:4001/docs`)
- OpenAPI JSON (for tooling): `GET {BASE_URL}/docs/openapi.json`
- Postman Collection: import `docs/postman_collection.json`
  - Variables: `baseUrl`, `token` (Bearer), `uuid` (Idempotency-Key)
- Error payload shape always:
  - `{ "error": { "name", "message", "code?", "details?" } }`
  - Error codes: see `src/errors/codes.js` and messages in `src/errors/messages.js`

Environment (dev)
- Copy `.env.example` → `.env`, then:
  - `MONGO_URI`, `DB_NAME` (optional), `JWT_SECRET`, `CORS_ORIGIN`
  - Stripe optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Start API: `npm install && npm run dev`
- DB helper: `node scripts/verify-indexes.js`

Post‑integration smoke (frontend)
- Auth: register → login → set token
- Catalog: create category + brand (admin) → create product (admin)
- Cart: add items → estimate totals → apply coupon (if needed)
- Order: `POST /api/orders`
- Payments: create Stripe intent; in dev, use Stripe CLI to forward webhooks
- Returns: customer `POST /api/orders/:id/returns` → admin approve
- Shipments: admin create shipment for order

Notes
- Product lists populate `category{name,slug}` and `brand{name,slug}`.
- Deletion guards return `409 Conflict` with codes when referenced:
  - Brand: `BRAND_HAS_PRODUCTS`
  - Product: `PRODUCT_HAS_INVENTORY|PRODUCT_HAS_REVIEWS|PRODUCT_IN_ORDERS|PRODUCT_IN_SHIPMENTS`
- Idempotency: safe writes accept `Idempotency-Key` header.

Useful files
- OpenAPI builder: `src/docs/spec.js`
- Postman collection: `docs/postman_collection.json`
- DevOps notes: `docs/DEVOPS.md`
- One‑page API: `docs/API.md` (optional PDF: `npm run api:pdf`)
