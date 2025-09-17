# Brands (Admin)

Manage product brands. Products reference brands by id and product lists populate brand `{ name, slug }`.

Endpoints (Admin)
- List/Create: `GET|POST /api/admin/brands`
- Get/Update/Delete: `GET|PUT|DELETE /api/admin/brands/:id`
- References (before delete): `GET /api/admin/brands/:id/references` → `{ products }`

Notes
- Delete guard: returns `409 Conflict` with `code=BRAND_HAS_PRODUCTS` when in use.
- Migration: convert legacy string brands to Brand docs
  - `npm run migrate:brands`
