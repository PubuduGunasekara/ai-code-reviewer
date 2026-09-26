// In-memory stand-in for ioredis, used to unit-test redisService.js without
// a real Redis server. It mirrors the handful of commands the app actually
// uses (incr/expire/ttl/get/setex/del/ping) plus defineCommand, so
// checkRateLimit's calling code is exercised exactly as it runs in
// production — only the network/server is faked.
class FakeRedis {
  constructor(url, opts) {
    this.url = url;
    this.opts = opts;
    this.store = new Map(); // key -> { value, expiresAtMs: number|null }
  }

  on() {
    return this;
  }

  _get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAtMs !== null && entry.expiresAtMs <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  async incr(key) {
    const entry = this._get(key) || { value: 0, expiresAtMs: null };
    entry.value = Number(entry.value) + 1;
    this.store.set(key, entry);
    return entry.value;
  }

  async expire(key, seconds) {
    const entry = this._get(key);
    if (!entry) return 0;
    entry.expiresAtMs = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key) {
    const entry = this._get(key);
    if (!entry) return -2;
    if (entry.expiresAtMs === null) return -1;
    return Math.round((entry.expiresAtMs - Date.now()) / 1000);
  }

  async get(key) {
    const entry = this._get(key);
    return entry ? entry.value : null;
  }

  async setex(key, seconds, value) {
    this.store.set(key, { value, expiresAtMs: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }

  async ping() {
    return 'PONG';
  }

  // Mirrors the real ioredis API surface (redis.defineCommand(name, {lua})
  // registers redis[name] as a callable command). The Lua script's exact
  // semantics are verified separately against a live Redis server; here we
  // reimplement the same increment-then-conditional-expire-then-ttl logic
  // in JS so checkRateLimit's behavior can be tested without one.
  defineCommand(name) {
    if (name === 'rateLimitIncr') {
      this.rateLimitIncr = async (key, windowSeconds) => {
        const count = await this.incr(key);
        if (count === 1) {
          await this.expire(key, windowSeconds);
        }
        const ttl = await this.ttl(key);
        return [count, ttl];
      };
    }
  }
}

module.exports = FakeRedis;
