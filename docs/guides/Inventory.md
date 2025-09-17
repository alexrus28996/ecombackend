# Inventory & Reservations

Source of Truth
- All stock lives in `Inventory` (`{ product, variant, location, qty }`). Product/variant `stock` fields are deprecated.

Adjustments
- Admin: `POST /api/admin/inventory/adjustments` { productId, variantId?, qtyChange, reason }
- List: `GET /api/admin/inventory/adjustments`

Reservations (audit trail)
- Created on order placement; marked `consumed` on payment, `released` on auto‑cancel.

Low stock
- Admin report: `GET /api/admin/inventory/low`
