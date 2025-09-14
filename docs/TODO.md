# Project TODO / Roadmap

This backlog lists what is NOT implemented yet, mapped to the desired architecture and feature set. Use it to plan incremental work. Items are grouped by module with suggested priorities.

Legend
- P0: highest priority; unblock core admin panel usage
- P1: important; improves product completeness
- P2: nice-to-have; polish and scale

Top Priorities (Recommended Next)
- [x] P0 Auth: Refresh tokens (rotate + revoke on logout); cookie or DB-backed
- [x] P0 Users (Admin): List/search/paginate users; get by id; activate/deactivate
- [x] P0 Admin Metrics: Aggregate counts (users, products, orders by status, revenue by day)
- [x] P1 Reviews: CRUD + ratings, user-only, admin moderation
- [x] P1 Payments: Stripe basic flow (payment intent, webhook, order paid)

Architecture & Layers
- [x] P1 Controllers layer: split request handling out of `routes/*.js`
- [x] P1 Validation files per module (Zod) instead of inline in routes
- [x] P2 Request ID + correlation logging middleware
- [x] P2 Consistent pagination util (central helper instead of ad-hoc)

Auth Module
- [x] P0 Refresh tokens (httpOnly cookie or DB); rotate & invalidate
- [x] P1 Password reset (request + token + reset); email delivery (dev logs)
- [x] P1 Email verification
 - [x] P2 Account lockout / throttling on failed login attempts

Users Module
- [x] P0 Admin endpoints: list/search/paginate users, get by id
- [x] P0 Activate/deactivate user (toggle `isActive`)
- [x] P1 User self profile update (name, password change)
- [x] P1 Email change with re-verification
- [x] P2 Preferences (locale, notifications)

Products Module
- [x] P1 Product variants/SKUs (size/color/fit with distinct stock & price deltas)
- [x] P1 Image upload support (local endpoint; can swap to Cloudinary/S3)
- [x] P2 Bulk import/export (CSV/JSON) for products


Categories Module
- [x] P1 Hierarchical categories (parent/child) and breadcrumbs (basic parent/child)
- [x] P2 Reordering/sorting support; slug auto-generation


Inventory Module
- [x] P1 Separate Inventory model (per-SKU stock)
- [x] P1 Stock adjustments with movement log (reason, qty, user, timestamp)
- [x] P2 Warehouses/locations; low-stock alerts

Cart Module
- [x] P2 Coupons/discount codes integration
- [x] P2 Shipping/tax calculators (configurable rules)


Orders Module
- [x] P1 Admin list/search all orders; get by id; update status/paymentStatus
- [x] P1 Invoices (PDF) and email on order placement
- [x] P1 Returns/Refunds workflow (RMA), link to payments
- [x] P2 Order timeline/audit trail entries


Payments Module (Not need only one is suffient)
- [x] P1 Stripe: create intent endpoint, webhook verification, mark order paid
- [ ] P1 Razorpay: order creation + webhook
- [ ] P1 PayPal: capture flow + webhook
- [ ] P2 Payment methods on order, idempotency keys, retries

Reviews Module
- [x] P1 Reviews model + endpoints (create/list by product)
- [x] P1 Rating aggregation on product (avg, count)
- [x] P1 Admin moderation (approve/hide)

Admin Module
- [x] P0 Metrics/dashboard endpoint(s) with key KPIs
- [x] P1 Reports: sales by day/week/month; top products; customers
- [x] P1 Bulk operations: product price update %, category assign, export orders/products

Middlewares
- [x] P1 RBAC helpers for multi-role policies beyond admin/customer
- [x] P2 Audit log middleware for sensitive actions (who/when/what)

- Utils
- [x] P1 `email.js` (Nodemailer or SES) with templating (dev logger)
- [x] P1 `jwt.js` helper (sign/verify/access)
- [x] P1 `pagination.js` helper returning `{ items, total, page, pages }`
 - [x] P2 `cloudinary.js` (or S3) for uploads

Jobs / Queues
- [x] P1 orderCleanup job (auto-cancel stale unpaid orders)
- [x] P1 queue integration (BullMQ + Redis) for async tasks
- [ ] P2 sendNewsletter job (campaign example)

Seeders
- [ ] P2 Optional seeders (products/users) via separate script when needed

- Docs
- [x] P1 Postman collection export
- [ ] P1 Add admin categories endpoints to OpenAPI + Postman
- [x] P2 Developer guides per module (Auth, Products, Orders)

Tests
- [ ] P1 Test setup (Jest) + CI config
- [ ] P1 Unit tests: auth (register/login), products CRUD, cart logic
- [ ] P1 Integration tests: checkout flow (cart -> order)

Security & Observability
- [x] P1 CSP/Helmet tuning, CORS per environment
- [x] P1 Rate limit tuning per route group (auth vs general)
- [ ] P1 Structured logs to files or transport; log rotation
- [ ] P2 ELK/Grafana integration; health metrics endpoint

Hardening / Follow-ups
- [ ] P1 Returns: transactional approval flow (refund + restock + status) with proper error handling on refund failures

- DevOps
- [x] P1 Dockerfile + docker-compose (API + Mongo)
- [x] P1 Environment docs for payments/webhooks (tunnel in dev)
- [x] P2 Production config examples (PM2, reverse proxy)

Notes
- Current implemented scope: Auth (basic), Users (model), Products (CRUD), Categories, Cart, Orders (basic), Admin (promote/demote), Swagger + API docs.
- This file tracks missing features only; see `docs/API.md` and Swagger for implemented endpoints.
