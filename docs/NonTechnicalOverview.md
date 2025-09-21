# Store Walkthrough (Non-Technical)

This guide explains the project in plain language for stakeholders who are **not** engineers. Follow the journey below to understand what each part of the platform does.

## 1. Access & Accounts

1. Open the website and choose **Sign Up** to create your shopper account. The first person who signs up becomes the store administrator automatically so that someone can configure the catalog.
2. Use **Log In** whenever you return. After login you stay signed in until you log out.
3. If you forget your password, use **Forgot Password** and follow the email link to set a new one.

## 2. Shopper Experience (Customer Panel)

1. **Browse products** using categories, search, and filters (brand, price, etc.).
2. Click a product to view detailed information, photos, available sizes or variants, customer reviews, and stock status.
3. Choose options (size, color) if needed, then click **Add to Cart**. The cart shows quantity, subtotal, taxes, discounts, and total.
4. Visit the **Cart** page to update quantities, remove items, apply coupons, or clear the entire cart.
5. Press **Checkout** to confirm shipping and billing addresses, select a delivery option, and confirm taxes and totals.
6. Provide payment details (Stripe in development) and place the order. You receive an order number and confirmation email.
7. Track your orders from **My Orders**. You can view order history, see statuses (processing, fulfilled, delivered), cancel unshipped orders, and request returns.
8. To return items, open the order, choose the products to return, add notes if necessary, and submit the return request for review.

## 3. Administrator Experience (Admin Panel)

1. Sign in with an account that has the **admin** role (the first registered user or one promoted by an existing admin).
2. Use the **Dashboard** for high-level metrics: total sales, top products, and recent orders.
3. Manage the catalog:
   - Create categories and subcategories to keep the storefront organized.
   - Add or edit products with descriptions, images, prices, and variations.
   - Adjust inventory manually (restock, damage, transfers) and review low-stock alerts.
4. Oversee orders:
   - Inspect new orders, update their status, and add tracking numbers.
   - Approve or decline return requests and trigger refunds if required.
5. Control customers and staff:
   - View the customer list, deactivate accounts, or promote trusted staff to administrators.
   - Manage coupons, promotions, and reports to support marketing decisions.
6. Review analytics and exports for finance or leadership teams.

## 4. Support & Operations

- **Emails**: The system can send transactional emails (order confirmations, password resets, low-stock alerts) through the mailer utility.
- **Background workers**: Automated jobs handle reservation cleanup, unpaid order cancellations, and low-stock reminders.
- **Health checks**: `/health` tells operators whether the API is online.

## 5. Where To Find More Details

- Technical teams should use the full API reference at `docs/API.md` or the interactive Swagger UI at `/docs`.
- Deployment and infrastructure steps live in `docs/DEVOPS.md`.
- The Postman collection (`docs/postman_collection.json`) is ready for testing and demos.

This document is safe to share with clients, sales, support agents, or executives so they can understand how the platform works without reading source code.
