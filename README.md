# E-commerce Backend (Node.js + MongoDB)

Modular, production-grade backend using Node.js (ES Modules) and MongoDB with Mongoose. Clean structure, env-driven config, robust middleware, and core commerce flows.

## Features
- Express app with security middleware (helmet, CORS, rate-limit)
- Pino + morgan logging
- Env validation via `envalid`
- MongoDB with `mongoose`
- Auth with JWT (register, login, me)
- Catalog: products CRUD (admin)
- Cart: add/update/remove items
- Orders: create from cart, list, get
- Request validation via `zod`

## Structure
```
src/
  app.js                # Express app wiring
  server.js             # Startup entry
  config/env.js         # Env validation and loading
  db/mongo.js           # Mongo connection
  logger.js             # Pino logger factory
  middleware/           # Errors, auth, validate
  interfaces/http/routes# HTTP routers
  modules/
    users/              # User model + auth service
    catalog/            # Product model + service
    cart/               # Cart model + service
    orders/             # Order model + service
scripts/reset-admin-password.js # Optional maintenance script
.env.example            # Copy to .env and edit
```

## Setup
1. Copy env: `cp .env.example .env` and edit values.
2. Install deps: `npm install`
3. Start dev: `npm run dev`

## MongoDB Connection
- Option A (single URI with DB): set `MONGO_URI=mongodb://localhost:27017/ecombackend`
- Option B (server-only URI + DB_NAME): set `MONGO_URI=mongodb://localhost:27017/` and `DB_NAME=ecombackend`
- Docker quick start: `docker run -d --name mongo -p 27017:27017 mongo:7`

## API Overview
- `GET /health`
- Auth
  - `POST /api/auth/register` { name, email, password }
  - `POST /api/auth/login` { email, password }
  - `GET /api/auth/me` (Bearer token)
- Products
  - `GET /api/products?q=&page=&limit=`
  - `GET /api/products/:id`
  - `POST /api/products` (admin)
  - `PUT /api/products/:id` (admin)
  - `DELETE /api/products/:id` (admin)
- Cart (auth required)
  - `GET /api/cart`
  - `POST /api/cart/items` { productId, quantity }
  - `PATCH /api/cart/items/:productId` { quantity }
  - `DELETE /api/cart/items/:productId`
  - `POST /api/cart/clear`
- Orders (auth required)
  - `POST /api/orders` { shippingAddress?, shipping?, taxRate? }
  - `GET /api/orders`
  - `GET /api/orders/:id`
- Admin (auth required, role=admin)
  - `POST /api/admin/users/:id/promote`
  - `POST /api/admin/users/:id/demote`

## API Docs (Swagger)
- Swagger UI: `GET http://localhost:4001/docs`
- Raw spec: `GET http://localhost:4001/docs/openapi.json`
- Configure path with `DOCS_PATH` in `.env` (defaults to `/docs`).
  

## Admin Users
- The first user who registers becomes the admin automatically (bootstrap).
- Additional admins can be promoted by an existing admin via the Admin endpoints.

## Notes
- Uses transactions if MongoDB is a replica set, otherwise falls back safely.
- Admin endpoints require `roles` to include `admin` on the JWT.
- No hardcoded data. Runtime defaults configurable via env:
  - `API_PREFIX`, `JSON_BODY_LIMIT`, `HEALTH_PATH`
  - `DEFAULT_CURRENCY`, `API_DEFAULT_PAGE_SIZE`, `API_MAX_PAGE_SIZE`
  - `RATE_LIMIT_*`, `CORS_ORIGIN`, `LOG_LEVEL`, `TRUST_PROXY`
  
