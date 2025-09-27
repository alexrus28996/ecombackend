# Project Roadmap & TODOs

This checklist focuses on gaps that remain in the current codebase after aligning the HTTP surface with the working services.

## 1. Missing Features
- **Inventory locations & transfers UI**: expose the existing `modules/inventory` routes for locations, transfers, and stock queries over HTTP so admins can configure warehouses from the dashboard.
- **Payment capture & refunds UX**: add customer-facing endpoints to view payment transactions and refunds instead of exposing them only under `/api/admin`.
- **Customer returns workflow**: build endpoints for customers to supply line-level return quantities and preferred restock location when requesting a return (admin flow already supports it).
- **Brand-specific permissions**: introduce permission flags for brand CRUD to remove the hard-coded `ADMIN` role dependency.
- **Product assets**: implement bulk image management (reorder/delete) and associate image metadata per variant.
- **Notification hooks**: surface email/webhook events for order status changes beyond Stripe success (packed, shipped, refunded).

## 2. Quality & Reliability Improvements
- **Inventory reservation guards**: Replace the `session instanceof mongoose.ClientSession` checks with a safe detection so order placement, admin cancellations, and Stripe webhooks stop throwing (see `src/modules/inventory/reservation.service.js:40`, `:88`, `:112`).
- **Review aggregation fix**: Update `recomputeProductRating` to avoid the `Product.castObjectId` call at `src/modules/reviews/review.service.js:61` that currently breaks review create/update/delete paths.
- **HTTP integration tests**: add Jest/Supertest coverage for the new `/api/products`, `/api/categories`, and `/api/orders` routers to prevent regressions.
- **Validation coverage**: tighten Zod schemas (e.g., ensure variant attributes match defined attribute options and enforce minimum image requirements on product creation).
- **Error normalization**: migrate remaining manual `res.status(...).json({ error })` patterns (uploads, permissions) to use the central `errors` helpers for consistency.
- **Permission-aware docs**: generate OpenAPI definitions from the updated routers to keep `docs/API.md` and Swagger UI synchronized.
- **Rate limiting**: review and tune per-route rate limits now that write endpoints are consolidated (cart, orders, uploads, Stripe webhook).

## 3. Next Extensions
- **Additional payment providers**: add adapters for PayPal or manual bank transfer alongside Stripe, reusing the payment transaction model.
- **Catalog discovery**: integrate search indexing (Meilisearch/Elastic) and expose filtering facets on `/api/products`.
- **Customer engagement**: add wishlists or back-in-stock subscriptions tied to the inventory reservation service.
- **Reviews moderation tools**: extend admin endpoints with bulk approve/hide and reporting metrics.
- **Analytics exports**: provide scheduled CSV/Parquet exports for orders/payments using the existing report aggregations as a base.
