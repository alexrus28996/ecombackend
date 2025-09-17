# RBAC & Permissions

Roles
- Anonymous: public endpoints (health, register/login)
- Customer (authenticated): cart, orders, returns request, addresses, reviews
- Admin: all admin routes under `/api/admin/*` plus product create/update

Patterns
- All protected routes require `Authorization: Bearer <token>`
- Admin routes require role `admin` in JWT (`roles` array)
- Rate limits tighter for auth/uploads/payments; app‑wide limits under `/api`
- Idempotency: send `Idempotency-Key` for critical writes (orders, returns approve)
