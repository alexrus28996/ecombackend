# Model Reference

Consolidated list of Mongoose models with their fields and notable metadata.

## Users

### User (`src/modules/users/user.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| name | String | required; trimmed |
| email | String | required; unique; stored lowercase |
| password | String | required; excluded from default queries |
| roles | [String] | defaults to customer role |
| permissions | [String] | default `[]`; indexed for permissions checks |
| isActive | Boolean | default `true` |
| isVerified | Boolean | default `false` |
| failedLoginAttempts | Number | default `0` |
| lockUntil | Date | lock expiry timestamp |
| preferences | Object | holds `locale` (default `en`) and `notifications.email|sms|push` booleans |

- timestamps on create/update
- pre-save hook hashes passwords; instance method `comparePassword`

### Address (`src/modules/users/address.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| user | ObjectId ? User | required; indexed |
| type | String | required; enum `shipping` or `billing` |
| fullName | String | recipient name |
| line1 | String | address line 1 |
| line2 | String | address line 2 |
| city | String | city or locality |
| state | String | state or region |
| postalCode | String | postal or ZIP code |
| country | String | ISO country name/code |
| phone | String | contact number |
| label | String | friendly display label |
| isDefault | Boolean | default `false`; limited to one per user/type |

- timestamps enabled
- partial unique index enforces single default address per type

### RefreshToken (`src/modules/users/refresh-token.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| user | ObjectId ? User | required; indexed |
| tokenHash | String | required; unique hash |
| createdByIp | String | origin IP |
| revokedAt | Date | null if active |
| revokedByIp | String | IP that revoked token |
| replacedByToken | String | successor token reference |
| expiresAt | Date | required expiration |

- timestamps enabled
- virtuals `isExpired` and `isActive` expose status

### PasswordResetToken (`src/modules/users/password-reset-token.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| user | ObjectId ? User | required; indexed |
| tokenHash | String | required; unique hash |
| expiresAt | Date | required expiration |
| usedAt | Date | populated on redemption |

- timestamps enabled
- virtuals `isExpired` and `isActive` expose status

### EmailToken (`src/modules/users/email-token.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| user | ObjectId ? User | required; indexed |
| tokenHash | String | required; unique hash |
| newEmail | String | pending email address |
| expiresAt | Date | required expiration |
| usedAt | Date | populated on completion |

- timestamps enabled
- virtuals `isExpired` and `isActive` expose status

## Audit

### AuditLog (`src/modules/audit/audit.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| user | ObjectId ? User | optional actor |
| method | String | required HTTP verb |
| path | String | required request path |
| status | Number | response status code |
| ip | String | request IP |
| requestId | String | correlation identifier |
| query | Mixed | captured query params |
| params | Mixed | captured route params |
| body | Mixed | captured request body |
| meta | Mixed | additional context |

- timestamps enabled

## Catalog

### Brand (`src/modules/catalog/brand.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| name | String | required; trimmed; unique |
| slug | String | required; trimmed; unique; auto-slugified |
| logo | String | brand asset URL |
| description | String | optional copy |
| isActive | Boolean | default `true` |

- timestamps enabled
- pre-validation slug normalization keeps unique lowercase slugs

### Category (`src/modules/catalog/category.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| name | String | required; trimmed; unique while active |
| slug | String | required; trimmed; unique while active |
| description | String | category copy |
| parent | ObjectId ? Category | optional parent; indexed |
| sortOrder | Number | default `0`; indexed for ordering |
| isActive | Boolean | default `true`; kept in sync with `status` |
| status | String | enum `active`/`inactive`; default `active`; indexed |
| image | Object | `{ url, alt }` image data |
| banner | Object | `{ url, alt }` banner asset |
| icon | String | icon identifier |
| fullSlug | String | hierarchical slug string |
| path | [ObjectId] ? Category | ancestry chain |
| metaTitle | String | SEO title |
| metaDescription | String | SEO description |
| metaKeywords | [String] | SEO keywords |
| attributes | Map<String> | arbitrary key/value pairs |
| deletedAt | Date | soft-delete marker |

- timestamps enabled
- slug/name unique indexes exclude soft-deleted records
- validation hook syncs `status` and `isActive`

### Product (`src/modules/catalog/product.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| name | String | required; trimmed |
| slug | String | unique; generated from name when missing |
| description | String | short description |
| longDescription | String | detailed HTML/markdown |
| price | Number | required; min `0` |
| compareAtPrice | Number | min `0` |
| costPrice | Number | min `0` |
| currency | String | defaults to `config.DEFAULT_CURRENCY` |
| images | [Object] | default `[]`; each `{ url (required), alt }` |
| attributes | Map<String> | product attribute map |
| category | ObjectId ? Category | optional |
| brand | ObjectId ? Brand | optional; alias `brandId` |
| vendor | String | trimmed vendor name |
| sku | String | stock keeping unit |
| barcode | String | GTIN/barcode |
| mpn | String | manufacturer part number |
| taxClass | String | tax classification id |
| tags | [String] | merchandising tags |
| ratingAvg | Number | default `0` |
| ratingCount | Number | default `0` |
| requiresShipping | Boolean | default `true` |
| weight | Number | shipping weight |
| weightUnit | String | default `kg` |
| dimensions | Object | `{ length, width, height, unit (default `cm`) }` |
| isActive | Boolean | default `true` |
| metaTitle | String | SEO title |
| metaDescription | String | SEO description |
| metaKeywords | [String] | SEO keywords |

- timestamps enabled
- pre-save hook slugifies names
- indexes on `category` and text index across `name`/`description`

### ProductAttribute (`src/modules/catalog/product-attribute.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| product | ObjectId ? Product | required; indexed |
| name | String | required; trimmed |
| slug | String | required; trimmed; auto-slugified |
| description | String | attribute description |
| sortOrder | Number | default `0` |
| isRequired | Boolean | default `true` |

- timestamps enabled
- unique indexes on `{ product, slug }` and `{ product, name }`

### ProductOption (`src/modules/catalog/product-option.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| product | ObjectId ? Product | required; indexed |
| attribute | ObjectId ? ProductAttribute | required; indexed |
| name | String | required; trimmed |
| slug | String | required; trimmed; auto-slugified |
| sortOrder | Number | default `0` |
| metadata | Map<String> | arbitrary option metadata |

- timestamps enabled
- unique indexes on `{ attribute, slug }` and `{ attribute, name }`

### ProductVariant (`src/modules/catalog/product-variant.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| product | ObjectId ? Product | required; indexed |
| sku | String | required; trimmed |
| combinationKey | String | required; indexed unique per product |
| selections | [Object] | default `[]`; each `{ attribute, option }` |
| priceOverride | Number | overrides base price; min `0` |
| priceDelta | Number | price difference from base |
| stock | Number | default `0`; min `0` |
| barcode | String | variant barcode |
| isActive | Boolean | default `true` |

- timestamps enabled
- unique indexes for `{ product, sku }` and `{ product, combinationKey }`

## Reviews

### Review (`src/modules/reviews/review.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| product | ObjectId ? Product | required; indexed |
| user | ObjectId ? User | required; indexed |
| rating | Number | required; min `1`; max `5` |
| comment | String | review text |
| isApproved | Boolean | default `true` |
| verifiedPurchase | Boolean | default `false` |

- timestamps enabled
- unique composite index prevents duplicate reviews per user/product

## Cart

### Cart (`src/modules/cart/cart.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| user | ObjectId ? User | required; indexed |
| items | [Object] | default `[]`; each stores product snapshot `{ product, variant, sku, attributes, name, price, currency, quantity }` |
| subtotal | Number | default `0` |
| discount | Number | default `0` |
| couponCode | String | applied coupon code |
| coupon | ObjectId ? Coupon | reference to applied coupon |
| total | Number | default `0` |
| currency | String | defaults to `config.DEFAULT_CURRENCY` |
| status | String | enum from `CART_STATUS`; default active |

- timestamps enabled
- instance method `recalculate` recomputes subtotal

## Payments

### PaymentEvent (`src/modules/payments/payment-event.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| provider | String | required payment provider |
| eventId | String | required provider event id |
| type | String | event type |
| order | ObjectId ? Order | optional related order |
| receivedAt | Date | defaults to `Date.now` |

- timestamps disabled
- unique index on `{ provider, eventId }`

### PaymentTransaction (`src/modules/payments/payment-transaction.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| order | ObjectId ? Order | required; indexed |
| provider | String | required payment provider |
| status | String | enum `pending`, `succeeded`, `failed`, `refunded`; default `pending`; indexed |
| amount | Number | required amount |
| currency | String | default `USD` |
| providerRef | String | provider reference; indexed |
| raw | Mixed | provider payload |

- timestamps enabled
- index on `{ order, createdAt }` for history tracking

### Refund (`src/modules/payments/refund.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| order | ObjectId ? Order | required; indexed |
| transaction | ObjectId ? PaymentTransaction | related charge |
| provider | String | payment provider |
| status | String | enum `pending`, `succeeded`, `failed`; default `pending`; indexed |
| amount | Number | required refund amount |
| currency | String | default `USD` |
| reason | String | refund reason |
| providerRef | String | provider reference |
| raw | Mixed | provider payload |

- timestamps enabled
- index on `{ order, createdAt }` simplifies chronological lookups

## Pricing

### CurrencyRate (`src/modules/pricing/currency-rate.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| baseCurrency | String | required; uppercase; trimmed |
| currency | String | required; uppercase; trimmed |
| rate | Number | required conversion rate; min `0` |
| source | String | origin of rate |
| metadata | Map<Mixed> | supplemental data |

- timestamps enabled
- unique index on `{ baseCurrency, currency }`

## Coupons

### Coupon (`src/modules/coupons/coupon.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| code | String | required; unique; uppercase; trimmed |
| description | String | coupon description |
| type | String | required; enum `percent` or `fixed` |
| value | Number | required; min `0` |
| minSubtotal | Number | default `0` |
| expiresAt | Date | expiration timestamp |
| isActive | Boolean | default `true` |
| includeCategories | [ObjectId] ? Category | default `[]` |
| excludeCategories | [ObjectId] ? Category | default `[]` |
| includeProducts | [ObjectId] ? Product | default `[]` |
| excludeProducts | [ObjectId] ? Product | default `[]` |
| perUserLimit | Number | default `0` (no limit) |
| globalLimit | Number | default `0` (no limit) |

- timestamps enabled

## Inventory

### Reservation (`src/modules/inventory/reservation.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| orderId | ObjectId ? Order | required; indexed |
| productId | ObjectId ? Product | required; indexed |
| variantId | ObjectId ? ProductVariant | optional; defaults to null |
| userId | ObjectId ? User | optional; indexed |
| locationId | ObjectId ? Location | required; indexed |
| reservedQty | Number | required; min `1` |
| status | String | enum `active`, `cancelled`, `expired`, `converted`; default `active`; indexed |
| expiryTimestamp | Date | reservation expiry; indexed |
| notes | String | internal notes |
| releasedAt | Date | release timestamp |
| convertedAt | Date | conversion timestamp |
| metadata | Map<Mixed> | additional context |

- timestamps enabled
- compound index on `{ orderId, productId, variantId, locationId }`

### TransferOrder (`src/modules/inventory/models/transfer-order.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| fromLocationId | ObjectId ? Location | required |
| toLocationId | ObjectId ? Location | required |
| lines | [Object] | must contain at least one `{ productId, variantId, qty = 1 }` |
| status | String | enum `DRAFT`, `REQUESTED`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED`; default `DRAFT` |
| metadata | Map<Mixed> | arbitrary transfer metadata |

- timestamps enabled
- indexes on status+createdAt and location pairs

### StockLedger (`src/modules/inventory/models/stock-ledger.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| productId | ObjectId ? Product | required |
| variantId | ObjectId ? ProductVariant | optional |
| locationId | ObjectId ? Location | required |
| qty | Number | required quantity delta |
| direction | String | required; enum `IN`, `OUT`, `RESERVE`, `RELEASE`, `ADJUST`, `TRANSFER_IN`, `TRANSFER_OUT` |
| reason | String | enum `ORDER`, `PO`, `ADJUSTMENT`, `TRANSFER`, `RETURN`, `RESERVATION`, `FULFILLMENT`, `RECONCILIATION`, `SYSTEM`; default `SYSTEM` |
| refType | String | enum `ORDER`, `PO`, `ADJUSTMENT`, `TRANSFER`, `RETURN`, `RESERVATION`; default `ORDER` |
| refId | String | external reference id |
| occurredAt | Date | defaults to now; indexed |
| actor | String | user or system actor |
| metadata | Map<Mixed> | supplemental data |

- timestamps capture creation only (`createdAt`)
- indexes on `occurredAt` and `{ productId, variantId, locationId, occurredAt }`

### StockItem (`src/modules/inventory/models/stock-item.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| productId | ObjectId ? Product | required |
| variantId | ObjectId ? ProductVariant | optional |
| locationId | ObjectId ? Location | required |
| onHand | Number | default `0`; min `0` |
| reserved | Number | default `0`; min `0` |
| incoming | Number | default `0`; min `0` |
| safetyStock | Number | default `0`; min `0` |
| reorderPoint | Number | default `0`; min `0` |

- timestamps track updates (`updatedAt`)
- unique index on `{ productId, variantId, locationId }`
- virtual `available` returns `Math.max(0, onHand - reserved)`

### Location (`src/modules/inventory/models/location.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| code | String | required; trimmed; unique (case-insensitive) |
| name | String | required; trimmed |
| type | String | required; enum `WAREHOUSE`, `STORE`, `DROPSHIP`, `BUFFER`; default `WAREHOUSE` |
| geo | Object | `{ lat, lng, pincode, country, region }`; defaults to empty object |
| priority | Number | default `0` |
| active | Boolean | default `true` |
| metadata | Map<Mixed> | defaults to empty map |
| deletedAt | Date | soft-delete timestamp |

- timestamps enabled
- geographic compound index on `geo.country`, `geo.region`, `geo.pincode`
- method `isDropship` checks location type

## Ops

### IdempotencyKey (`src/modules/ops/idempotency-key.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| key | String | required idempotency key |
| method | String | required HTTP method |
| path | String | required request path |
| user | ObjectId ? User | optional owner |
| createdAt | Date | defaults to `Date.now` |

- timestamps disabled
- unique index across `{ key, method, path, user }`

## Orders

### Order (`src/modules/orders/order.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| user | ObjectId ? User | required; indexed |
| items | [Object] | required; each `{ product, variant, name, price = 0, currency, quantity = 1 }` |
| subtotal | Number | required subtotal |
| shipping | Number | default `0` |
| tax | Number | default `0` |
| taxRate | Number | default `0` |
| discount | Number | default `0` |
| couponCode | String | applied coupon code |
| total | Number | required grand total |
| currency | String | defaults to `config.DEFAULT_CURRENCY` |
| status | String | enum from `ORDER_STATUS`; default pending |
| paymentStatus | String | enum from `PAYMENT_STATUS`; default unpaid |
| paymentMethod | String | enum from `PAYMENT_METHOD`; default prepaid |
| paymentProvider | String | payment gateway name |
| transactionId | String | payment transaction reference |
| paidAt | Date | timestamp of payment |
| invoiceNumber | String | invoice identifier |
| invoiceUrl | String | invoice document URL |
| shippingAddress | Object | postal address snapshot |
| billingAddress | Object | postal address snapshot |
| placedAt | Date | defaults to `Date.now` |

- timestamps enabled
- index `{ user, createdAt }` supports account history queries

### ReturnRequest (`src/modules/orders/return.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| order | ObjectId ? Order | required; indexed |
| user | ObjectId ? User | required; indexed |
| status | String | enum `requested`, `approved`, `rejected`, `refunded`; default `requested` |
| reason | String | return reason |
| note | String | internal notes |
| refund | ObjectId ? Refund | linked refund |
| approvedBy | ObjectId ? User | moderator who approved |
| approvedAt | Date | approval timestamp |
| rejectedAt | Date | rejection timestamp |
| refundedAt | Date | refund completion timestamp |

- timestamps enabled

### Shipment (`src/modules/orders/shipment.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| order | ObjectId ? Order | required; indexed |
| address | Object | delivery address snapshot |
| carrier | String | carrier name |
| service | String | shipping service level |
| tracking | String | tracking number; indexed |
| status | String | enum `pending`, `shipped`, `delivered`, `returned`; default `pending` |
| items | [Object] | default `[]`; each `{ product, variant, name, quantity = 1 }` |

- timestamps enabled
- index `{ order, createdAt }` for shipping history

### OrderTimeline (`src/modules/orders/timeline.model.js`)
| Field | Type | Notes |
| --- | --- | --- |
| order | ObjectId ? Order | required; indexed |
| user | ObjectId ? User | optional actor |
| type | String | required event type |
| message | String | human readable message |
| from | Mixed | previous value snapshot |
| to | Mixed | new value snapshot |
| meta | Mixed | extra context |

- timestamps enabled
- index `{ order, createdAt }` for chronological retrieval

