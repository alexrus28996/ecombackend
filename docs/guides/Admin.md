# Admin Overview

Key areas
- Users: list/update/promote/demote
- Orders: list/get/update, returns approve/reject (partial supported), shipments CRUD
- Inventory: adjustments/list, low stock
- Products: import/export, bulk price/category, variants‑matrix helper
- Brands: CRUD, references before delete
- Coupons: CRUD with targeting/limits
- Reports & Metrics: sales/top‑products/top‑customers, `GET /api/admin/metrics`

References endpoints (safe delete UX)
- Product: `GET /api/admin/products/:id/references` → `{ inventory, reviews, orders, shipments }`
- Brand: `GET /api/admin/brands/:id/references` → `{ products }`
