import '../helpers/test-env.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry } from '../../src/utils/retry.js';

test('withRetry: succeeds without retrying when fn resolves immediately', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

test('withRetry: retries transient failures up to the limit then succeeds', async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error('transient');
      return 'recovered';
    },
    { retries: 3, baseDelayMs: 1 }
  );
  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
});

test('withRetry: gives up after exhausting retries', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw new Error('always fails');
      },
      { retries: 2, baseDelayMs: 1 }
    ),
    /always fails/
  );
  assert.equal(calls, 3); // initial attempt + 2 retries
});

test('withRetry: never retries when isRetryable rejects the error (e.g. auth errors)', async () => {
  let calls = 0;
  const authError = new Error('unauthorized');
  authError.status = 401;

  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw authError;
      },
      { retries: 5, baseDelayMs: 1, isRetryable: (err) => err.status !== 401 }
    )
  );
  assert.equal(calls, 1);
});
