# Returns & Refunds

Customer
- Request: `POST /api/orders/:id/returns` { reason? }

Admin
- Approve (refund + restock): `POST /api/admin/returns/:id/approve`
  - Partial supported: body `{ items?: [{ product, variant?, quantity }], amount?: number }`
- Reject: `POST /api/admin/returns/:id/reject`

Models
- `ReturnRequest` (links to `refund` when processed)
- `Refund` (provider, status, amount, providerRef)
