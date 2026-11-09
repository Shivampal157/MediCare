/**
 * Distributed Circuit Breaker Pattern (CLOSED -> OPEN -> HALF_OPEN)
 * Protects MediCare services from cascading failures when external dependencies
 * (Google Gemini AI, Stripe Payments, Cloudinary) experience high latency or outages.
 */
export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeoutMs = options.resetTimeoutMs || 30 * 1000;
    this.callTimeoutMs = options.callTimeoutMs || 12 * 1000;

    this.state = "CLOSED"; // CLOSED | OPEN | HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastError = null;
    this.nextAttemptAt = null;
    this.fallbackCount = 0;
  }

  async execute(actionFn, fallbackFn = null) {
    const now = Date.now();

    if (this.state === "OPEN") {
      if (this.nextAttemptAt && now >= this.nextAttemptAt) {
        this.state = "HALF_OPEN";
      } else {
        if (fallbackFn) {
          this.fallbackCount += 1;
          return fallbackFn(new Error(`CircuitBreaker [${this.name}] is OPEN`));
        }
        const err = new Error(`Service [${this.name}] temporarily unavailable (Circuit OPEN)`);
        err.code = "CIRCUIT_OPEN";
        throw err;
      }
    }

    try {
      const result = await Promise.race([
        actionFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${this.callTimeoutMs}ms`)), this.callTimeoutMs)
        ),
      ]);

      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      if (fallbackFn) {
        this.fallbackCount += 1;
        return fallbackFn(err);
      }
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    this.successCount += 1;
    this.state = "CLOSED";
    this.nextAttemptAt = null;
  }

  _onFailure(err) {
    this.failureCount += 1;
    this.lastFailureTime = new Date().toISOString();
    this.lastError = err?.message || "Unknown failure";

    if (this.failureCount >= this.failureThreshold || this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.nextAttemptAt = Date.now() + this.resetTimeoutMs;
    }
  }

  getStatus() {
    if (this.state === "OPEN" && this.nextAttemptAt && Date.now() >= this.nextAttemptAt) {
      this.state = "HALF_OPEN";
    }
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      successCount: this.successCount,
      fallbackCount: this.fallbackCount,
      lastFailureTime: this.lastFailureTime,
      lastError: this.lastError,
      nextAttemptAt: this.nextAttemptAt ? new Date(this.nextAttemptAt).toISOString() : null,
    };
  }
}

export const circuitBreakers = {
  geminiAi: new CircuitBreaker("google-gemini-ai", {
    failureThreshold: 3,
    resetTimeoutMs: 25000,
    callTimeoutMs: 12000,
  }),
  stripeCheckout: new CircuitBreaker("stripe-payment-gateway", {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
    callTimeoutMs: 10000,
  }),
  cloudinaryMedia: new CircuitBreaker("cloudinary-media-cdn", {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
    callTimeoutMs: 10000,
  }),
};

export function getAllCircuitBreakersStatus() {
  return Object.values(circuitBreakers).map((cb) => cb.getStatus());
}
