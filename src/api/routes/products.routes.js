import { Router } from 'express';
import {
  listProducts,
  getProduct,
  getProductPrice,
  getProductHistory,
} from '../controllers/product.controller.js';
import { asyncHandler } from '../../middleware/error-handler.js';

export const productsRouter = Router();

productsRouter.get('/', asyncHandler(listProducts));
productsRouter.get('/:id', asyncHandler(getProduct));
productsRouter.get('/:id/price', asyncHandler(getProductPrice));
productsRouter.get('/:id/history', asyncHandler(getProductHistory));
