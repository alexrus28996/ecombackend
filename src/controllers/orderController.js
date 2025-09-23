import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { CART_STATUS, ORDER_STATUS, PAYMENT_STATUS } from '../config/constants.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Cart } from '../modules/cart/cart.model.js';
import { HttpError, normalizeError } from '../utils/errorHandler.js';
import { PERMISSIONS } from '../utils/permissions.js';

const { DEFAULT_CURRENCY } = config;

function hasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission));
}

function ensurePositiveInteger(value, field) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
    throw new HttpError(400, `${field} must be a positive integer`);
  }
  return num;
}

function sanitizeMoney(value, field) {
  if (value === undefined || value === null || value === '') return 0;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new HttpError(400, `${field} must be a non-negative number`);
  }
  return Math.round(num * 100) / 100;
}

function normalizeAddress(address) {
  if (!address || typeof address !== 'object') return undefined;
  const allowed = ['fullName', 'line1', 'line2', 'city', 'state', 'postalCode', 'country', 'phone'];
  return allowed.reduce((acc, key) => {
    if (address[key] !== undefined && address[key] !== null) {
      acc[key] = address[key];
    }
    return acc;
  }, {});
}

function toClientStatus(status) {
  switch (status) {
    case ORDER_STATUS.DELIVERED:
      return 'completed';
    case ORDER_STATUS.CANCELLED:
      return 'cancelled';
    case ORDER_STATUS.SHIPPED:
      return 'shipped';
    case ORDER_STATUS.PAID:
    case ORDER_STATUS.PENDING:
      return 'pending';
    default:
      return status;
  }
}

function toStoredStatus(status) {
  if (!status) return null;
  const normalized = String(status).toLowerCase();
  if (normalized === 'completed') return ORDER_STATUS.DELIVERED;
  if (normalized === ORDER_STATUS.DELIVERED) return ORDER_STATUS.DELIVERED;
  if (normalized === 'pending' || normalized === ORDER_STATUS.PENDING || normalized === ORDER_STATUS.PAID) {
    return ORDER_STATUS.PENDING;
  }
  if (normalized === 'shipped') return ORDER_STATUS.SHIPPED;
  if (normalized === 'cancelled') return ORDER_STATUS.CANCELLED;
  if (normalized === ORDER_STATUS.PAID) return ORDER_STATUS.PAID;
  if (normalized === ORDER_STATUS.REFUNDED) return ORDER_STATUS.REFUNDED;
  return null;
}

function formatOrder(order) {
  if (!order) return null;
  const doc = order.toObject({ versionKey: false });
  doc.id = doc._id?.toString?.() ?? doc._id;
  if (doc.user) doc.user = doc.user?.toString?.() ?? doc.user;
  doc.status = toClientStatus(doc.status);
  if (Array.isArray(doc.items)) {
    doc.items = doc.items.map((item) => ({
      product: item.product?.toString?.() ?? item.product,
      variant: item.variant?.toString?.() ?? item.variant,
      name: item.name,
      price: item.price,
      currency: item.currency,
      quantity: item.quantity
    }));
  }
  return doc;
}

function decrementInventory(product, variantDoc, quantity) {
  if (variantDoc) {
    const current = Number(variantDoc.stock ?? 0);
    if (!Number.isFinite(current) || current < quantity) {
      throw new HttpError(400, `Insufficient stock for ${product.name}`);
    }
    variantDoc.stock = current - quantity;
    if (variantDoc.stock <= 0) {
      variantDoc.stock = 0;
      if (variantDoc.status !== undefined) variantDoc.status = 'inactive';
    }
    if (Array.isArray(product.variants)) {
      product.stock = product.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }
  } else {
    const current = Number(product.stock ?? 0);
    if (!Number.isFinite(current) || current < quantity) {
      throw new HttpError(400, `Insufficient stock for ${product.name}`);
    }
    product.stock = current - quantity;
  }
  if (product.stock <= 0) {
    product.stock = 0;
    if (product.status !== undefined) product.status = 'inactive';
  } else if (product.status === 'inactive') {
    product.status = 'active';
  }
}

async function buildOrderItems({ items, session, useSnapshotPrices, fallbackCurrency }) {
  const productCache = new Map();
  const orderItems = [];
  let currency = fallbackCurrency || null;
  let subtotal = 0;

  for (let idx = 0; idx < items.length; idx += 1) {
    const item = items[idx];
    if (!item.productId) {
      throw new HttpError(400, `items[${idx}].productId is required`);
    }
    if (!mongoose.isValidObjectId(item.productId)) {
      throw new HttpError(400, `items[${idx}].productId is invalid`);
    }
    const quantity = ensurePositiveInteger(item.quantity, `items[${idx}].quantity`);
    let product = productCache.get(item.productId);
    if (!product) {
      const query = Product.findById(item.productId);
      if (session) query.session(session);
      product = await query;
      if (!product || product.deletedAt) {
        throw new HttpError(404, 'Product not found');
      }
      if (product.status && product.status !== 'active' && product.status !== 'draft') {
        throw new HttpError(400, `Product ${product.name} is not available`);
      }
      productCache.set(item.productId, product);
    }

    let variantDoc = null;
    if (item.variantId) {
      if (!mongoose.isValidObjectId(item.variantId)) {
        throw new HttpError(400, `items[${idx}].variantId is invalid`);
      }
      variantDoc = product.variants?.id?.(item.variantId);
      if (!variantDoc) {
        throw new HttpError(400, 'Variant not found for this product');
      }
    }

    const available = variantDoc ? Number(variantDoc.stock ?? 0) : Number(product.stock ?? 0);
    if (!Number.isFinite(available) || available < quantity) {
      throw new HttpError(400, `Insufficient stock for ${product.name}`);
    }

    let unitPrice;
    if (useSnapshotPrices && item.price !== undefined) {
      unitPrice = Number(item.price);
    } else if (variantDoc?.price !== undefined) {
      unitPrice = Number(variantDoc.price);
    } else {
      unitPrice = Number(product.price);
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new HttpError(400, `Invalid price for product ${product.name}`);
    }

    const name = item.name ? String(item.name) : product.name;
    if (!name) {
      throw new HttpError(400, 'Product name is required');
    }

    let itemCurrency = item.currency || product.currency;
    if (!itemCurrency) itemCurrency = currency || DEFAULT_CURRENCY;
    if (!currency) currency = itemCurrency;

    orderItems.push({
      product: product._id,
      variant: variantDoc?._id || undefined,
      name,
      price: unitPrice,
      currency: itemCurrency,
      quantity
    });

    subtotal += unitPrice * quantity;
    decrementInventory(product, variantDoc, quantity);
  }

  // Persist inventory adjustments once per product
  await Promise.all(
    Array.from(productCache.values()).map(async (product) => {
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        product.stock = product.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        if (product.stock <= 0 && product.status !== undefined) {
          product.stock = 0;
          product.status = 'inactive';
        }
      }
      const saveOptions = session ? { session } : undefined;
      await product.save(saveOptions);
    })
  );

  return { orderItems, subtotal, currency: currency || fallbackCurrency || DEFAULT_CURRENCY };
}

const allowedTransitions = {
  pending: new Set(['shipped', 'cancelled']),
  shipped: new Set(['completed', 'cancelled'])
};

function computeTax({ subtotal, discount, tax, taxRate }) {
  if (tax !== undefined && tax !== null && tax !== '') {
    return sanitizeMoney(tax, 'tax');
  }
  if (taxRate !== undefined && taxRate !== null && taxRate !== '') {
    const rate = Number(taxRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      throw new HttpError(400, 'taxRate must be between 0 and 1');
    }
    const taxable = Math.max(0, subtotal - discount);
    return Math.round(taxable * rate * 100) / 100;
  }
  return 0;
}

export async function createOrder(req, res, next) {
  try {
    const {
      items,
      source,
      shippingAddress,
      billingAddress,
      shipping,
      tax,
      taxRate,
      discount,
      couponCode
    } = req.body || {};

    const userId = req.user.sub;
    const mode = source || (Array.isArray(items) && items.length ? 'direct' : 'cart');

    const session = await mongoose.startSession();
    let createdOrder;

    const runWorkflow = async (sess) => {
      let normalizedItems = [];
      let discountValue = 0;
      let appliedCoupon;
      let fallbackCurrency;
      let cartDoc;

      if (mode === 'cart') {
        const cartQuery = Cart.findOne({ user: userId, status: CART_STATUS.ACTIVE });
        cartDoc = sess ? await cartQuery.session(sess) : await cartQuery;
        if (!cartDoc || cartDoc.items.length === 0) {
          throw new HttpError(400, 'Cart is empty');
        }
        normalizedItems = cartDoc.items.map((item, index) => ({
          productId: item.product?.toString(),
          variantId: item.variant ? item.variant.toString() : undefined,
          quantity: ensurePositiveInteger(item.quantity, `cart.items[${index}].quantity`),
          price: Number(item.price),
          name: item.name,
          currency: item.currency || cartDoc.currency
        }));
        discountValue = sanitizeMoney(cartDoc.discount || 0, 'discount');
        appliedCoupon = cartDoc.couponCode || undefined;
        fallbackCurrency = cartDoc.currency || DEFAULT_CURRENCY;
      } else {
        if (!Array.isArray(items) || items.length === 0) {
          throw new HttpError(400, 'items must be a non-empty array');
        }
        normalizedItems = items.map((item, index) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: ensurePositiveInteger(item.quantity, `items[${index}].quantity`)
        }));
        discountValue = sanitizeMoney(discount, 'discount');
        appliedCoupon = couponCode ? String(couponCode).trim() || undefined : undefined;
      }

      const { orderItems, subtotal, currency } = await buildOrderItems({
        items: normalizedItems,
        session: sess,
        useSnapshotPrices: mode === 'cart',
        fallbackCurrency
      });

      const effectiveDiscount = Math.min(subtotal, discountValue);
      const shippingAmount = sanitizeMoney(shipping, 'shipping');
      const normalizedTaxRate = tax !== undefined && tax !== null && tax !== ''
        ? undefined
        : (taxRate !== undefined && taxRate !== null && taxRate !== '' ? Number(taxRate) : undefined);
      const taxAmount = computeTax({ subtotal, discount: effectiveDiscount, tax, taxRate: normalizedTaxRate });
      const total = Math.max(0, subtotal - effectiveDiscount) + shippingAmount + taxAmount;

      const [orderDoc] = await Order.create([
        {
          user: userId,
          items: orderItems,
          subtotal,
          discount: effectiveDiscount,
          couponCode: appliedCoupon,
          shipping: shippingAmount,
          tax: taxAmount,
          taxRate: normalizedTaxRate,
          total,
          currency,
          status: ORDER_STATUS.PENDING,
          paymentStatus: PAYMENT_STATUS.UNPAID,
          shippingAddress: normalizeAddress(shippingAddress),
          billingAddress: normalizeAddress(billingAddress)
        }
      ], { session: sess || undefined });

      if (mode === 'cart' && cartDoc) {
        cartDoc.status = CART_STATUS.CONVERTED;
        cartDoc.items = [];
        cartDoc.subtotal = 0;
        cartDoc.discount = 0;
        cartDoc.total = 0;
        cartDoc.couponCode = undefined;
        cartDoc.coupon = undefined;
        await cartDoc.save({ session: sess || undefined });
      }

      createdOrder = orderDoc;
    };

    try {
      await session.withTransaction(async () => {
        await runWorkflow(session);
      });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('Transaction numbers are only allowed') || err?.codeName === 'IllegalOperation') {
        createdOrder = undefined;
        await runWorkflow(null);
      } else {
        throw err;
      }
    } finally {
      try {
        await session.endSession();
      } catch (endErr) {
        // ignore session cleanup errors
      }
    }

    res.status(201).json({ order: formatOrder(createdOrder) });
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function listOrders(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const filter = {};
    const manageAll = hasPermission(req.user, PERMISSIONS.ORDER_MANAGE);

    if (!manageAll) {
      filter.user = req.user.sub;
    }

    if (status) {
      const stored = toStoredStatus(status);
      if (!stored) {
        throw new HttpError(400, 'Invalid status filter');
      }
      filter.status = stored;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Order.countDocuments(filter)
    ]);

    res.json({
      items: orders.map(formatOrder),
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 0
    });
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(400, 'Invalid order id');
    }
    const manageAll = hasPermission(req.user, PERMISSIONS.ORDER_MANAGE);
    const query = manageAll ? Order.findById(id) : Order.findOne({ _id: id, user: req.user.sub });
    const order = await query;
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }
    res.json({ order: formatOrder(order) });
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(400, 'Invalid order id');
    }
    const nextStatusRaw = req.body?.status;
    if (!nextStatusRaw) {
      throw new HttpError(400, 'status is required');
    }
    const nextStored = toStoredStatus(nextStatusRaw);
    if (!nextStored) {
      throw new HttpError(400, 'Invalid status value');
    }

    const order = await Order.findById(id);
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }

    const currentClient = toClientStatus(order.status);
    const nextClient = toClientStatus(nextStored);

    if (currentClient === nextClient) {
      return res.json({ order: formatOrder(order) });
    }

    const allowed = allowedTransitions[currentClient];
    if (!allowed || !allowed.has(nextClient)) {
      throw new HttpError(400, `Cannot transition order from ${currentClient} to ${nextClient}`);
    }

    if (nextClient === 'completed') {
      order.status = ORDER_STATUS.DELIVERED;
    } else if (nextClient === 'shipped') {
      order.status = ORDER_STATUS.SHIPPED;
    } else if (nextClient === 'cancelled') {
      order.status = ORDER_STATUS.CANCELLED;
    } else {
      order.status = nextStored;
    }

    await order.save();
    res.json({ order: formatOrder(order) });
  } catch (error) {
    next(normalizeError(error));
  }
}
