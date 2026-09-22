const Redis = require('ioredis');
const crypto = require('crypto');
const { PROMPT_SCHEMA_VERSION, MODEL_NAME } = require('./openaiService');

// ─── CONNECT TO REDIS ─────────────────────────────────────────
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,       // retry failed commands 3 times
  retryStrategy: (times) => {
    // Wait 50ms, 100ms, 200ms between retries (exponential backoff)
    const delay = Math.min(times * 50, 2000);
    console.log(`⏳ Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  enableOfflineQueue: true,      // queue commands while reconnecting
});

redis.on('connect',      () => console.log('Redis connected'));
redis.on('error',  (err) => console.error('Redis error:', err.message));
redis.on('reconnecting', () => console.log('Redis reconnecting...'));

// INCR + EXPIRE as two round trips leaves a gap: if the process dies or the
// connection drops between them, the key never gets a TTL and that user is
// rate limited forever. Doing both inside one Lua script makes it atomic.
redis.defineCommand('rateLimitIncr', {
  numberOfKeys: 1,
  lua: `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('TTL', KEYS[1])
    return {count, ttl}
  `,
});


// ─── RATE LIMITING ────────────────────────────────────────────
// How it works:
// Each user gets a Redis key: "rate:review:USER_ID"
// Every review request increments that key by 1
// The key expires after 1 hour
// If count exceeds limit → block the request

const RATE_LIMIT = {
  MAX_REVIEWS_PER_HOUR: 10,    // max reviews per user per hour
  WINDOW_SECONDS: 3600,        // 1 hour window
};

async function checkRateLimit(userId) {
  const key = `rate:review:${userId}`;

  const [count, ttl] = await redis.rateLimitIncr(key, RATE_LIMIT.WINDOW_SECONDS);

  return {
    allowed:     count <= RATE_LIMIT.MAX_REVIEWS_PER_HOUR,
    count,
    remaining:   Math.max(0, RATE_LIMIT.MAX_REVIEWS_PER_HOUR - count),
    resetInSecs: ttl,
    limit:       RATE_LIMIT.MAX_REVIEWS_PER_HOUR,
  };
}


// ─── CACHING ──────────────────────────────────────────────────
// Cache gpt-4o-mini review results by diff content hash
// Why hash? The diff can be 50,000 characters — too long for a key
// A hash is always 64 characters regardless of input size
// Same diff content → same hash → same cache hit

const CACHE_TTL_SECONDS = 3600; // cache results for 1 hour

function getDiffCacheKey(diffContent) {
  // Model + prompt/schema version are folded into the hash input so that
  // changing either never serves a review cached under the old prompt.
  const hash = crypto
    .createHash('sha256')
    .update(`${MODEL_NAME}:${PROMPT_SCHEMA_VERSION}:${diffContent}`)
    .digest('hex');

  return `cache:review:${MODEL_NAME}:${PROMPT_SCHEMA_VERSION}:${hash}`;
}

async function getCachedReview(diffContent) {
  const key = getDiffCacheKey(diffContent);

  const cached = await redis.get(key);

  if (cached) {
    console.log(`Cache HIT for ${key}`);
    return JSON.parse(cached); // Redis stores strings — parse back to object
  }

  console.log(`Cache MISS for ${key}`);
  return null;
}

async function cacheReview(diffContent, reviewResult) {
  const key = getDiffCacheKey(diffContent);

  // Store as JSON string with 1 hour expiry
  await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(reviewResult));
  console.log(`Cached review for ${key}`);
}


// ─── UTILITY ──────────────────────────────────────────────────
async function ping() {
  const result = await redis.ping();
  return result === 'PONG';
}

module.exports = {
  redis,
  checkRateLimit,
  getCachedReview,
  cacheReview,
  ping,
};