import { AppError } from '../utils/errors.js';
import { ERROR_CODES } from '../constants/index.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ event: 'api_request_failed', err: error.message, code: error.code });
    }
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  logger.error({ event: 'api_request_failed', err: error.message, stack: error.stack });
  res.status(500).json({
    success: false,
    error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
