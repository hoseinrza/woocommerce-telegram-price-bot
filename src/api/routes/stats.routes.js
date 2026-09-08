import { Router } from 'express';
import { getStats } from '../controllers/stats.controller.js';
import { asyncHandler } from '../../middleware/error-handler.js';

export const statsRouter = Router();

statsRouter.get('/', asyncHandler(getStats));
