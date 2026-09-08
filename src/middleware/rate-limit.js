import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../constants/index.js';

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: ERROR_CODES.RATE_LIMITED, message: 'Too many requests, please try again later' },
    });
  },
});
