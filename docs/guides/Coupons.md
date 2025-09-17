# Coupons & Promotions

Endpoints (admin)
- `GET|POST /api/admin/coupons`
- `GET|PUT|DELETE /api/admin/coupons/:id`

Model fields
- `type`: percent|fixed, `value`
- `minSubtotal`, `expiresAt`, `isActive`
- Targeting: `includeCategories`, `excludeCategories`, `includeProducts`, `excludeProducts`
- Limits: `perUserLimit`, `globalLimit`

Cart behavior
- Apply: `POST /api/cart/coupon` { code }
- Remove: `DELETE /api/cart/coupon`
- Validation considers subtotal, expiry, targeting and usage limits.
