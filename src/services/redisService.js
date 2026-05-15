const Redis = require('ioredis');
const crypto = require('crypto');

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

function getDiffHash(diffContent) {
  // SHA-256 hash of the diff content
  // SHA-256: same input ALWAYS produces same 64-char output
  // Collision probability is astronomically small
  return crypto
    .createHash('sha256')
    .update(diffContent)
    .digest('hex');
}

async function getCachedReview(diffContent) {
  const hash = getDiffHash(diffContent);
  const key  = `cache:review:${hash}`;
  
  const cached = await redis.get(key);
  
  if (cached) {
    console.log(`Cache HIT for diff hash ${hash.substring(0, 8)}...`);
    return JSON.parse(cached); // Redis stores strings — parse back to object
  }
  
  console.log(`Cache MISS for diff hash ${hash.substring(0, 8)}...`);
  return null;
}

async function cacheReview(diffContent, reviewResult) {
  const hash = getDiffHash(diffContent);
  const key  = `cache:review:${hash}`;
  
  // Store as JSON string with 1 hour expiry
  await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(reviewResult));
  console.log(`Cached review for diff hash ${hash.substring(0, 8)}...`);
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