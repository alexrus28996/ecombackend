import { config } from '../config/index.js';

/**
 * Build the OpenAPI spec (v3.0) using runtime config for paths.
 * Focused on core resources with concise schemas.
 */
export function buildOpenApiSpec() {
  const api = config.API_PREFIX;
  const health = config.HEALTH_PATH;

  return {
    openapi: '3.0.3',
    info: {
      title: `${config.APP_NAME} API`,
      version: '1.0.0',
      description: 'E-commerce backend API'
    },
    servers: [
      { url: '/', description: 'Relative server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' },
                details: {}
              },
              required: ['name', 'message']
            }
          },
          required: ['error']
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 }
          },
          required: ['name', 'email', 'password']
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 }
          },
          required: ['email', 'password']
        },
        PublicUser: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' }
          },
          required: ['id', 'name', 'email', 'roles']
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            currency: { type: 'string' },
            images: {
              type: 'array',
              items: { type: 'object', properties: { url: { type: 'string' }, alt: { type: 'string' } } }
            },
            attributes: { type: 'object', additionalProperties: { type: 'string' } },
            stock: { type: 'integer' },
            isActive: { type: 'boolean' }
          },
          required: ['name', 'price']
        },
        ProductInput: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            currency: { type: 'string', default: config.DEFAULT_CURRENCY },
            images: {
              type: 'array',
              items: { type: 'object', properties: { url: { type: 'string' }, alt: { type: 'string' } } }
            },
            attributes: { type: 'object', additionalProperties: { type: 'string' } },
            stock: { type: 'integer' },
            isActive: { type: 'boolean' }
          },
          required: ['name', 'price']
        },
        CartItem: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            currency: { type: 'string' },
            quantity: { type: 'integer' }
          },
          required: ['product', 'name', 'price', 'currency', 'quantity']
        },
        Cart: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            subtotal: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string' }
          }
        },
        Address: {
          type: 'object',
          properties: {
            fullName: { type: 'string' },
            line1: { type: 'string' },
            line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            phone: { type: 'string' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            subtotal: { type: 'number' },
            shipping: { type: 'number' },
            tax: { type: 'number' },
            total: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string' },
            paymentStatus: { type: 'string' },
            shippingAddress: { $ref: '#/components/schemas/Address' }
          }
        }
      }
    },
    paths: {
      [health]: {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'OK' } }
        }
      },
      [`${api}/auth/register`]: {
        post: {
          summary: 'Register a new user',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
          responses: {
            '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/PublicUser' } } } } } },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '409': { description: 'Email exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      [`${api}/auth/login`]: {
        post: {
          summary: 'Login and receive JWT',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/PublicUser' } } } } } },
            '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      [`${api}/auth/me`]: {
        get: {
          summary: 'Get current user',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/PublicUser' } } } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      [`${api}/products`]: {
        get: {
          summary: 'List products',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1 } }
          ],
          responses: { '200': { description: 'OK' } }
        },
        post: {
          summary: 'Create product',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } } },
          responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' } }
        }
      },
      [`${api}/products/{id}`]: {
        get: {
          summary: 'Get product by id',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } }
        },
        put: {
          summary: 'Update product',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } } },
          responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' }, '404': { description: 'Not Found' } }
        },
        delete: {
          summary: 'Delete product',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' }, '404': { description: 'Not Found' } }
        }
      },
      [`${api}/cart`]: {
        get: {
          summary: 'Get current user cart',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } }
        }
      },
      [`${api}/cart/items`]: {
        post: {
          summary: 'Add item to cart',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { productId: { type: 'string' }, quantity: { type: 'integer' } }, required: ['productId'] } } } },
          responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' } }
        }
      },
      [`${api}/cart/items/{productId}`]: {
        patch: {
          summary: 'Update cart item quantity',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { quantity: { type: 'integer' } }, required: ['quantity'] } } } },
          responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } }
        },
        delete: {
          summary: 'Remove item from cart',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } }
        }
      },
      [`${api}/orders`]: {
        post: {
          summary: 'Create order from cart',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { shippingAddress: { $ref: '#/components/schemas/Address' }, shipping: { type: 'number' }, taxRate: { type: 'number' } } } } } },
          responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' } }
        },
        get: {
          summary: 'List my orders',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } }
        }
      },
      [`${api}/orders/{id}`]: {
        get: {
          summary: 'Get order by id',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not Found' } }
        }
      },
      [`${api}/admin/users/{id}/promote`]: {
        post: {
          summary: 'Promote a user to admin',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Not Found' }
          }
        }
      },
      [`${api}/admin/users/{id}/demote`]: {
        post: {
          summary: 'Remove admin role from user',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Not Found' }
          }
        }
      }
    }
  };
}
