import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { telemetry } from "../distributed/tracing.js";
import { chat as aiChat } from "../controllers/aiController.js";

process.env.SERVICE_NAME = "ai-triage-service";
const PORT = Number(process.env.PORT) || 4003;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medicare";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(telemetry.middleware());

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "ai-triage-service", port: PORT })
);

app.post("/api/ai/chat", aiChat);

app.listen(PORT, () => {
  console.log(`[ai-triage-service] running on port ${PORT}`);
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).catch((e) => {
    console.warn(`[ai-triage-service] using resilient memory store (${e.message})`);
  });
});
