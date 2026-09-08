import * as productService from '../../services/product.service.js';
import { ValidationError } from '../../utils/errors.js';

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('id must be a positive integer');
  }
  return id;
}

export async function listProducts(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

  const { items, total } = await productService.listProducts({ page, pageSize });
  res.json({ success: true, data: { items, total, page, pageSize } });
}

export async function getProduct(req, res) {
  const id = parseId(req.params.id);
  const product = await productService.getProductById(id);
  res.json({ success: true, data: product });
}

export async function getProductPrice(req, res) {
  const id = parseId(req.params.id);
  const product = await productService.getProductById(id);
  res.json({
    success: true,
    data: {
      productId: product.id,
      price: product.price,
      stockStatus: product.stockStatus,
      lastSyncedAt: product.lastSyncedAt,
    },
  });
}

export async function getProductHistory(req, res) {
  const id = parseId(req.params.id);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const history = await productService.getPriceHistory(id, limit);
  res.json({ success: true, data: history });
}
