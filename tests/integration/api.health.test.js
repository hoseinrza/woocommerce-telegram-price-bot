import '../helpers/test-env.js';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';

const app = createApp();
const server = app.listen(0);
const { port } = server.address();

after(() => {
  server.close();
});

test('GET /api/health returns the standard health envelope', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/api/health`);
  const body = await res.json();

  assert.ok([200, 503].includes(res.status));
  assert.ok('status' in body);
  assert.ok('services' in body);
  for (const key of ['database', 'redis', 'woocommerce', 'telegram']) {
    assert.ok(key in body.services);
  }
  assert.ok('worker' in body);
  assert.ok('status' in body.worker);
});

test('GET /api/unknown-route returns the standard error envelope', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/api/unknown-route`);
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.success, false);
  assert.ok(body.error.code);
  assert.ok(body.error.message);
});

test('GET /api/products/not-a-number returns a validation error, not a 500', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/api/products/not-a-number`);
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});
