const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { mockModule, uncacheModule } = require('./helpers/mockRequire');
const FakeRedis = require('./helpers/fakeRedis');

const ioredisPath = require.resolve('ioredis');
const openaiServicePath = require.resolve('../src/services/openaiService');
const redisServicePath = require.resolve('../src/services/redisService');

const restoreIoredis = mockModule(ioredisPath, FakeRedis);

const fakeOpenaiService = {
  PROMPT_SCHEMA_VERSION: 'v1',
  MODEL_NAME: 'model-a',
  reviewDiff: async () => { throw new Error('not used in this test'); },
  ReviewValidationError: class ReviewValidationError extends Error {},
  MAX_ISSUES: 15,
  SEVERITIES: [],
  CATEGORIES: [],
};
const restoreOpenaiService = mockModule(openaiServicePath, fakeOpenaiService);

after(() => {
  restoreIoredis();
  restoreOpenaiService();
});

function freshRedisService() {
  uncacheModule(redisServicePath);
  return require('../src/services/redisService');
}

test('atomic rate limit script: first call sets a TTL', async () => {
  const { checkRateLimit, redis } = freshRedisService();

  const result = await checkRateLimit('user-1');

  assert.equal(result.count, 1);
  assert.equal(result.allowed, true);
  const ttl = await redis.ttl('rate:review:user-1');
  assert.ok(ttl > 0 && ttl <= 3600, `expected a positive TTL, got ${ttl}`);
});

test('atomic rate limit script: later calls in the window do not reset the TTL', async () => {
  const { checkRateLimit, redis } = freshRedisService();

  await checkRateLimit('user-2');
  const ttlAfterFirst = await redis.ttl('rate:review:user-2');

  // Manually shorten the TTL to prove a second call doesn't refresh it back to 3600.
  await redis.expire('rate:review:user-2', 10);

  const second = await checkRateLimit('user-2');
  const ttlAfterSecond = await redis.ttl('rate:review:user-2');

  assert.equal(second.count, 2);
  assert.ok(ttlAfterSecond <= 10, `expected the shortened TTL to survive, got ${ttlAfterSecond}`);
  assert.ok(ttlAfterFirst > 10, 'sanity check: the first TTL should have been the full window');
});

test('rate limit blocks once the count exceeds the configured max', async () => {
  const { checkRateLimit } = freshRedisService();

  let last;
  for (let i = 0; i < 11; i += 1) {
    last = await checkRateLimit('user-3');
  }

  assert.equal(last.count, 11);
  assert.equal(last.allowed, false);
  assert.equal(last.remaining, 0);
});

test('cache key changes when the prompt/schema version changes', async () => {
  const diff = 'diff --git a/foo.js b/foo.js';

  fakeOpenaiService.PROMPT_SCHEMA_VERSION = 'v1';
  const svcV1 = freshRedisService();
  await svcV1.cacheReview(diff, { review: { summary: 'a' }, model: 'model-a' });
  const keysV1 = [...svcV1.redis.store.keys()];

  fakeOpenaiService.PROMPT_SCHEMA_VERSION = 'v2';
  const svcV2 = freshRedisService();
  await svcV2.cacheReview(diff, { review: { summary: 'a' }, model: 'model-a' });
  const keysV2 = [...svcV2.redis.store.keys()];

  assert.equal(keysV1.length, 1);
  assert.equal(keysV2.length, 1);
  assert.notEqual(keysV1[0], keysV2[0]);

  fakeOpenaiService.PROMPT_SCHEMA_VERSION = 'v1'; // reset for other tests
});

test('cache key changes when the model changes', async () => {
  const diff = 'diff --git a/foo.js b/foo.js';

  fakeOpenaiService.MODEL_NAME = 'model-a';
  const svcA = freshRedisService();
  await svcA.cacheReview(diff, { review: { summary: 'a' }, model: 'model-a' });
  const keysA = [...svcA.redis.store.keys()];

  fakeOpenaiService.MODEL_NAME = 'model-b';
  const svcB = freshRedisService();
  await svcB.cacheReview(diff, { review: { summary: 'a' }, model: 'model-b' });
  const keysB = [...svcB.redis.store.keys()];

  assert.notEqual(keysA[0], keysB[0]);

  fakeOpenaiService.MODEL_NAME = 'model-a'; // reset for other tests
});

test('a cached review round-trips through get/cacheReview', async () => {
  const { getCachedReview, cacheReview } = freshRedisService();
  const diff = 'diff --git a/bar.js b/bar.js';
  const payload = { review: { summary: 'cached', score: 9 }, model: 'model-a' };

  const miss = await getCachedReview(diff);
  assert.equal(miss, null);

  await cacheReview(diff, payload);
  const hit = await getCachedReview(diff);

  assert.deepEqual(hit, payload);
});
