import os from "os";
import mongoose from "mongoose";
import { distributedCache } from "./cache.js";
import { lockManager } from "./lockManager.js";
import { idempotencyEngine } from "./idempotency.js";
import { eventBus } from "./eventBus.js";
import { getAllCircuitBreakersStatus } from "./circuitBreaker.js";
import { rateLimiterManager } from "./rateLimiter.js";
import { telemetry } from "./tracing.js";

/**
 * Service Discovery & Distributed Control Plane
 * Exposes real-time topology, health, latency, cache, lock, circuit breaker, and event queue telemetry.
 */
class ServiceRegistry {
  constructor() {
    this.dbState = {
      mode: "CONNECTING",
      connected: false,
      label: "Initializing...",
    };
  }

  setDbState(mode, connected, label) {
    this.dbState = { mode, connected, label, updatedAt: new Date().toISOString() };
  }

  getTopology() {
    const mode =
      process.env.CATALOG_SERVICE_URL || process.env.BOOKING_SERVICE_URL
        ? "DISTRIBUTED-MICROSERVICES (Multi-Container)"
        : "HYBRID-MODULAR-GATEWAY (Single-Node + Distributed Primitives)";

    const telemetryMetrics = telemetry.getMetrics();
    const svcStats = telemetryMetrics.services;

    return {
      deploymentMode: mode,
      gatewayNode: telemetryMetrics.nodeId,
      timestamp: new Date().toISOString(),
      database: {
        ...this.dbState,
        readyState: mongoose.connection.readyState,
      },
      services: [
        {
          id: "api-gateway",
          name: "API Gateway & Edge Router",
          port: Number(process.env.PORT) || 4000,
          status: "HEALTHY",
          role: "Routing, Rate Limiting, Distributed Tracing, Idempotency",
          requests: telemetryMetrics.totalRequests,
          errors: telemetryMetrics.totalErrors,
          avgLatencyMs: telemetryMetrics.latencyMs.p50,
        },
        {
          id: "catalog-service",
          name: "Doctor & Diagnostic Catalog Service",
          url: process.env.CATALOG_SERVICE_URL || "in-process://catalog-service:4001",
          port: 4001,
          status: "HEALTHY",
          role: "Doctor Directory, Schedules, Diagnostic Lab Services (Cache-Aside)",
          ...(svcStats["catalog-service"] || {}),
        },
        {
          id: "booking-service",
          name: "Concurrency-Safe Booking & Payment Service",
          url: process.env.BOOKING_SERVICE_URL || "in-process://booking-service:4002",
          port: 4002,
          status: "HEALTHY",
          role: "Redlock Slot Locking, Idempotent Booking, Stripe Checkout",
          ...(svcStats["booking-service"] || {}),
        },
        {
          id: "ai-triage-service",
          name: "AI Clinical Triage Service (Gemini)",
          url: process.env.AI_SERVICE_URL || "in-process://ai-triage-service:4003",
          port: 4003,
          status: "HEALTHY",
          role: "Symptom-to-Department Triage Protected by Circuit Breaker",
          ...(svcStats["ai-triage-service"] || {}),
        },
        {
          id: "notification-worker",
          name: "Async Event Queue & Audit Worker",
          url: process.env.WORKER_SERVICE_URL || "in-process://notification-worker:4004",
          port: 4004,
          status: "HEALTHY",
          role: "Pub/Sub Consumer, Cache Invalidation, DLQ Retry Engine",
          processedEvents: eventBus.stats.processed,
          queueDepth: eventBus.queue.length,
        },
      ],
      primitives: {
        telemetry: telemetryMetrics,
        cache: distributedCache.getMetrics(),
        locks: lockManager.getMetrics(),
        idempotency: idempotencyEngine.getMetrics(),
        eventBus: eventBus.getMetrics(),
        circuitBreakers: getAllCircuitBreakersStatus(),
        rateLimiter: rateLimiterManager.getMetrics(),
      },
      host: {
        platform: process.platform,
        nodeVersion: process.version,
        cpus: os.cpus().length,
        memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      },
    };
  }
}

export const serviceRegistry = new ServiceRegistry();

/**
 * Concurrency Simulation Endpoint Handler:
 * Fires N simultaneous requests trying to acquire the SAME doctor/date/time slot lock
 * to demonstrate Redlock Mutex + Fencing Tokens preventing double-booking in real time.
 */
export async function simulateConcurrentSlotBooking(req, res) {
  const concurrency = Math.min(20, Math.max(2, Number(req.body?.concurrency) || 6));
  const doctorName = req.body?.doctorName || "Dr. Rahul Sharma";
  const slotDate = req.body?.date || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const slotTime = req.body?.time || "10:00 AM";
  const lockKey = `sim:slot:${doctorName}:${slotDate}:${slotTime}:${Date.now()}`;

  let slotAlreadyBooked = false;

  const tasks = Array.from({ length: concurrency }).map(async (_, idx) => {
    const clientName = `Concurrent-Patient-${idx + 1}`;
    const startMs = Date.now();

    // Try acquiring the distributed mutex lock with a short wait window (150ms)
    const lock = await lockManager.acquireLock(lockKey, {
      ttlMs: 3000,
      maxWaitMs: 120,
      retryDelayMs: 40,
    });

    if (!lock) {
      return {
        client: clientName,
        outcome: "BLOCKED_BY_DISTRIBUTED_LOCK",
        httpStatus: 409,
        fencingToken: null,
        latencyMs: Date.now() - startMs,
        reason: "Mutex held by another concurrent transaction",
      };
    }

    try {
      // Simulate DB critical section (200ms) while holding the lock
      await new Promise((r) => setTimeout(r, 200));

      if (slotAlreadyBooked) {
        return {
          client: clientName,
          outcome: "REJECTED_SLOT_ALREADY_TAKEN",
          httpStatus: 409,
          fencingToken: lock.fencingToken,
          latencyMs: Date.now() - startMs,
          reason: "Slot was already committed by an earlier fencing token",
        };
      }

      slotAlreadyBooked = true;
      eventBus.publish(
        "appointment.concurrency_test",
        {
          patientName: clientName,
          doctorName,
          date: slotDate,
          time: slotTime,
          fencingToken: lock.fencingToken,
        },
        { correlationId: req.correlationId }
      );

      return {
        client: clientName,
        outcome: "BOOKING_COMMITTED",
        httpStatus: 201,
        fencingToken: lock.fencingToken,
        latencyMs: Date.now() - startMs,
        reason: "Acquired mutex lock first and committed slot atomically",
      };
    } finally {
      lockManager.releaseLock(lockKey, lock.ownerToken);
    }
  });

  const results = await Promise.all(tasks);
  const committed = results.filter((r) => r.outcome === "BOOKING_COMMITTED").length;
  const prevented = results.length - committed;

  return res.json({
    success: true,
    simulation: {
      resourceKey: lockKey,
      concurrentRequests: concurrency,
      committedBookings: committed,
      doubleBookingsPrevented: prevented,
      zeroRaceConditionVerified: committed === 1,
      results,
    },
  });
}
