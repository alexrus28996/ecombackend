# Products Guide

## Endpoints
- List: `GET /api/products?q=&page=&limit=&category=`
- Get: `GET /api/products/:id`
- Create (admin): `POST /api/products`
- Update (admin): `PUT /api/products/:id`
- Delete (admin): `DELETE /api/products/:id`
- Categories:
  - List: `GET /api/categories?parent=`
  - Create/Update/Delete (admin)
  - Reorder children: `POST /api/categories/:id/reorder` { ids: [...] }
- Reviews:
  - List: `GET /api/products/:id/reviews`
  - Create/Update (auth): `POST /api/products/:id/reviews`
  - Delete (owner/admin): `DELETE /api/products/:id/reviews/:reviewId`

## Variants/SKUs
- Product supports `variants`: each may have `sku`, `attributes` (e.g., size/color), `price` or `priceDelta`, and `stock`.
- Cart operations accept `variantId` to target specific variant lines.

## Images
- Local upload (admin): `POST /api/uploads` (field `file`) → `{ url }` → store in product.images[].url
- Cloudinary (optional): `POST /api/uploads/cloudinary` (field `file`) → `{ url, publicId }`

## Bulk Ops (admin)
- Import: `POST /api/admin/products/import` { items: [ProductInput] }
- Export: `GET /api/admin/products/export?format=json|csv`
- Price update %: `POST /api/admin/products/price-bulk` { factorPercent, filter? }
- Category assign: `POST /api/admin/products/category-bulk` { categoryId, productIds }

