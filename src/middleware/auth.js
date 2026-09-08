import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Optional API-key guard for the internal HTTP API. When API_KEY is not
 * configured, the API is left open (e.g. for local development) — set
 * API_KEY in production to require it.
 */
export function apiKeyAuth(req, res, next) {
  if (!env.API_KEY) {
    next();
    return;
  }

  const provided = req.header('x-api-key');
  if (provided !== env.API_KEY) {
    next(new UnauthorizedError('Invalid or missing API key'));
    return;
  }

  next();
}
