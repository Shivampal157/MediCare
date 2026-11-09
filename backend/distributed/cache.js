import net from "net";

/**
 * Multi-Tier Distributed Cache (L1 In-Memory LRU + Optional L2 Redis via RESP)
 * Implements Cache-Aside pattern, prefix invalidation, TTL expiration, and hit/miss telemetry.
 */
class DistributedCache {
  constructor(options = {}) {
    this.maxItems = options.maxItems || 1000;
    this.defaultTtlMs = options.defaultTtlMs || 60 * 1000; // 60s default
    this.l1 = new Map();
    this.redisUrl = process.env.REDIS_URL || null;
    this.redisAvailable = false;

    this.stats = {
      hitsL1: 0,
      hitsL2: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      evictions: 0,
    };

    if (this.redisUrl) {
      this._probeRedis();
    }
  }

  _parseRedisUrl() {
    try {
      const u = new URL(this.redisUrl);
      return {
        host: u.hostname || "127.0.0.1",
        port: Number(u.port) || 6379,
        password: u.password ? decodeURIComponent(u.password) : null,
      };
    } catch {
      return { host: "127.0.0.1", port: 6379, password: null };
    }
  }

  _probeRedis() {
    const { host, port } = this._parseRedisUrl();
    const socket = net.createConnection({ host, port, timeout: 1500 });
    socket.on("connect", () => {
      this.redisAvailable = true;
      socket.end();
    });
    socket.on("error", () => {
      this.redisAvailable = false;
      socket.destroy();
    });
    socket.on("timeout", () => {
      this.redisAvailable = false;
      socket.destroy();
    });
  }

  async _redisCommand(args) {
    if (!this.redisUrl || !this.redisAvailable) return null;
    const { host, port, password } = this._parseRedisUrl();

    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port, timeout: 1200 });
      let buffer = "";

      const encodeResp = (cmdArray) =>
        `*${cmdArray.length}\r\n` +
        cmdArray.map((a) => `$${Buffer.byteLength(String(a))}\r\n${a}\r\n`).join("");

      socket.on("connect", () => {
        if (password) {
          socket.write(encodeResp(["AUTH", password]));
        }
        socket.write(encodeResp(args));
      });

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        if (buffer.includes("\r\n")) {
          socket.end();
        }
      });

      socket.on("end", () => {
        try {
          const lines = buffer.split("\r\n").filter(Boolean);
          const lastIdx = lines.findIndex((l) => l.startsWith("$"));
          if (lastIdx !== -1 && lines[lastIdx] !== "$-1") {
            resolve(lines[lastIdx + 1] ?? null);
          } else if (lines.some((l) => l.startsWith("+OK"))) {
            resolve("OK");
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });

      socket.on("error", () => {
        this.redisAvailable = false;
        socket.destroy();
        resolve(null);
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve(null);
      });
    });
  }

  async get(key) {
    const now = Date.now();
    const entry = this.l1.get(key);

    if (entry) {
      if (entry.expiresAt > now) {
        // Refresh LRU order
        this.l1.delete(key);
        this.l1.set(key, entry);
        this.stats.hitsL1 += 1;
        return { value: entry.value, tier: "L1-MEMORY" };
      }
      this.l1.delete(key);
    }

    if (this.redisAvailable) {
      const raw = await this._redisCommand(["GET", `medicare:${key}`]);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          this.l1.set(key, { value: parsed, expiresAt: now + this.defaultTtlMs });
          this.stats.hitsL2 += 1;
          return { value: parsed, tier: "L2-REDIS" };
        } catch {
          // ignore malformed cache entry
        }
      }
    }

    this.stats.misses += 1;
    return null;
  }

  async set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.l1.size >= this.maxItems && !this.l1.has(key)) {
      const oldestKey = this.l1.keys().next().value;
      if (oldestKey !== undefined) {
        this.l1.delete(oldestKey);
        this.stats.evictions += 1;
      }
    }

    this.l1.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.stats.sets += 1;

    if (this.redisAvailable) {
      const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
      await this._redisCommand(["SETEX", `medicare:${key}`, String(ttlSec), JSON.stringify(value)]);
    }
  }

  async invalidatePrefix(prefix) {
    let removed = 0;
    for (const key of this.l1.keys()) {
      if (key.startsWith(prefix)) {
        this.l1.delete(key);
        removed += 1;
      }
    }
    this.stats.invalidations += 1;
    return removed;
  }

  getMetrics() {
    const totalLookups = this.stats.hitsL1 + this.stats.hitsL2 + this.stats.misses;
    const hitRate =
      totalLookups > 0
        ? Number((((this.stats.hitsL1 + this.stats.hitsL2) / totalLookups) * 100).toFixed(2))
        : 0;

    return {
      mode: this.redisAvailable ? "HYBRID (L1 Memory + L2 Redis)" : "L1-LRU-MEMORY (Redis Fallback)",
      redisConfigured: Boolean(this.redisUrl),
      redisConnected: this.redisAvailable,
      activeKeysL1: this.l1.size,
      maxItemsL1: this.maxItems,
      hitRatePercent: hitRate,
      ...this.stats,
    };
  }
}

export const distributedCache = new DistributedCache({
  maxItems: 1500,
  defaultTtlMs: 45 * 1000,
});

/**
 * Express Cache-Aside Middleware for read-heavy endpoints
 */
export function cacheMiddleware(prefix, ttlMs = 30 * 1000) {
  return async (req, res, next) => {
    if (req.method !== "GET" || req.query?.nocache === "1") {
      res.setHeader("X-Cache", "BYPASS");
      return next();
    }

    const cacheKey = `${prefix}:${req.originalUrl || req.url}`;
    try {
      const hit = await distributedCache.get(cacheKey);
      if (hit) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Cache-Tier", hit.tier);
        return res.json(hit.value);
      }
    } catch {
      // proceed on cache error
    }

    res.setHeader("X-Cache", "MISS");
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
        distributedCache.set(cacheKey, body, ttlMs).catch(() => {});
      }
      return originalJson(body);
    };

    return next();
  };
}
