# Payments (Stripe)

Customer flow
- Create order from cart → `POST /api/orders`
- Create PaymentIntent → `POST /api/payments/stripe/intent` { orderId }
- Confirm on frontend using Stripe.js with returned `clientSecret`
- Webhook updates → `POST /api/payments/stripe/webhook` (raw JSON)

Admin/Models
- Transactions: created on success (`PaymentTransaction`)
- Refunds: created on returns approval (`Refund`), supports partial amount

Config
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Dev tunnel: `stripe listen --forward-to localhost:4001/api/payments/stripe/webhook`
