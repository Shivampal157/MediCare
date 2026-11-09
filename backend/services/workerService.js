import "dotenv/config";
import express from "express";
import { eventBus } from "../distributed/eventBus.js";

process.env.SERVICE_NAME = "notification-worker";
const PORT = Number(process.env.PORT) || 4004;

const app = express();
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "notification-worker",
    port: PORT,
    metrics: eventBus.getMetrics(),
  })
);

app.post("/events/dispatch", (req, res) => {
  const { topic = "worker.custom", payload = {}, correlationId } = req.body || {};
  const eventId = eventBus.publish(topic, payload, {
    correlationId,
    sourceService: "notification-worker",
  });
  res.status(202).json({ success: true, eventId });
});

app.listen(PORT, () => {
  console.log(`[notification-worker] event consumer listening on port ${PORT}`);
});
