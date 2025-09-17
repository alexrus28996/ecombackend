# Architecture & Relationships

Modules
- Users & Auth: registration, JWT auth, refresh tokens, preferences
- Catalog: Products, Categories (tree), Brands
- Inventory: Inventory (SoT), Adjustments, Reservations
- Cart: per‑user active cart (items snapshot), coupons
- Orders: order snapshot, addresses, invoices, timeline
- Payments: Stripe intents, events (PaymentTransaction), Refunds
- Returns: ReturnRequest (customer) → admin approval → refund + restock
- Shipments: snapshot of shipping address + items (admin)
- Addresses: address book per user, defaults by type
- Admin: reporting, metrics, bulk ops, reference checks

Relationships (core)
- Product → Category (ref)
- Product → Brand (ref)
- Inventory → Product (+ optional Variant)
- CartItem → Product (+ optional Variant)
- Order.items[] → Product (+ optional Variant)
- PaymentTransaction → Order
- Refund → Order (+ optional PaymentTransaction)
- ReturnRequest → Order, User, (links to Refund on approval)
- Shipment → Order (snapshot of address + items)
- Review → Product, User (unique pair)
- Address → User (default per type)

Data flow highlights
- Inventory SoT: all stock lives in `Inventory`; `Adjustments` track movement
- Reservations: created on order, consumed on payment, released on auto‑cancel
- Order creation: validates stock per variant, decrements inventory, snapshots items
- Payments: webhook marks order paid, records `PaymentTransaction`
- Returns: admin approval tries provider refund first (Stripe), then restocks in DB txn
- Shipments: do not mutate inventory; they snapshot current order items for fulfillment

Constraints
- Leaf category enforced on product create/update
- Delete guards:
  - Brand cannot delete when products reference it (409)
  - Product cannot delete when inventory/reviews/orders/shipments reference it (409)
- Cart item stock checks are variant‑aware
- Returns only allowed for paid orders; partial quantity/amount supported (admin)
- Idempotent writes supported via `Idempotency-Key` header
- Rate limits per route group (auth/uploads/payments) and app‑wide

Useful code pointers
- Models: `src/modules/**/model.js`
- Services: `src/modules/**/service.js`
- HTTP: `src/interfaces/http/{routes,controllers,validation}`
- Docs: `src/docs/spec.js` (OpenAPI), `docs/postman_collection.json`
