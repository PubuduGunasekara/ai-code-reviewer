const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { mockModule } = require('./helpers/mockRequire');

const redisServicePath = require.resolve('../src/services/redisService');

const state = {
  impl: async () => ({ allowed: true, count: 1, remaining: 9, resetInSecs: 3600, limit: 10 }),
};

const restoreRedisService = mockModule(redisServicePath, {
  checkRateLimit: (userId) => state.impl(userId),
});

const { createRateLimiter } = require('../src/middleware/rateLimiter');

after(() => restoreRedisService());

function buildApp({ user } = { user: { id: 'user-1' } }) {
  const app = express();
  const limiter = createRateLimiter();
  app.use((req, res, next) => {
    req.user = user;
    next();
  });
  app.get('/reviews', limiter, (req, res) => res.json({ ok: true }));
  return app;
}

test('sets the three rate-limit headers on an allowed request', async () => {
  state.impl = async () => ({ allowed: true, count: 3, remaining: 7, resetInSecs: 1800, limit: 10 });

  const res = await request(buildApp()).get('/reviews');

  assert.equal(res.status, 200);
  assert.equal(res.headers['x-ratelimit-limit'], '10');
  assert.equal(res.headers['x-ratelimit-remaining'], '7');
  assert.equal(res.headers['x-ratelimit-reset'], '1800');
});

test('returns 429 with the documented body when over the limit', async () => {
  state.impl = async () => ({ allowed: false, count: 11, remaining: 0, resetInSecs: 120, limit: 10 });

  const res = await request(buildApp()).get('/reviews');

  assert.equal(res.status, 429);
  assert.deepEqual(res.body, {
    error: 'Rate limit exceeded',
    message: 'Maximum 10 reviews per hour',
    retry_after_seconds: 120,
    limit: 10,
    used: 11,
    remaining: 0,
  });
});

test('fails open and calls next() when the rate-limit check throws', async () => {
  state.impl = async () => {
    throw new Error('Redis is unreachable');
  };

  const res = await request(buildApp()).get('/reviews');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test('skips rate limiting entirely for unauthenticated requests', async () => {
  let checked = false;
  state.impl = async () => {
    checked = true;
    return { allowed: true, count: 1, remaining: 9, resetInSecs: 3600, limit: 10 };
  };

  const res = await request(buildApp({ user: null })).get('/reviews');

  assert.equal(res.status, 200);
  assert.equal(checked, false);
  assert.equal(res.headers['x-ratelimit-limit'], undefined);
});
