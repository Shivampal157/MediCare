/**
 * Distributed Sliding-Window Rate Limiter
 * Protects microservices from DDoS, brute-force logins, and noisy-neighbor spikes.
 */
class RateLimiterManager {
  constructor() {
    this.buckets = new Map();
    this.stats = {
      allowed: 0,
      throttled: 0,
    };
  }

  _clientIp(req) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    return forwarded || req.ip || "127.0.0.1";
  }

  createLimiter({ name = "default", windowMs = 60 * 1000, maxRequests = 120 } = {}) {
    return (req, res, next) => {
      const ip = this._clientIp(req);
      const key = `${name}:${ip}`;
      const now = Date.now();

      const timestamps = (this.buckets.get(key) || []).filter((t) => now - t < windowMs);

      const remaining = Math.max(0, maxRequests - timestamps.length - 1);
      const resetSec = Math.ceil(windowMs / 1000);

      res.setHeader("X-RateLimit-Policy", `${name};w=${resetSec};max=${maxRequests}`);
      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, maxRequests - timestamps.length - 1)));

      if (timestamps.length >= maxRequests) {
        this.buckets.set(key, timestamps);
        this.stats.throttled += 1;
        return res.status(429).json({
          success: false,
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many requests for [${name}]. Please retry after ${resetSec}s.`,
        });
      }

      timestamps.push(now);
      this.buckets.set(key, timestamps);
      this.stats.allowed += 1;
      return next();
    };
  }

  getMetrics() {
    return {
      algorithm: "Sliding-Window Log per IP & Route Tier",
      activeClientBuckets: this.buckets.size,
      ...this.stats,
    };
  }
}

export const rateLimiterManager = new RateLimiterManager();
