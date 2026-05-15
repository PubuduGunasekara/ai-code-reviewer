const { checkRateLimit } = require('../services/redisService');

// Express middleware factory
// Returns a middleware function configured with the options
const createRateLimiter = (options = {}) => {
  return async (req, res, next) => {
    // Only rate limit authenticated users
    // Anonymous requests are blocked by requireAuth before this
    if (!req.user) {
      return next();
    }

    try {
      const result = await checkRateLimit(req.user.id);

      // Add rate limit info to response headers
      // This is standard practice — clients can read these
      // to know how many requests they have left
      res.setHeader('X-RateLimit-Limit',     result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset',     result.resetInSecs);

      if (!result.allowed) {
        return res.status(429).json({
          error:   'Rate limit exceeded',
          message: `Maximum ${result.limit} reviews per hour`,
          retry_after_seconds: result.resetInSecs,
          limit:     result.limit,
          used:      result.count,
          remaining: 0,
        });
      }

      // Rate limit OK — continue to route handler
      next();

    } catch (error) {
      // If Redis is down, don't block the user — fail open
      // Failing closed (blocking all requests) when Redis is down
      // would take down your entire service
      // Failing open (allowing requests) when Redis is down
      // is the safer choice for availability
      console.error('Rate limiter error (failing open):', error.message);
      next();
    }
  };
};

module.exports = { createRateLimiter };