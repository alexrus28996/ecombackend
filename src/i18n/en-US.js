export const enUS = {
  errors: {
    brand_not_found: 'Brand not found',
    product_not_found: 'Product not found',
    user_not_found: 'User not found',
    address_not_found: 'Address not found',
    order_not_found: 'Order not found',
    return_not_found: 'Return request not found',
    return_processed: 'Return already processed',
    refund_failed: 'Refund failed',
    invoice_unavailable: 'Invoice not available',
  },
  timeline: {
    order_created: 'Order created',
    invoice_generated: 'Invoice {invoiceNumber} generated',
    payment_succeeded_stripe: 'Payment succeeded (Stripe)',
    return_approved: 'Return approved and refunded',
    return_rejected: 'Return rejected',
    auto_cancel: 'Order auto-cancelled after {minutes} minutes'
  },
  email: {
    invoice_subject: 'Invoice {invoiceNumber}',
    invoice_body: 'Your invoice: {invoiceUrl}'
  },
  pdf: {
    invoice_title: 'Invoice',
    bill_to: 'Bill To:',
    items_title: 'Items',
    columns: { product: 'Product', qty: 'Qty', price: 'Price', line_total: 'Line Total' },
    summary: {
      subtotal: 'Subtotal',
      discount: 'Discount',
      shipping: 'Shipping',
      tax: 'Tax',
      total: 'Total'
    }
  },
  admin: {
    shipment_created: 'Shipment {shipmentId} created'
  }
};

