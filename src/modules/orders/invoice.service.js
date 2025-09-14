import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { config } from '../../config/index.js';

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Generate a simple PDF invoice for an order and save to uploads/invoices.
 * Returns { invoiceNumber, invoicePath, invoiceUrl }
 */
export async function generateInvoicePdf(order) {
  const dir = path.join(config.UPLOADS_DIR, 'invoices');
  ensureDirSync(dir);
  const invoiceNumber = order._id.toString().slice(-8).toUpperCase();
  const filename = `invoice-${invoiceNumber}.pdf`;
  const filePath = path.join(dir, filename);
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Invoice', { align: 'right' });
    doc.moveDown(0.2);
    doc.fontSize(10).text(`Invoice #: ${invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date(order.createdAt || Date.now()).toISOString().slice(0,10)}`, { align: 'right' });

    doc.moveDown();
    doc.fontSize(12).text('Bill To:', { underline: true });
    const addr = order.shippingAddress || {};
    doc.text(order.user?.name || 'Customer');
    doc.text(addr.fullName || '');
    [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).forEach((l) => doc.text(l));

    doc.moveDown();
    doc.fontSize(12).text('Items', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(10);
    const tableTop = doc.y;
    const col = { name: 50, qty: 350, price: 420, total: 500 };
    doc.text('Product', col.name, tableTop);
    doc.text('Qty', col.qty, tableTop);
    doc.text('Price', col.price, tableTop);
    doc.text('Line Total', col.total, tableTop);
    doc.moveDown(0.5);
    order.items.forEach((it) => {
      const y = doc.y;
      doc.text(it.name, col.name, y, { width: 280 });
      doc.text(String(it.quantity), col.qty, y);
      doc.text(`${order.currency} ${Number(it.price).toFixed(2)}`, col.price, y);
      doc.text(`${order.currency} ${(Number(it.price) * Number(it.quantity)).toFixed(2)}`, col.total, y);
      doc.moveDown(0.5);
    });

    doc.moveDown();
    const summaryStart = doc.y + 10;
    doc.text(`Subtotal: ${order.currency} ${Number(order.subtotal).toFixed(2)}`, 350, summaryStart);
    if (order.discount) doc.text(`Discount: -${order.currency} ${Number(order.discount).toFixed(2)}`, 350);
    if (order.shipping) doc.text(`Shipping: ${order.currency} ${Number(order.shipping).toFixed(2)}`, 350);
    if (order.tax) doc.text(`Tax: ${order.currency} ${Number(order.tax).toFixed(2)}`, 350);
    doc.fontSize(12).text(`Total: ${order.currency} ${Number(order.total).toFixed(2)}`, 350);

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  const invoiceUrl = `/uploads/invoices/${path.basename(filePath)}`;
  return { invoiceNumber, invoicePath: filePath, invoiceUrl };
}

