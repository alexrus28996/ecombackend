# Project TODO / Roadmap

This backlog lists what is NOT implemented yet, mapped to the desired architecture and feature set. Use it to plan incremental work. Items are grouped by module with suggested priorities.

Legend
- P0: highest priority; unblock core admin panel usage
- P1: important; improves product completeness
- P2: nice-to-have; polish and scale
- P4: backlog/lowest priority; defer until later

Top Priorities (Recommended Next)
- [x] P0 Auth: Refresh tokens (rotate + revoke on logout); cookie or DB-backed
- [x] P0 Users (Admin): List/search/paginate users; get by id; activate/deactivate
- [x] P0 Admin Metrics: Aggregate counts (users, products, orders by status, revenue by day)
- [x] P1 Reviews: CRUD + ratings, user-only, admin moderation
- [x] P1 Payments: Stripe basic flow (payment intent, webhook, order paid)

Next Priorities (Immediate P0)
 - [x] Returns atomicity: transactional admin approve flow (restock + order update + refund outcome)
- [x] Idempotency: orders create, returns approve, Stripe webhook (retry-safe)
 - [x] APIs/docs: update order item schema to include `variant`; refresh Postman examples
- [x] Inventory backfill: script to create missing Inventory docs; deprecate product.stock as authoritative (script added)
- [x] Category leaf enforcement on product create/update
 - [x] Critical indexes: verify inventory {product,variant,location}, reviews {product,user}, categories {parent} (present)
- [x] Tests/CI: Jest setup; unit (auth/products/cart), integration (checkout)
 - [x] Logging: pino file rotation
 - [x] Metrics: basic request + DB timing logs

Architecture & Layers
- [x] P1 Controllers layer: split request handling out of `routes/*.js`
- [x] P1 Validation files per module (Zod) instead of inline in routes
- [x] P2 Request ID + correlation logging middleware
- [x] P2 Consistent pagination util (central helper instead of ad-hoc)

Entity Model & Relationships (Proposed)
- Users: has many `Addresses`, `Carts`, `Orders`, `Reviews`, `ReturnRequests`, `RefreshTokens`; referenced by `AuditLog`, `OrderTimeline`.
- Addresses: belongs to `User`; types: shipping|billing; used by `Order` snapshots.
- Brands: has many `Products`.
- Categories: hierarchical (parent -> children); `Products` reference a leaf category.
- Products: belongs to `Brand` (optional) and `Category`; has many embedded `Variants` and `Media`.
- Attributes/Options: describe variant axes (e.g., size, color); used to generate `Variants`.
- Inventory: per `{product, variant, location}` record; `InventoryAdjustment` history per change.
- Carts: belongs to `User`; embeds `CartItems` (product + variant snapshot); optional `Coupon`.
- Orders: belongs to `User`; embeds `OrderItems` (product + variant snapshot); has many `OrderTimeline` entries; linked `PaymentTransactions`, `Shipments`, `ReturnRequests`.
- PaymentTransactions: belongs to `Order`; provider, amount, status; has many `Refunds`.
- Refunds: belongs to `PaymentTransaction` and `Order`; amount, reason, providerRef.
- Shipments: belongs to `Order`; provider, tracking, address; has many `ShipmentItems` (orderItem refs).
- ReturnRequests: belongs to `Order` and `User`; statuses requested|approved|rejected|refunded.
- Reviews: belongs to `Product` and `User` (unique pair); optional verifiedPurchase.
- Coupons/Promotions: conditions (minSubtotal, category/product filters), usages, expiration.
- Media: assets (images) tied to `Product` or `Review`.

Data Model & Relationships
- [x] P0 Product must reference an existing Category on create (validated + enforced)
- [x] P0 Add `variantId` and variant price snapshot to Order items; propagate through services
- [x] P0 Prevent Category delete when Products reference it (enforce in service)
- [x] P0 Make `adjustStock` session-aware and join order transactions (atomic updates)
- [x] P0 Treat Inventory as the source of truth; migrate/deprecate `product.stock` and keep in sync
- [x] P0 Backfill Inventory docs for existing products/variants where missing
 - [x] P0 Referential integrity validations across services (user/product/category/order existence)
- [x] P0 Indexes: Products `{ category, slug }`, text index `name,description`; Orders `{ user, createdAt }`
- [x] P0 Indexes: Orders `{ user, createdAt }`
- [x] P0 API alignment: include `variant` on cart/order items (docs), populate `category` on product GETs (projection-safe); refresh Postman examples

Backlog by Domain (Relationships-first)

Users & Addresses
- [x] P0 Address book model (userId, type shipping|billing, defaults)
- [x] P0 Orders: snapshot billingAddress in addition to shippingAddress

Catalog
- [x] P1 Brand model + CRUD; product.brand reference; index brand
- [ ] P1 Attribute/Option config per product; variant matrix generation
- [x] P1 Enforce category leaf assignment (disallow non-leaf if using deep trees)
- [x] P1 Product text index on name/description; slug uniqueness guard

Inventory & Warehousing
- [x] P0 `adjustStock` accepts session; order/return flows pass session
- [ ] P1 Reservation records on order creation; release on cancel/timeout
- [ ] P2 Multi-location stock (warehouses); location-aware picks

Cart & Checkout
- [x] P0 Cart items carry variantId; validate availability per variant
- [ ] P1 Shipping/tax estimation endpoint for cart

Orders, Payments, Fulfillment
- [x] P0 Add `PaymentTransaction` model (orderId, provider, status, amounts, providerRef)
- [x] P0 Add `Refund` model; admin returns approval records refundId; store amounts
- [x] P0 Add `Shipment` model (orderId, address snapshot, carrier, tracking) + `ShipmentItem`
- [x] P0 Order items include variantId and variant-level price; persist couponCode, tax/shipping breakdown
- [ ] P1 Admin: partial refunds/returns at line-item level

Promotions
- [ ] P1 Coupon targeting (include/exclude categories/products); usage limits per user/global

Reviews
- [x] P2 Verified purchase flag (tie review to order item)
- [ ] P2 Votes/helpfulness; moderation flags

APIs & Docs
- [x] P0 Update OpenAPI + Postman for: addresses, transactions, refunds, shipments
- [x] P0 Update OpenAPI + Postman for: brand, attributes
- [x] P0 Expose admin endpoints for new models with RBAC
- [x] P1 Add populate options for product.brand in GET endpoints (category populated)


- [x] P1 Products indexes added: category, slug(unique), text(name,description)

Pricing & Currency
- [ ] P1 Multi-currency pricing with FX rate table and rounding rules
- [ ] P1 Regional price lists (price books) and customer-specific price overrides
- [ ] P1 Tax-inclusive vs tax-exclusive pricing modes per region
- [ ] P2 Tiered/volume pricing and time-bound price overrides (sales)

Tax & Compliance
- [ ] P1 Tax zones and rate tables (country/state) with exemption handling (VAT ID/GST)
- [ ] P1 Invoice numbering per locale; optional e-invoicing hooks
- [ ] P2 Export restrictions/compliance flags on products

Shipping & Logistics
- [ ] P1 Shipping zones and carrier rate tables (weight/dimensions-based)
- [ ] P1 Shipment creation and label purchase provider hooks (plugin interface)
- [ ] P2 Return labels workflow and drop-shipping support
- [ ] P2 Packaging dimensions, dimensional weight calc, and packing suggestions

Catalog Extensions
- [ ] P1 Bundles/Kits (composed SKUs) with stock deductions across components
- [ ] P1 Configurable products (option matrices) with rules (e.g., invalid combinations)
- [ ] P1 Digital/downloadable products with license key delivery
- [ ] P2 Subscriptions/recurring products (billing hooks only)

Customer Experience
- [ ] P2 Wishlist per user; saved carts; recently viewed products
- [ ] P2 Product Q&A and back-in-stock notifications

B2B / Organizations
- [ ] P1 Organization accounts with member roles and approvals
- [ ] P1 Purchase Orders (PO) workflow and limits; quotes/approvals
- [ ] P1 Negotiated price lists per organization/customer segment

Search & Discovery
- [ ] P1 Search index (Elasticsearch/Meilisearch) with synonyms and typo tolerance
- [ ] P1 Faceted search (category, price, attributes); result boosting by sales/ratings/stock
- [ ] P2 Suggestions/autocomplete and trending searches

Marketing & Promotions
- [ ] P1 Rule-based promotions (conditions/actions) beyond coupons (e.g., buy X get Y)
- [ ] P1 Email template system for transactional messages (order, shipment, refund)
- [ ] P2 Campaign tracking (UTM) and integration hooks for ESP/CDP

Analytics & Events
- [ ] P1 Event log (order created, paid, shipped; refund; return) with retention policy
- [ ] P1 Outbound webhooks and webhook subscriptions with secret signing + retries
- [ ] P2 Data export (S3/CSV) and BI-friendly schemas

External Integrations
- [ ] P1 Plugin interface for payments, shipping, tax, search; provider registry
- [ ] P2 Admin UI hooks for provider configuration metadata

Data Governance & Security
- [ ] P1 Encrypt sensitive PII at rest (addresses, tokens) with key rotation strategy
- [ ] P1 Soft-delete patterns and audit retention policies
- [ ] P2 GDPR requests (export/delete) and consent tracking

Reliability & Ops
- [x] P1 Idempotency for write endpoints (orders, returns, payments); retry-safe processing
- [ ] P1 Observability: request metrics, error rates, background job health endpoints
- [ ] P2 Fine-grained rate limits per route group and user role

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
 - [x] P1 Expanded product/variant fields (SEO, pricing, shipping, identifiers)
 - [ ] P1 Product metadata: brand, tags, SEO fields (title/description)
  - [x] P1 Indexes: text index on name/description; index on category
 - [ ] P1 SKU hygiene: ensure variant.sku unique per product; optional product-level SKU
 - [x] P1 Inventory authority: services rely on Inventory as source of truth
 - [x] P1 Validation cleanup: remove product/variant stock from API payloads
 - [ ] P2 Cleanup: remove or auto-sync product/variant stock fields in model; provide migration


Categories Module
- [x] P1 Hierarchical categories (parent/child) and breadcrumbs (basic parent/child)
- [x] P2 Reordering/sorting support; slug auto-generation
 - [x] P1 Expanded category fields (media, SEO, path/fullSlug)
 - [ ] P2 Ancestor path cache (for fast breadcrumbs) and fullSlug
  - [x] P2 Prevent delete when products exist under category (enforce referential integrity)
 - [ ] P2 Slug uniqueness per parent (allow same slug under different branches)


Inventory Module
- [x] P1 Separate Inventory model (per-SKU stock)
- [x] P1 Stock adjustments with movement log (reason, qty, user, timestamp)
- [x] P2 Warehouses/locations; low-stock alerts
 - [ ] P1 Stock reservations/allocations on order placement; release on cancel/expiry
- [x] P1 Ensure adjustStock participates in order DB transaction/session (atomicity)

Cart Module
- [x] P2 Coupons/discount codes integration
- [x] P2 Shipping/tax calculators (configurable rules)
 - [ ] P2 Shipping/tax estimation preview on cart (pre-checkout)


Orders Module
- [x] P1 Admin list/search all orders; get by id; update status/paymentStatus
- [x] P1 Invoices (PDF) and email on order placement
- [x] P1 Returns/Refunds workflow (RMA), link to payments
- [x] P2 Order timeline/audit trail entries
 - [x] P1 Capture variant on order items; persist price snapshot per variant
 - [x] P1 Billing address support; store couponCode and tax/shipping breakdowns
 - [ ] P2 Partial refunds/returns (line-level quantities)
 - [ ] P2 Persist refund references/ids per payment provider


Payments Module (Not need only one is suffient)
- [x] P1 Stripe: create intent endpoint, webhook verification, mark order paid
- [ ] P4 Razorpay: order creation + webhook
- [ ] P4 PayPal: capture flow + webhook
- [ ] P4 Payment methods on order, idempotency keys, retries

Reviews Module 
- [x] P1 Reviews model + endpoints (create/list by product)
- [x] P1 Rating aggregation on product (avg, count)
- [x] P1 Admin moderation (approve/hide)
 - [x] P2 Verified purchase flag on reviews
 - [ ] P2 Helpful votes/abuse reporting; optional review media (images)

Admin Module
- [x] P0 Metrics/dashboard endpoint(s) with key KPIs
- [x] P1 Reports: sales by day/week/month; top products; customers
- [x] P1 Bulk operations: product price update %, category assign, export orders/products
 - [ ] P2 Granular roles (support, catalog, finance) via RBAC

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
- [x] P1 Add admin categories endpoints to OpenAPI + Postman
- [x] P2 Developer guides per module (Auth, Products, Orders)

Tests
- [x] P1 Test setup (Jest)
- [x] P1 Unit tests: auth (register/login)
- [x] P1 Unit tests: products CRUD
- [x] P1 Unit tests: cart logic
- [x] P1 Integration tests: checkout flow (cart -> order)
- [x] P1 CI config (GitHub Actions)

Security & Observability
- [x] P1 CSP/Helmet tuning, CORS per environment
- [x] P1 Rate limit tuning per route group (auth vs general)
- [ ] P1 Structured logs to files or transport; log rotation
- [ ] P2 ELK/Grafana integration; health metrics endpoint

Hardening / Follow-ups
- [x] P1 Returns: transactional approval flow (refund + restock + status) with proper error handling on refund failures
 - [ ] P2 Data integrity checks: background jobs to fix orphans/missing inventory records

Users Module (Enhancements)
- [ ] P2 Address book: multiple addresses with defaults (shipping/billing); phone number

- DevOps
- [x] P1 Dockerfile + docker-compose (API + Mongo)
- [x] P1 Environment docs for payments/webhooks (tunnel in dev)
- [x] P2 Production config examples (PM2, reverse proxy)

Notes
- Current implemented scope: Auth (basic), Users (model), Products (CRUD), Categories, Cart, Orders (basic), Admin (promote/demote), Swagger + API docs.
- This file tracks missing features only; see `docs/API.md` and Swagger for implemented endpoints.
