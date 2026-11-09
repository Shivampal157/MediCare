import crypto from "crypto";
import os from "os";

const NODE_ID = process.env.NODE_ID || `medicare-node-${os.hostname().slice(0, 12)}-${process.pid}`;

/**
 * Distributed Request Tracing & Telemetry Collector
 * Propagates `X-Request-Id`, `X-Correlation-Id`, `X-Served-By`, and computes
 * p50 / p95 / p99 latency percentiles across microservices.
 */
class TelemetryCollector {
  constructor() {
    this.nodeId = NODE_ID;
    this.startedAt = Date.now();
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.inFlight = 0;
    this.latencies = [];
    this.maxLatencySamples = 500;
    this.serviceBreakdown = {
      "catalog-service": { requests: 0, errors: 0, avgLatencyMs: 0 },
      "booking-service": { requests: 0, errors: 0, avgLatencyMs: 0 },
      "ai-triage-service": { requests: 0, errors: 0, avgLatencyMs: 0 },
      "system-control-plane": { requests: 0, errors: 0, avgLatencyMs: 0 },
    };
  }

  resolveServiceForPath(url = "") {
    if (url.startsWith("/api/doctors") || url.startsWith("/api/services")) {
      return "catalog-service";
    }
    if (url.startsWith("/api/appointments") || url.startsWith("/api/service-appointments")) {
      return "booking-service";
    }
    if (url.startsWith("/api/ai")) {
      return "ai-triage-service";
    }
    return "system-control-plane";
  }

  middleware() {
    return (req, res, next) => {
      const start = process.hrtime.bigint();
      const requestId = req.headers["x-request-id"] || crypto.randomUUID();
      const correlationId = req.headers["x-correlation-id"] || requestId;
      const targetService = this.resolveServiceForPath(req.originalUrl || req.url);

      req.requestId = requestId;
      req.correlationId = correlationId;
      req.targetService = targetService;

      res.setHeader("X-Request-Id", requestId);
      res.setHeader("X-Correlation-Id", correlationId);
      res.setHeader("X-Served-By", this.nodeId);
      res.setHeader("X-Microservice", targetService);

      this.inFlight += 1;

      const origEnd = res.end.bind(res);
      res.end = (...args) => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const roundedMs = Number(durationMs.toFixed(2));
        if (!res.headersSent) {
          res.setHeader("X-Response-Time-Ms", String(roundedMs));
        }

        this.inFlight = Math.max(0, this.inFlight - 1);
        this.totalRequests += 1;
        if (res.statusCode >= 500) {
          this.totalErrors += 1;
        }

        this.latencies.push(roundedMs);
        if (this.latencies.length > this.maxLatencySamples) {
          this.latencies.shift();
        }

        const svc = this.serviceBreakdown[targetService];
        if (svc) {
          svc.requests += 1;
          if (res.statusCode >= 500) svc.errors += 1;
          svc.avgLatencyMs = Number(
            (((svc.avgLatencyMs * (svc.requests - 1)) + roundedMs) / svc.requests).toFixed(2)
          );
        }

        return origEnd(...args);
      };

      next();
    };
  }

  _percentile(p) {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
  }

  getMetrics() {
    return {
      nodeId: this.nodeId,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      inFlightRequests: this.inFlight,
      latencyMs: {
        p50: this._percentile(50),
        p95: this._percentile(95),
        p99: this._percentile(99),
      },
      services: this.serviceBreakdown,
    };
  }
}

export const telemetry = new TelemetryCollector();
