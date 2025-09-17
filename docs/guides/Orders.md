# Orders Guide

## Customer Endpoints
- Create from cart: `POST /api/orders` { shippingAddress?, shipping?, taxRate? }
- List: `GET /api/orders`
- Get: `GET /api/orders/:id`
- Invoice: `GET /api/orders/:id/invoice` (redirects to PDF)
- Timeline: `GET /api/orders/:id/timeline`
- Return request: `POST /api/orders/:id/returns` { reason? }

### Cart helper
- Estimate totals for current cart: `POST /api/cart/estimate` { taxRate?, shipping? }

## Admin Endpoints
- Orders list: `GET /api/admin/orders?status=&paymentStatus=&user=&from=&to=&page=&limit=`
- Get: `GET /api/admin/orders/:id`
- Update: `PATCH /api/admin/orders/:id` { status?, paymentStatus? }
- Returns:
  - List: `GET /api/admin/returns?status=&page=&limit=`
  - Approve (refund + restock): `POST /api/admin/returns/:id/approve` (supports partial via `{ items?, amount? }`)
  - Reject: `POST /api/admin/returns/:id/reject`
 - Shipments:
  - List shipments: `GET /api/admin/shipments?order=&page=&limit=`
  - Create for order: `POST /api/admin/orders/:id/shipments`
  - Get shipment: `GET /api/admin/shipments/:id`
- Metrics: `GET /api/admin/metrics`
- Reports: sales/top-products/top-customers

## Payments
- Stripe intent: `POST /api/payments/stripe/intent` { orderId }
- Stripe webhook: `POST /api/payments/stripe/webhook`

## Invoices
- Automatically generated on order creation to `uploads/invoices/`
- Invoice number stored on order; URL available at `order.invoiceUrl`
