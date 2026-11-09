/**
 * Smart API Gateway Proxy Middleware
 * When `CATALOG_SERVICE_URL`, `BOOKING_SERVICE_URL`, or `AI_SERVICE_URL` are configured
 * (e.g. in Docker Compose multi-container deployment), forwards requests over HTTP with
 * distributed trace headers (`X-Request-Id`, `X-Correlation-Id`).
 * If a downstream microservice is unreachable or not configured (e.g. single-node Render),
 * transparently falls back to the local in-process router (Zero-Downtime Hybrid Mesh).
 */
export function createSmartGatewayProxy() {
  const routes = [
    {
      prefixes: ["/api/doctors", "/api/services"],
      targetEnv: "CATALOG_SERVICE_URL",
      serviceName: "catalog-service",
    },
    {
      prefixes: ["/api/appointments", "/api/service-appointments"],
      targetEnv: "BOOKING_SERVICE_URL",
      serviceName: "booking-service",
    },
    {
      prefixes: ["/api/ai"],
      targetEnv: "AI_SERVICE_URL",
      serviceName: "ai-triage-service",
    },
  ];

  return async (req, res, next) => {
    // Prevent proxy loop if request already came through gateway
    if (req.headers["x-gateway-forwarded"] === "1") {
      return next();
    }

    const url = req.originalUrl || req.url;
    const matched = routes.find((r) => r.prefixes.some((p) => url.startsWith(p)));
    if (!matched) return next();

    const targetBase = process.env[matched.targetEnv];
    if (!targetBase) {
      res.setHeader("X-Routing-Mode", `hybrid-local:${matched.serviceName}`);
      return next();
    }

    // Do not proxy multipart file uploads through lightweight JSON proxy; handle locally
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      res.setHeader("X-Routing-Mode", `direct-multipart:${matched.serviceName}`);
      return next();
    }

    try {
      const targetUrl = `${targetBase.replace(/\/$/, "")}${url}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const forwardHeaders = {
        "Content-Type": contentType || "application/json",
        "X-Request-Id": req.requestId || "",
        "X-Correlation-Id": req.correlationId || "",
        "X-Gateway-Forwarded": "1",
      };
      if (req.headers.authorization) {
        forwardHeaders.Authorization = req.headers.authorization;
      }
      if (req.headers["idempotency-key"]) {
        forwardHeaders["Idempotency-Key"] = req.headers["idempotency-key"];
      }

      const fetchOptions = {
        method: req.method,
        headers: forwardHeaders,
        signal: controller.signal,
      };

      if (!["GET", "HEAD"].includes(req.method) && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const upstreamRes = await fetch(targetUrl, fetchOptions);
      clearTimeout(timeout);

      const data = await upstreamRes.json().catch(() => null);
      res.setHeader("X-Routing-Mode", `proxied:${matched.serviceName}`);
      res.setHeader("X-Upstream-Service", matched.serviceName);
      return res.status(upstreamRes.status).json(data);
    } catch (err) {
      // Automatic failover to local handler if microservice container is down
      res.setHeader("X-Routing-Mode", `failover-local:${matched.serviceName}`);
      return next();
    }
  };
}
