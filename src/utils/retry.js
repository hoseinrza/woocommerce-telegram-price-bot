import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Executes `fn` with a bounded number of retries and exponential backoff.
 * `isRetryable` decides whether a given error should trigger a retry — this
 * is critical for auth errors (401/403), which must NEVER be retried.
 */
export async function withRetry(
  fn,
  {
    retries = 3,
    baseDelayMs = 300,
    maxDelayMs = 5000,
    isRetryable = () => true,
    onRetry = () => {},
  } = {}
) {
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn(attempt);
    } catch (error) {
      const canRetry = attempt < retries && isRetryable(error);

      if (!canRetry) {
        throw error;
      }

      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      onRetry(error, attempt + 1, delay);
      await sleep(delay);
      attempt += 1;
    }
  }
}
