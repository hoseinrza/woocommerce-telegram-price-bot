import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { productsRouter } from './products.routes.js';
import { statsRouter } from './stats.routes.js';
import { apiKeyAuth } from '../../middleware/auth.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/products', apiKeyAuth, productsRouter);
apiRouter.use('/stats', apiKeyAuth, statsRouter);
