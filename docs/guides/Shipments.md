# Shipments (Admin)

Endpoints (admin)
- List: `GET /api/admin/shipments?order=&page=&limit=`
- Create for order: `POST /api/admin/orders/:id/shipments` { carrier?, tracking?, service?, items?[] }
- Get: `GET /api/admin/shipments/:id`
- List for order: `GET /api/admin/orders/:id/shipments`

Model
- `Shipment` with `address` snapshot and `items[{ product, variant?, quantity }]`
