const Redis = require('ioredis');
const crypto = require('crypto');
const { PROMPT_SCHEMA_VERSION, MODEL_NAME } = require('./openaiService');

// ─── CONNECT TO REDIS ─────────────────────────────────────────
// ioredis auto-reconnects if connection drops
// This is production-grade behaviour — no manual reconnect logic needed
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
  
  // INCR atomically increments the value and returns new count
  // If key doesn't exist, Redis creates it with value 0 first
  // This is atomic — no race conditions even with concurrent requests
  const count = await redis.incr(key);
  
  // Only set expiry on the FIRST request (count === 1)
  // Setting it every time would reset the window on each request
  if (count === 1) {
    await redis.expire(key, RATE_LIMIT.WINDOW_SECONDS);
  }
  
  // Get TTL (time to live) — how many seconds until window resets
  const ttl = await redis.ttl(key);
  
  return {
    allowed:     count <= RATE_LIMIT.MAX_REVIEWS_PER_HOUR,
    count,
    remaining:   Math.max(0, RATE_LIMIT.MAX_REVIEWS_PER_HOUR - count),
    resetInSecs: ttl,
    limit:       RATE_LIMIT.MAX_REVIEWS_PER_HOUR,
  };
}


// ─── CACHING ──────────────────────────────────────────────────
// Cache GPT-4o review results by diff content hash
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