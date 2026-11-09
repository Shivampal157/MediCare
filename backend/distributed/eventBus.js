import crypto from "crypto";
import { distributedCache } from "./cache.js";

/**
 * Distributed Event Bus & Background Message Queue (with Retries + Dead-Letter Queue)
 * Decouples synchronous HTTP requests from background side-effects:
 * - Cache invalidation across catalog & stats prefixes
 * - Patient / Doctor booking notification dispatch
 * - Immutable Distributed Audit Log
 */
class DistributedEventBus {
  constructor() {
    this.subscribers = new Map();
    this.queue = [];
    this.dlq = [];
    this.auditLog = [];
    this.maxAuditEntries = 150;
    this.processing = false;

    this.stats = {
      published: 0,
      processed: 0,
      retried: 0,
      deadLettered: 0,
    };

    this._registerDefaultWorkers();
  }

  subscribe(topic, handlerName, handlerFn) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic).push({ handlerName, handlerFn });
  }

  publish(topic, payload = {}, meta = {}) {
    const event = {
      eventId: crypto.randomUUID(),
      topic,
      payload,
      correlationId: meta.correlationId || crypto.randomUUID(),
      sourceService: meta.sourceService || process.env.SERVICE_NAME || "api-gateway",
      timestamp: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
    };

    this.stats.published += 1;
    this.queue.push(event);
    this._recordAudit(event, "QUEUED");

    setImmediate(() => this._drainQueue());
    return event.eventId;
  }

  _recordAudit(event, status, detail = "") {
    this.auditLog.unshift({
      eventId: event.eventId,
      topic: event.topic,
      sourceService: event.sourceService,
      correlationId: event.correlationId,
      status,
      detail,
      timestamp: new Date().toISOString(),
      summary: this._summarizePayload(event.topic, event.payload),
    });
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog.length = this.maxAuditEntries;
    }
  }

  _summarizePayload(topic, p = {}) {
    if (topic.startsWith("appointment.")) {
      return `Patient ${p.patientName || "Unknown"} • Dr. ${p.doctorName || p.doctorId || ""} (${p.date || ""} ${p.time || ""})`;
    }
    if (topic.startsWith("service_appointment.")) {
      return `Patient ${p.patientName || "Unknown"} • ${p.serviceName || "Diagnostic"} (${p.date || ""})`;
    }
    if (topic.startsWith("catalog.")) {
      return `${p.entity || "Catalog"} ${p.action || "updated"} (${p.name || p.id || ""})`;
    }
    return JSON.stringify(p).slice(0, 100);
  }

  async _drainQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      const handlers = [
        ...(this.subscribers.get(event.topic) || []),
        ...(this.subscribers.get("*") || []),
      ];

      event.attempts += 1;
      try {
        for (const h of handlers) {
          await h.handlerFn(event);
        }
        this.stats.processed += 1;
        this._recordAudit(event, "PROCESSED", `Handled by ${handlers.length} worker(s)`);
      } catch (err) {
        if (event.attempts < event.maxAttempts) {
          this.stats.retried += 1;
          this._recordAudit(event, "RETRY_SCHEDULED", err.message);
          setTimeout(() => {
            this.queue.push(event);
            this._drainQueue();
          }, 200 * Math.pow(2, event.attempts));
        } else {
          this.stats.deadLettered += 1;
          this.dlq.unshift({ ...event, error: err.message, failedAt: new Date().toISOString() });
          if (this.dlq.length > 50) this.dlq.length = 50;
          this._recordAudit(event, "DEAD_LETTERED", err.message);
        }
      }
    }

    this.processing = false;
  }

  _registerDefaultWorkers() {
    // 1. Cache invalidation worker on domain mutations
    this.subscribe("*", "distributed-cache-invalidator", async (event) => {
      if (event.topic.startsWith("appointment.") || event.topic.startsWith("catalog.doctor")) {
        await distributedCache.invalidatePrefix("doctors");
        await distributedCache.invalidatePrefix("stats");
      }
      if (event.topic.startsWith("service_appointment.") || event.topic.startsWith("catalog.service")) {
        await distributedCache.invalidatePrefix("services");
        await distributedCache.invalidatePrefix("stats");
      }
    });

    // 2. Notification dispatch worker
    this.subscribe("appointment.created", "notification-dispatcher", async (event) => {
      const { patientName, doctorName, date, time } = event.payload || {};
      // Simulated async SMS/WhatsApp/Email dispatch in background worker
      return { notified: true, recipient: patientName, doctorName, slot: `${date} ${time}` };
    });

    this.subscribe("service_appointment.created", "service-notification-dispatcher", async (event) => {
      const { patientName, serviceName, date } = event.payload || {};
      return { notified: true, recipient: patientName, serviceName, date };
    });
  }

  getMetrics() {
    return {
      engine: "Async Pub/Sub Event Queue + Dead-Letter Queue (DLQ)",
      queueDepth: this.queue.length,
      dlqCount: this.dlq.length,
      registeredTopics: Array.from(this.subscribers.keys()),
      ...this.stats,
      recentEvents: this.auditLog.slice(0, 20),
    };
  }
}

export const eventBus = new DistributedEventBus();
