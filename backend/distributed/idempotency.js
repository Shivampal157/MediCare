import crypto from "crypto";

/**
 * Distributed Idempotency Engine
 * Guarantees at-most-once side effects for critical write operations (appointments, payments).
 * Supports explicit `Idempotency-Key` header or automatic request payload fingerprinting.
 */
class IdempotencyEngine {
  constructor(ttlMs = 10 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.records = new Map();
    this.stats = {
      recorded: 0,
      replayed: 0,
      inFlightConflicts: 0,
    };
  }

  _cleanup() {
    const now = Date.now();
    for (const [k, v] of this.records.entries()) {
      if (v.expiresAt <= now) {
        this.records.delete(k);
      }
    }
  }

  computeFingerprint(req) {
    const explicitKey =
      req.headers["idempotency-key"] ||
      req.headers["x-idempotency-key"] ||
      req.body?.idempotencyKey;

    if (explicitKey) {
      return `explicit:${String(explicitKey).trim()}`;
    }

    // Auto-fingerprint booking requests within a 15-second deduplication window
    const b = req.body || {};
    if (b.doctorId && b.mobile && b.date && b.time) {
      const raw = `appt:${b.doctorId}:${b.mobile}:${b.date}:${b.time}:${b.patientName || ""}`;
      return `auto:${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
    }
    if (b.serviceId && b.mobile && b.date && (b.time || b.hour !== undefined)) {
      const raw = `svc:${b.serviceId}:${b.mobile}:${b.date}:${b.time || `${b.hour}:${b.minute}:${b.ampm}`}`;
      return `auto:${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
    }
    return null;
  }

  middleware() {
    return (req, res, next) => {
      if (req.method !== "POST") return next();
      this._cleanup();

      const key = this.computeFingerprint(req);
      if (!key) return next();

      const existing = this.records.get(key);
      if (existing) {
        if (existing.status === "IN_FLIGHT") {
          this.stats.inFlightConflicts += 1;
          return res.status(409).json({
            success: false,
            code: "IDEMPOTENCY_CONFLICT",
            message: "Identical booking request is already being processed concurrently.",
          });
        }

        if (existing.status === "COMPLETED") {
          this.stats.replayed += 1;
          res.setHeader("X-Idempotent-Replay", "true");
          res.setHeader("X-Idempotency-Key", key);
          return res.status(existing.httpStatus).json(existing.body);
        }
      }

      // Mark as in-flight while processing
      const ttl = key.startsWith("auto:") ? 15 * 1000 : this.ttlMs;
      this.records.set(key, {
        status: "IN_FLIGHT",
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl,
      });

      res.setHeader("X-Idempotency-Key", key);
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.records.set(key, {
            status: "COMPLETED",
            httpStatus: res.statusCode,
            body,
            createdAt: Date.now(),
            expiresAt: Date.now() + ttl,
          });
          this.stats.recorded += 1;
        } else {
          // Allow retry if request failed with 4xx/5xx
          this.records.delete(key);
        }
        return originalJson(body);
      };

      return next();
    };
  }

  getMetrics() {
    this._cleanup();
    return {
      activeKeys: this.records.size,
      ttlSeconds: Math.round(this.ttlMs / 1000),
      ...this.stats,
    };
  }
}

export const idempotencyEngine = new IdempotencyEngine();
