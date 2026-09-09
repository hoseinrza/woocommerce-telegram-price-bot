import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { UpstreamError } from '../utils/errors.js';

const GEMINI_TIMEOUT_MS = 8000;

export function isGeminiConfigured() {
  return Boolean(env.GEMINI_API_KEY);
}

/**
 * Plain text-in/text-out call to Gemini. Callers are responsible for
 * grounding the prompt in real data (catalog names/prices) — this function
 * has no notion of the store, it just relays a prompt.
 */
export async function generateText(prompt) {
  if (!env.GEMINI_API_KEY) {
    throw new UpstreamError('Gemini API key is not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

  return withRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`Gemini request failed (${response.status}): ${body.slice(0, 200)}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (typeof text !== 'string' || text.trim() === '') {
          throw new Error('Gemini response had no text');
        }

        return text.trim();
      } finally {
        clearTimeout(timeout);
      }
    },
    {
      retries: 1,
      onRetry: (error, attempt, delay) => {
        logger.warn({ event: 'gemini_request_retry', attempt, delayMs: delay, err: error.message });
      },
    }
  ).catch((error) => {
    logger.error({ event: 'gemini_request_failed', err: error.message });
    throw new UpstreamError(`Gemini is unavailable: ${error.message}`);
  });
}
