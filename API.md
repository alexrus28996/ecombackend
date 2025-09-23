# E-commerce Backend API Documentation

## Base URL
All API endpoints are prefixed with `/api`

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Role-based Access Control
Some endpoints require specific roles:
- `ADMIN`: Full administrative access
- `SUPPORT`: Support team access
- `WAREHOUSE_MANAGER`: Warehouse management access
- `OPS_ADMIN`: Operations administrator access

## Response Format
All responses follow this format:
```json
{
  "data": {}, // Success response data
  "error": {}, // Error details (only present on errors)
  "pagination": {} // Pagination info (for list endpoints)
}
```

---

## Authentication Endpoints (`/api/auth`)

### POST `/api/auth/register`
Create a new user account

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "isActive": true,
    "isVerified": false,
    "roles": ["customer"],
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### POST `/api/auth/login`
Authenticate user and get JWT tokens

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_string",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "isActive": true,
    "isVerified": true,
    "roles": ["customer"]
  }
}
```

### GET `/api/auth/me`
Get current user profile
- **Auth**: Required

**Response (200):**
```json
{
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "isActive": true,
    "isVerified": true,
    "roles": ["customer"]
  }
}
```

### POST `/api/auth/refresh`
Refresh access token using refresh token

**Request Body:**
```json
{
  "refreshToken": "refresh_token_string"
}
```

**Response (200):**
```json
{
  "token": "new_access_token",
  "refreshToken": "new_refresh_token",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### POST `/api/auth/logout`
Revoke refresh token (logout)

**Request Body:**
```json
{
  "refreshToken": "refresh_token_string"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### POST `/api/auth/password/forgot`
Request password reset email

**Request Body:**
```json
{
  "email": "john@example.com",
  "baseUrl": "https://yourapp.com" // optional
}
```

**Response (200):**
```json
{
  "success": true
}
```

### POST `/api/auth/password/reset`
Reset password using token from email

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### PATCH `/api/auth/profile`
Update user profile
- **Auth**: Required

**Request Body:**
```json
{
  "name": "John Smith"
}
```

**Response (200):**
```json
{
  "user": {
    "_id": "user_id",
    "name": "John Smith",
    "email": "john@example.com"
  }
}
```

### POST `/api/auth/password/change`
Change user password
- **Auth**: Required

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### POST `/api/auth/email/verify/request`
Request email verification
- **Auth**: Required

**Request Body:**
```json
{
  "baseUrl": "https://yourapp.com" // optional
}
```

**Response (200):**
```json
{
  "success": true
}
```

### POST `/api/auth/email/verify`
Verify email with token

**Request Body:**
```json
{
  "token": "verification_token_from_email"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### POST `/api/auth/email/change/request`
Request email change
- **Auth**: Required

**Request Body:**
```json
{
  "newEmail": "newemail@example.com",
  "baseUrl": "https://yourapp.com" // optional
}
```

**Response (200):**
```json
{
  "success": true
}
```

### GET `/api/auth/preferences`
Get user preferences
- **Auth**: Required

**Response (200):**
```json
{
  "preferences": {
    "locale": "en",
    "notifications": {
      "email": true,
      "sms": false,
      "push": true
    }
  }
}
```

### PATCH `/api/auth/preferences`
Update user preferences
- **Auth**: Required

**Request Body:**
```json
{
  "locale": "es",
  "notifications": {
    "email": false,
    "sms": true,
    "push": true
  }
}
```

**Response (200):**
```json
{
  "preferences": {
    "locale": "es",
    "notifications": {
      "email": false,
      "sms": true,
      "push": true
    }
  }
}
```

---

## Product Endpoints (`/api/products`)

### GET `/api/products`
List products with filtering and pagination

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `category`: Filter by category ID
- `brand`: Filter by brand ID
- `search`: Search query
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter

**Response (200):**
```json
{
  "data": [
    {
      "_id": "product_id",
      "name": "Product Name",
      "description": "Product description",
      "price": 29.99,
      "currency": "USD",
      "images": [
        {
          "url": "https://example.com/image1.jpg",
          "alt": "Product image"
        }
      ],
      "category": "category_id",
      "brand": "brand_id",
      "attributes": {
        "color": ["red", "blue"],
        "size": ["S", "M", "L"]
      },
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### GET `/api/products/:id`
Get product details by ID

**Response (200):**
```json
{
  "product": {
    "_id": "product_id",
    "name": "Product Name",
    "description": "Detailed product description",
    "price": 29.99,
    "currency": "USD",
    "images": [
      {
        "url": "https://example.com/image1.jpg",
        "alt": "Product image"
      }
    ],
    "category": {
      "_id": "category_id",
      "name": "Category Name"
    },
    "brand": {
      "_id": "brand_id",
      "name": "Brand Name"
    },
    "attributes": {
      "color": ["red", "blue"],
      "size": ["S", "M", "L"]
    },
    "variants": [
      {
        "_id": "variant_id",
        "attributes": {
          "color": "red",
          "size": "M"
        },
        "price": 29.99,
        "sku": "PROD-RED-M",
        "isActive": true
      }
    ],
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### POST `/api/products`
Create new product
- **Auth**: Required
- **Permissions**: PRODUCT_CREATE

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 29.99,
  "currency": "USD",
  "category": "category_id",
  "brandId": "brand_id",
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "alt": "Product image"
    }
  ],
  "attributes": {
    "color": ["red", "blue"],
    "size": ["S", "M", "L"]
  },
  "isActive": true
}
```

**Response (201):**
```json
{
  "product": {
    "_id": "new_product_id",
    "name": "New Product",
    "description": "Product description",
    "price": 29.99,
    "currency": "USD",
    "category": "category_id",
    "brandId": "brand_id",
    "images": [
      {
        "url": "https://example.com/image1.jpg",
        "alt": "Product image"
      }
    ],
    "attributes": {
      "color": ["red", "blue"],
      "size": ["S", "M", "L"]
    },
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### PATCH `/api/products/:id`
Update product
- **Auth**: Required
- **Permissions**: PRODUCT_EDIT

**Request Body (partial update):**
```json
{
  "name": "Updated Product Name",
  "price": 39.99,
  "isActive": false
}
```

**Response (200):**
```json
{
  "product": {
    "_id": "product_id",
    "name": "Updated Product Name",
    "price": 39.99,
    "isActive": false,
    "updatedAt": "2023-01-02T00:00:00.000Z"
  }
}
```

### DELETE `/api/products/:id`
Delete product
- **Auth**: Required
- **Permissions**: PRODUCT_DELETE

**Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Category Endpoints (`/api/categories`)

### GET `/api/categories`
List all categories

**Query Parameters:**
- `parent`: Filter by parent category ID
- `level`: Filter by category level (0 = root)
- `isActive`: Filter by active status

**Response (200):**
```json
{
  "categories": [
    {
      "_id": "category_id",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices and accessories",
      "parent": null,
      "level": 0,
      "isActive": true,
      "children": [
        {
          "_id": "subcategory_id",
          "name": "Smartphones",
          "slug": "smartphones",
          "parent": "category_id",
          "level": 1,
          "isActive": true
        }
      ],
      "productCount": 245,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET `/api/categories/:id`
Get category details

**Response (200):**
```json
{
  "category": {
    "_id": "category_id",
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices and accessories",
    "parent": null,
    "level": 0,
    "isActive": true,
    "children": [
      {
        "_id": "subcategory_id",
        "name": "Smartphones",
        "slug": "smartphones",
        "parent": "category_id",
        "level": 1,
        "isActive": true,
        "productCount": 45
      }
    ],
    "productCount": 245,
    "path": ["Electronics"],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-15T00:00:00.000Z"
  }
}
```

### POST `/api/categories`
Create new category
- **Auth**: Required
- **Permissions**: CATEGORY_CREATE

**Request Body:**
```json
{
  "name": "Gaming",
  "slug": "gaming",
  "description": "Gaming devices and accessories",
  "parent": "category_id",
  "isActive": true
}
```

**Response (201):**
```json
{
  "category": {
    "_id": "new_category_id",
    "name": "Gaming",
    "slug": "gaming",
    "description": "Gaming devices and accessories",
    "parent": "category_id",
    "level": 1,
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### PATCH `/api/categories/:id`
Update category
- **Auth**: Required
- **Permissions**: CATEGORY_EDIT

**Request Body:**
```json
{
  "name": "Gaming & Entertainment",
  "description": "Gaming devices, entertainment systems and accessories",
  "isActive": false
}
```

**Response (200):**
```json
{
  "category": {
    "_id": "category_id",
    "name": "Gaming & Entertainment",
    "slug": "gaming",
    "description": "Gaming devices, entertainment systems and accessories",
    "parent": "category_id",
    "level": 1,
    "isActive": false,
    "updatedAt": "2023-01-02T00:00:00.000Z"
  }
}
```

### DELETE `/api/categories/:id`
Delete category
- **Auth**: Required
- **Permissions**: CATEGORY_DELETE

**Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

## Brand Endpoints (`/api/brands`)

### GET `/api/brands`
List all brands

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search query
- `isActive`: Filter by active status

**Response (200):**
```json
{
  "brands": [
    {
      "_id": "brand_id",
      "name": "Nike",
      "slug": "nike",
      "description": "Just Do It",
      "logo": "https://example.com/nike-logo.png",
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### GET `/api/brands/:id`
Get brand details

**Response (200):**
```json
{
  "brand": {
    "_id": "brand_id",
    "name": "Nike",
    "slug": "nike",
    "description": "Just Do It - Athletic apparel and footwear",
    "logo": "https://example.com/nike-logo.png",
    "isActive": true,
    "productCount": 145,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-15T00:00:00.000Z"
  }
}
```

### POST `/api/brands`
Create new brand
- **Auth**: Required
- **Role**: ADMIN

**Request Body:**
```json
{
  "name": "Adidas",
  "slug": "adidas",
  "description": "Impossible is Nothing",
  "logo": "https://example.com/adidas-logo.png",
  "isActive": true
}
```

**Response (201):**
```json
{
  "brand": {
    "_id": "new_brand_id",
    "name": "Adidas",
    "slug": "adidas",
    "description": "Impossible is Nothing",
    "logo": "https://example.com/adidas-logo.png",
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### PUT `/api/brands/:id`
Update brand
- **Auth**: Required
- **Role**: ADMIN

**Request Body:**
```json
{
  "name": "Adidas Updated",
  "description": "Impossible is Nothing - Updated description",
  "isActive": false
}
```

**Response (200):**
```json
{
  "brand": {
    "_id": "brand_id",
    "name": "Adidas Updated",
    "slug": "adidas",
    "description": "Impossible is Nothing - Updated description",
    "logo": "https://example.com/adidas-logo.png",
    "isActive": false,
    "updatedAt": "2023-01-02T00:00:00.000Z"
  }
}
```

### DELETE `/api/brands/:id`
Delete brand
- **Auth**: Required
- **Role**: ADMIN

**Response (200):**
```json
{
  "success": true,
  "message": "Brand deleted successfully"
}
```

---

## Cart Endpoints (`/api/cart`)

All cart endpoints require authentication.

### GET `/api/cart`
Get current user's cart
- **Auth**: Required

**Response (200):**
```json
{
  "cart": {
    "_id": "cart_id",
    "user": "user_id",
    "items": [
      {
        "product": {
          "_id": "product_id",
          "name": "Product Name",
          "price": 29.99
        },
        "variant": {
          "_id": "variant_id",
          "attributes": {
            "color": "red",
            "size": "M"
          }
        },
        "quantity": 2,
        "price": 29.99,
        "total": 59.98
      }
    ],
    "subtotal": 59.98,
    "discount": 5.00,
    "coupon": {
      "code": "SAVE10",
      "type": "fixed",
      "value": 5.00
    },
    "currency": "USD",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### POST `/api/cart/items`
Add item to cart
- **Auth**: Required

**Request Body:**
```json
{
  "productId": "product_id",
  "variantId": "variant_id", // optional
  "quantity": 2
}
```

**Response (201):**
```json
{
  "cart": {
    "_id": "cart_id",
    "items": [
      {
        "product": {
          "_id": "product_id",
          "name": "Product Name",
          "price": 29.99
        },
        "variant": {
          "_id": "variant_id",
          "attributes": {
            "color": "red",
            "size": "M"
          }
        },
        "quantity": 2,
        "price": 29.99,
        "total": 59.98
      }
    ],
    "subtotal": 59.98,
    "currency": "USD"
  }
}
```

### PATCH `/api/cart/items/:productId`
Update item quantity in cart
- **Auth**: Required

**Request Body:**
```json
{
  "quantity": 3,
  "variantId": "variant_id" // optional
}
```

**Response (200):**
```json
{
  "cart": {
    "_id": "cart_id",
    "items": [
      {
        "product": {
          "_id": "product_id",
          "name": "Product Name",
          "price": 29.99
        },
        "quantity": 3,
        "total": 89.97
      }
    ],
    "subtotal": 89.97,
    "currency": "USD"
  }
}
```

### DELETE `/api/cart/items/:productId`
Remove item from cart
- **Auth**: Required
- **Query Params**: `variantId` (optional)

**Response (200):**
```json
{
  "cart": {
    "_id": "cart_id",
    "items": [],
    "subtotal": 0,
    "currency": "USD"
  }
}
```

### POST `/api/cart/clear`
Clear all items from cart
- **Auth**: Required

**Response (200):**
```json
{
  "cart": {
    "_id": "cart_id",
    "items": [],
    "subtotal": 0,
    "currency": "USD"
  }
}
```

### POST `/api/cart/coupon`
Apply coupon to cart
- **Auth**: Required

**Request Body:**
```json
{
  "code": "SAVE10"
}
```

**Response (200):**
```json
{
  "cart": {
    "_id": "cart_id",
    "items": [
      {
        "product": {
          "_id": "product_id",
          "name": "Product Name"
        },
        "quantity": 2,
        "total": 59.98
      }
    ],
    "subtotal": 59.98,
    "discount": 10.00,
    "coupon": {
      "code": "SAVE10",
      "type": "percent",
      "value": 0.1
    },
    "currency": "USD"
  }
}
```

### DELETE `/api/cart/coupon`
Remove coupon from cart
- **Auth**: Required

**Response (200):**
```json
{
  "cart": {
    "_id": "cart_id",
    "items": [
      {
        "product": {
          "_id": "product_id",
          "name": "Product Name"
        },
        "quantity": 2,
        "total": 59.98
      }
    ],
    "subtotal": 59.98,
    "discount": 0,
    "coupon": null,
    "currency": "USD"
  }
}
```

### POST `/api/cart/estimate`
Estimate shipping and tax
- **Auth**: Required

**Request Body:**
```json
{
  "shipping": 9.99, // optional
  "taxRate": 0.08 // optional (0-1)
}
```

**Response (200):**
```json
{
  "subtotal": 59.98,
  "discount": 5.00,
  "shipping": 9.99,
  "tax": 4.80,
  "total": 69.77,
  "currency": "USD"
}
```

---

## Order Endpoints (`/api/orders`)

All order endpoints require authentication.

### POST `/api/orders`
Create order from current cart
- **Auth**: Required

**Request Body:**
```json
{
  "shippingAddress": {
    "fullName": "John Doe",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "phone": "+1-555-123-4567"
  },
  "billingAddress": {
    "fullName": "John Doe",
    "line1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US"
  },
  "shipping": 9.99,
  "taxRate": 0.08
}
```

**Response (201):**
```json
{
  "order": {
    "_id": "order_id",
    "orderNumber": "ORD-2023-001",
    "user": "user_id",
    "items": [
      {
        "product": {
          "_id": "product_id",
          "name": "Product Name"
        },
        "variant": {
          "_id": "variant_id",
          "attributes": {
            "color": "red",
            "size": "M"
          }
        },
        "quantity": 2,
        "price": 29.99,
        "total": 59.98
      }
    ],
    "subtotal": 59.98,
    "discount": 5.00,
    "shipping": 9.99,
    "tax": 4.80,
    "total": 69.77,
    "currency": "USD",
    "status": "pending",
    "paymentStatus": "unpaid",
    "shippingAddress": {
      "fullName": "John Doe",
      "line1": "123 Main St",
      "line2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US",
      "phone": "+1-555-123-4567"
    },
    "billingAddress": {
      "fullName": "John Doe",
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### GET `/api/orders`
List current user's orders
- **Auth**: Required
- **Query Params**: `page`, `limit`, `status`

**Response (200):**
```json
{
  "data": [
    {
      "_id": "order_id",
      "orderNumber": "ORD-2023-001",
      "total": 69.77,
      "currency": "USD",
      "status": "shipped",
      "paymentStatus": "paid",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "itemsCount": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

### GET `/api/orders/:id`
Get order details
- **Auth**: Required

**Response (200):**
```json
{
  "order": {
    "_id": "order_id",
    "orderNumber": "ORD-2023-001",
    "user": "user_id",
    "items": [
      {
        "product": {
          "_id": "product_id",
          "name": "Product Name",
          "images": [
            {
              "url": "https://example.com/image1.jpg",
              "alt": "Product image"
            }
          ]
        },
        "variant": {
          "_id": "variant_id",
          "attributes": {
            "color": "red",
            "size": "M"
          }
        },
        "quantity": 2,
        "price": 29.99,
        "total": 59.98
      }
    ],
    "subtotal": 59.98,
    "discount": 5.00,
    "shipping": 9.99,
    "tax": 4.80,
    "total": 69.77,
    "currency": "USD",
    "status": "shipped",
    "paymentStatus": "paid",
    "shippingAddress": {
      "fullName": "John Doe",
      "line1": "123 Main St",
      "line2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US",
      "phone": "+1-555-123-4567"
    },
    "tracking": {
      "carrier": "UPS",
      "trackingNumber": "1Z999AA1234567890"
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-02T00:00:00.000Z"
  }
}
```

### GET `/api/orders/:id/invoice`
Download order invoice (PDF)
- **Auth**: Required

**Response (302):**
Redirects to PDF invoice URL or returns 404 if invoice not available

### GET `/api/orders/:id/timeline`
Get order timeline/status history
- **Auth**: Required
- **Query Params**: `page`, `limit`

**Response (200):**
```json
{
  "data": [
    {
      "_id": "timeline_id",
      "type": "status_change",
      "message": "Order shipped",
      "status": "shipped",
      "userId": "admin_user_id",
      "createdAt": "2023-01-02T00:00:00.000Z"
    },
    {
      "_id": "timeline_id_2",
      "type": "payment_received",
      "message": "Payment received",
      "paymentStatus": "paid",
      "createdAt": "2023-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

### POST `/api/orders/:id/returns`
Request return/refund for order
- **Auth**: Required

**Request Body:**
```json
{
  "reason": "Product damaged" // optional
}
```

**Response (201):**
```json
{
  "return": {
    "_id": "return_id",
    "order": "order_id",
    "user": "user_id",
    "reason": "Product damaged",
    "status": "requested",
    "createdAt": "2023-01-03T00:00:00.000Z"
  }
}
```

### PATCH `/api/orders/:id/status`
Update order status (Admin)
- **Auth**: Required
- **Permissions**: ORDER_MANAGE

**Request Body:**
```json
{
  "status": "shipped", // pending, paid, shipped, delivered, cancelled, refunded
  "paymentStatus": "paid" // unpaid, paid, refunded
}
```

**Response (200):**
```json
{
  "order": {
    "_id": "order_id",
    "orderNumber": "ORD-2023-001",
    "status": "shipped",
    "paymentStatus": "paid",
    "updatedAt": "2023-01-02T00:00:00.000Z"
  }
}
```

---

## Product Reviews (`/api/products/:productId/reviews`)

### GET `/api/products/:productId/reviews`
Get approved reviews for a product

**Response (200):**
```json
{
  "reviews": [
    {
      "_id": "review_id",
      "user": {
        "_id": "user_id",
        "name": "John Doe"
      },
      "product": "product_id",
      "rating": 5,
      "comment": "Great product! Highly recommended.",
      "status": "approved",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  },
  "averageRating": 4.2,
  "totalReviews": 25
}
```

### POST `/api/products/:productId/reviews`
Create or update user's review
- **Auth**: Required

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Great product! Highly recommended."
}
```

**Response (201):**
```json
{
  "review": {
    "_id": "review_id",
    "user": "user_id",
    "product": "product_id",
    "rating": 5,
    "comment": "Great product! Highly recommended.",
    "status": "pending",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### DELETE `/api/products/:productId/reviews/:reviewId`
Delete review (author or admin)
- **Auth**: Required

**Response (200):**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

### POST `/api/products/:productId/reviews/:reviewId/approve`
Approve review (Admin)
- **Auth**: Required
- **Role**: ADMIN

**Response (200):**
```json
{
  "review": {
    "_id": "review_id",
    "status": "approved",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### POST `/api/products/:productId/reviews/:reviewId/hide`
Hide review (Admin)
- **Auth**: Required
- **Role**: ADMIN

**Response (200):**
```json
{
  "review": {
    "_id": "review_id",
    "status": "hidden",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

---

## Address Management (`/api/addresses`)

All address endpoints require authentication.

### GET `/api/addresses`
List user's addresses
- **Auth**: Required

**Response (200):**
```json
{
  "addresses": [
    {
      "_id": "address_id",
      "type": "shipping",
      "fullName": "John Doe",
      "line1": "123 Main St",
      "line2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US",
      "phone": "+1-555-123-4567",
      "label": "Home",
      "isDefault": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST `/api/addresses`
Create new address
- **Auth**: Required

**Request Body:**
```json
{
  "type": "shipping",
  "fullName": "John Doe",
  "line1": "123 Main St",
  "line2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "US",
  "phone": "+1-555-123-4567",
  "label": "Home",
  "isDefault": false
}
```

**Response (201):**
```json
{
  "address": {
    "_id": "new_address_id",
    "type": "shipping",
    "fullName": "John Doe",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "phone": "+1-555-123-4567",
    "label": "Home",
    "isDefault": false,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### GET `/api/addresses/:id`
Get address details
- **Auth**: Required

**Response (200):**
```json
{
  "address": {
    "_id": "address_id",
    "type": "shipping",
    "fullName": "John Doe",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "phone": "+1-555-123-4567",
    "label": "Home",
    "isDefault": true,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### PUT `/api/addresses/:id`
Update address
- **Auth**: Required

**Request Body:**
```json
{
  "line1": "456 Oak Avenue",
  "line2": "Suite 200",
  "label": "Office"
}
```

**Response (200):**
```json
{
  "address": {
    "_id": "address_id",
    "type": "shipping",
    "fullName": "John Doe",
    "line1": "456 Oak Avenue",
    "line2": "Suite 200",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "phone": "+1-555-123-4567",
    "label": "Office",
    "isDefault": true,
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### DELETE `/api/addresses/:id`
Delete address
- **Auth**: Required

**Response (200):**
```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

### POST `/api/addresses/:id/default`
Set address as default
- **Auth**: Required

**Response (200):**
```json
{
  "address": {
    "_id": "address_id",
    "isDefault": true,
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

---

## Payment Endpoints (`/api/payments`)

### POST `/api/payments/stripe/intent`
Create Stripe payment intent
- **Auth**: Required

**Request Body:**
```json
{
  "orderId": "order_id"
}
```

**Response (200):**
```json
{
  "paymentIntent": {
    "id": "pi_1234567890",
    "client_secret": "pi_1234567890_secret_abcdef",
    "amount": 6977,
    "currency": "usd",
    "status": "requires_payment_method"
  },
  "order": {
    "_id": "order_id",
    "total": 69.77,
    "currency": "USD"
  }
}
```

### POST `/api/payments/stripe/webhook`
Stripe webhook handler
- **Content-Type**: `application/json` (raw body)
- **Headers**: `stripe-signature` required

**Request Body:**
```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "amount": 6977,
      "currency": "usd",
      "status": "succeeded"
    }
  }
}
```

**Response (200):**
```json
{
  "received": true
}
```

---

## File Upload (`/api/uploads`)

All upload endpoints require admin role.

### POST `/api/uploads`
Upload image file to local storage
- **Auth**: Required
- **Role**: ADMIN
- **Content-Type**: `multipart/form-data`

**Request Body:**
```
Form field: file (image file)
Supported formats: JPEG, PNG, GIF, WebP
Max size: 5MB
```

**Response (200):**
```json
{
  "url": "/uploads/images/1234567890-image.jpg",
  "filename": "1234567890-image.jpg",
  "size": 1024576,
  "mimetype": "image/jpeg"
}
```

### POST `/api/uploads/cloudinary`
Upload image to Cloudinary
- **Auth**: Required
- **Role**: ADMIN
- **Content-Type**: `multipart/form-data`

**Request Body:**
```
Form field: file (image file)
Supported formats: JPEG, PNG, GIF, WebP
Max size: 5MB
```

**Response (200):**
```json
{
  "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/abc123.jpg",
  "public_id": "products/abc123",
  "secure_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/abc123.jpg",
  "width": 1024,
  "height": 768,
  "format": "jpg",
  "bytes": 1024576
}
```

### POST `/api/uploads/cloudinary/delete`
Delete image from Cloudinary
- **Auth**: Required
- **Role**: ADMIN

**Request Body:**
```json
{
  "publicId": "products/abc123"
}
```

**Response (200):**
```json
{
  "success": true,
  "result": "ok"
}
```

---

## Inventory Management (`/api/inventory`)

### PATCH `/api/inventory/bulk`
Bulk update inventory levels
- **Auth**: Required
- **Permissions**: INVENTORY_MANAGE

**Request Body:**
```json
{
  "updates": [
    {
      "productId": "product_id_1",
      "variantId": "variant_id_1",
      "stockChange": 50,
      "reason": "restock"
    },
    {
      "productId": "product_id_2",
      "stockChange": -10,
      "reason": "damage"
    }
  ]
}
```

**Response (200):**
```json
{
  "results": [
    {
      "productId": "product_id_1",
      "success": true,
      "newStock": 75,
      "previousStock": 25
    },
    {
      "productId": "product_id_2",
      "success": true,
      "newStock": 40,
      "previousStock": 50
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

### PATCH `/api/inventory/:id`
Update single product inventory
- **Auth**: Required
- **Permissions**: INVENTORY_MANAGE

**Request Body:**
```json
{
  "stockChange": 25,
  "reason": "restock",
  "note": "Received new shipment"
}
```

**Response (200):**
```json
{
  "inventory": {
    "productId": "product_id",
    "stock": 50,
    "previousStock": 25,
    "reserved": 5,
    "available": 45,
    "lastUpdated": "2023-01-01T00:00:00.000Z"
  }
}
```

### GET `/api/inventory/locations`
List warehouse locations
- **Auth**: Required
- **Roles**: SUPPORT, WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Response**: Location list

### POST `/api/inventory/locations`
Create warehouse location
- **Auth**: Required
- **Roles**: WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Body**: Location details
- **Response**: Created location

### GET `/api/inventory/locations/:id`
Get location details
- **Auth**: Required
- **Roles**: SUPPORT, WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Response**: Location details

### PATCH `/api/inventory/locations/:id`
Update location
- **Auth**: Required
- **Roles**: WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Body**: Location updates
- **Response**: Updated location

### DELETE `/api/inventory/locations/:id`
Delete location
- **Auth**: Required
- **Roles**: WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Response**: Success confirmation

### GET `/api/inventory/stock`
Query stock levels
- **Auth**: Required
- **Roles**: SUPPORT, WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN

**Query Parameters:**
- `productId`: Filter by product ID
- `locationId`: Filter by location ID
- `lowStock`: Show only low stock items (boolean)
- `page`: Page number
- `limit`: Items per page

**Response (200):**
```json
{
  "stock": [
    {
      "productId": "product_id",
      "productName": "Product Name",
      "variantId": "variant_id",
      "variantAttributes": {
        "color": "red",
        "size": "M"
      },
      "locationId": "location_id",
      "locationName": "Main Warehouse",
      "quantity": 45,
      "reserved": 5,
      "available": 40,
      "lowStockThreshold": 10,
      "isLowStock": false,
      "lastUpdated": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "pages": 25
  }
}
```

### POST `/api/inventory/stock/adjust`
Adjust stock levels
- **Auth**: Required
- **Roles**: WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN

**Request Body:**
```json
{
  "productId": "product_id",
  "variantId": "variant_id",
  "locationId": "location_id",
  "qtyChange": -5,
  "reservedChange": 0,
  "reason": "damage",
  "note": "Items damaged during handling",
  "refId": "DAMAGE-001"
}
```

**Response (200):**
```json
{
  "adjustment": {
    "_id": "adjustment_id",
    "productId": "product_id",
    "variantId": "variant_id",
    "locationId": "location_id",
    "qtyChange": -5,
    "reservedChange": 0,
    "reason": "damage",
    "note": "Items damaged during handling",
    "refId": "DAMAGE-001",
    "previousQty": 50,
    "newQty": 45,
    "createdBy": "user_id",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### POST `/api/inventory/stock/reconcile`
Reconcile stock levels
- **Auth**: Required
- **Roles**: WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Body**: Reconciliation data
- **Response**: Reconciliation result

### GET `/api/inventory/stock/transfer-orders`
List transfer orders
- **Auth**: Required
- **Roles**: WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Response**: Transfer order list

### POST `/api/inventory/stock/transfer-orders`
Create transfer order
- **Auth**: Required
- **Roles**: WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Body**: Transfer order details
- **Response**: Created transfer order

### PATCH `/api/inventory/stock/transfer-orders/:id`
Update transfer order status
- **Auth**: Required
- **Roles**: WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Body**: Status update
- **Response**: Updated transfer order

### POST `/api/inventory/picking/quote`
Get picking quote
- **Auth**: Required
- **Roles**: SUPPORT, WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Body**: Picking requirements
- **Response**: Picking quote

### POST `/api/inventory/picking/allocate`
Allocate inventory for picking
- **Auth**: Required
- **Roles**: WAREHOUSE_MANAGER, OPS_ADMIN, ADMIN
- **Body**: Allocation details
- **Response**: Allocation result

---

## Permission Endpoints (`/api/permissions`)

### GET `/api/permissions/me`
Get current user's permissions
- **Auth**: Required
- **Response**: User ID and permissions list

---

## Admin Endpoints (`/api/admin`)

All admin endpoints require ADMIN role unless specified otherwise.

### User Management

#### GET `/api/admin/users`
List all users
- **Auth**: Required
- **Role**: ADMIN

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search by name or email
- `role`: Filter by role
- `isActive`: Filter by active status

**Response (200):**
```json
{
  "users": [
    {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "roles": ["customer"],
      "isActive": true,
      "isVerified": true,
      "lastLoginAt": "2023-01-15T10:30:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1500,
    "pages": 75
  }
}
```

#### GET `/api/admin/users/:id`
Get user details
- **Auth**: Required
- **Role**: ADMIN

**Response (200):**
```json
{
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "roles": ["customer"],
    "isActive": true,
    "isVerified": true,
    "preferences": {
      "locale": "en",
      "notifications": {
        "email": true,
        "sms": false,
        "push": true
      }
    },
    "orderCount": 12,
    "totalSpent": 1249.99,
    "lastLoginAt": "2023-01-15T10:30:00.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-15T10:30:00.000Z"
  }
}
```

#### PATCH `/api/admin/users/:id`
Update user
- **Auth**: Required
- **Role**: ADMIN

**Request Body:**
```json
{
  "isActive": false
}
```

**Response (200):**
```json
{
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "isActive": false,
    "updatedAt": "2023-01-16T00:00:00.000Z"
  }
}
```

#### POST `/api/admin/users/:id/promote`
Promote user role
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Success confirmation

#### POST `/api/admin/users/:id/demote`
Demote user role
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Success confirmation

### Metrics & Reports

#### GET `/api/admin/metrics`
Get system metrics
- **Auth**: Required
- **Role**: ADMIN

**Response (200):**
```json
{
  "metrics": {
    "users": {
      "total": 1500,
      "active": 1425,
      "newThisMonth": 85
    },
    "orders": {
      "total": 3250,
      "thisMonth": 245,
      "pending": 12,
      "shipped": 180,
      "delivered": 53
    },
    "revenue": {
      "total": 125000.50,
      "thisMonth": 12500.25,
      "lastMonth": 11800.00
    },
    "products": {
      "total": 850,
      "active": 820,
      "lowStock": 15
    },
    "inventory": {
      "totalValue": 85000.00,
      "adjustmentsThisMonth": 25
    }
  }
}
```

#### GET `/api/admin/reports/sales`
Sales report
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Sales analytics

#### GET `/api/admin/reports/top-products`
Top products report
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Product performance data

#### GET `/api/admin/reports/top-customers`
Top customers report
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Customer analytics

### Order Management

#### GET `/api/admin/orders`
List all orders
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Order list

#### GET `/api/admin/orders/:id`
Get order details
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Order details

#### PATCH `/api/admin/orders/:id`
Update order
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Order updates
- **Response**: Updated order

### Coupon Management

#### GET `/api/admin/coupons`
List coupons
- **Auth**: Required
- **Role**: ADMIN

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `isActive`: Filter by active status
- `type`: Filter by coupon type (percent, fixed)

**Response (200):**
```json
{
  "coupons": [
    {
      "_id": "coupon_id",
      "code": "SAVE10",
      "description": "10% off your order",
      "type": "percent",
      "value": 0.1,
      "minSubtotal": 50.00,
      "usageCount": 145,
      "isActive": true,
      "expiresAt": "2023-12-31T23:59:59.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  }
}
```

#### POST `/api/admin/coupons`
Create coupon
- **Auth**: Required
- **Role**: ADMIN

**Request Body:**
```json
{
  "code": "NEWUSER15",
  "description": "15% off for new users",
  "type": "percent",
  "value": 0.15,
  "minSubtotal": 25.00,
  "expiresAt": "2023-12-31T23:59:59.000Z",
  "isActive": true
}
```

**Response (201):**
```json
{
  "coupon": {
    "_id": "new_coupon_id",
    "code": "NEWUSER15",
    "description": "15% off for new users",
    "type": "percent",
    "value": 0.15,
    "minSubtotal": 25.00,
    "usageCount": 0,
    "isActive": true,
    "expiresAt": "2023-12-31T23:59:59.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### GET `/api/admin/coupons/:id`
Get coupon details
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Coupon details

#### PUT `/api/admin/coupons/:id`
Update coupon
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Coupon updates
- **Response**: Updated coupon

#### DELETE `/api/admin/coupons/:id`
Delete coupon
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Success confirmation

### Inventory Management

#### GET `/api/admin/inventory`
List inventory
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Inventory data

#### GET `/api/admin/inventory/low`
Get low stock items
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Low stock products

#### GET `/api/admin/inventory/adjustments`
List inventory adjustments
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Adjustment history

#### POST `/api/admin/inventory/adjustments`
Create inventory adjustment
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Adjustment details
- **Response**: Created adjustment

### Returns Management

#### GET `/api/admin/returns`
List return requests
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Return request list

#### POST `/api/admin/returns/:id/approve`
Approve return request
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Approval details
- **Response**: Approved return

#### POST `/api/admin/returns/:id/reject`
Reject return request
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Rejected return

### Transaction Management

#### GET `/api/admin/transactions`
List transactions
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Transaction list

#### GET `/api/admin/transactions/:id`
Get transaction details
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Transaction details

#### GET `/api/admin/refunds`
List refunds
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Refund list

#### GET `/api/admin/refunds/:id`
Get refund details
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Refund details

### Shipping Management

#### GET `/api/admin/shipments`
List shipments
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Shipment list

#### POST `/api/admin/orders/:id/shipments`
Create shipment for order
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Shipment details
- **Response**: Created shipment

#### GET `/api/admin/shipments/:id`
Get shipment details
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Shipment details

#### GET `/api/admin/orders/:id/shipments`
List shipments for order
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Order shipments

### Product Management Tools

#### POST `/api/admin/products/import`
Import products from file
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Import data
- **Response**: Import results

#### GET `/api/admin/products/export`
Export products to file
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Export file

#### POST `/api/admin/products/price-bulk`
Bulk update product prices
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Price updates
- **Response**: Update results

#### POST `/api/admin/products/category-bulk`
Bulk update product categories
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Category updates
- **Response**: Update results

#### POST `/api/admin/products/variants-matrix`
Create product variants matrix
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Variant matrix data
- **Response**: Created variants

#### GET `/api/admin/products/:id/references`
Get product references
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Product reference data

### Category Management (Admin)

#### GET `/api/admin/categories`
List categories
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Category list

#### POST `/api/admin/categories`
Create category
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Category details
- **Response**: Created category

#### GET `/api/admin/categories/:id`
Get category details
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Category details

#### PUT `/api/admin/categories/:id`
Update category
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Category updates
- **Response**: Updated category

#### DELETE `/api/admin/categories/:id`
Delete category
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Success confirmation

#### GET `/api/admin/categories/:id/children`
List category children
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Child categories

#### POST `/api/admin/categories/:id/reorder`
Reorder category children
- **Auth**: Required
- **Role**: ADMIN
- **Body**: New order
- **Response**: Success confirmation

### Brand Management (Admin)

#### GET `/api/admin/brands`
List brands
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Brand list

#### POST `/api/admin/brands`
Create brand
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Brand details
- **Response**: Created brand

#### GET `/api/admin/brands/:id`
Get brand details
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Brand details

#### PUT `/api/admin/brands/:id`
Update brand
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Brand updates
- **Response**: Updated brand

#### DELETE `/api/admin/brands/:id`
Delete brand
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Success confirmation

#### GET `/api/admin/brands/:id/references`
Get brand references
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Brand reference data

---

## Reservation Management (`/api/admin/reservations`)

### GET `/api/admin/reservations`
List inventory reservations
- **Auth**: Required
- **Role**: ADMIN
- **Response**: Reservation list

### POST `/api/admin/reservations/:orderId/release`
Release reservations for order
- **Auth**: Required
- **Role**: ADMIN
- **Body**: Release details
- **Response**: Release confirmation

---

## Error Response Format

All error responses follow this format:
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `429`: Rate Limited
- `500`: Internal Server Error

---

## Rate Limiting

Write operations (POST, PATCH, PUT, DELETE) are rate limited to 30 requests per minute per user.

---

## Pagination

List endpoints support pagination with these query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```