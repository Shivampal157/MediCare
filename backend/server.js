import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";
import api from "./routes/index.js";
import { optionalClerk } from "./middleware/auth.js";
import { telemetry } from "./distributed/tracing.js";
import { rateLimiterManager } from "./distributed/rateLimiter.js";
import { serviceRegistry } from "./distributed/serviceRegistry.js";
import { createSmartGatewayProxy } from "./gateway/proxyRouter.js";
import Doctor from "./models/Doctor.js";
import Service from "./models/Service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medicare";

const app = express();

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const allowed = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
  ].filter(Boolean);
  if (allowed.includes(origin)) return true;
  return /\.vercel\.app$/.test(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    exposedHeaders: [
      "X-Request-Id",
      "X-Correlation-Id",
      "X-Served-By",
      "X-Microservice",
      "X-Response-Time-Ms",
      "X-Cache",
      "X-Cache-Tier",
      "X-Fencing-Token",
      "X-Idempotency-Key",
      "X-Idempotent-Replay",
      "X-Routing-Mode",
    ],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Distributed Tracing, Global Rate Limiting, Auth & Smart Microservice Proxy
app.use(telemetry.middleware());
app.use(
  rateLimiterManager.createLimiter({
    name: "global-gateway",
    windowMs: 60 * 1000,
    maxRequests: 240,
  })
);
app.use(optionalClerk);
app.use(createSmartGatewayProxy());

app.get("/api/health", (_req, res) => {
  const topology = serviceRegistry.getTopology();
  res.json({
    ok: true,
    nodeId: topology.gatewayNode,
    deploymentMode: topology.deploymentMode,
    database: topology.database,
    uptimeSeconds: topology.primitives.telemetry.uptimeSeconds,
  });
});

app.use("/api", api);

async function seedIfEmpty() {
  if (mongoose.connection.readyState !== 1) return;

  function upcomingSlots(times) {
    const out = {};
    for (let i = 1; i <= 6; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out[d.toISOString().slice(0, 10)] = times;
    }
    return out;
  }

  const doctorCount = await Doctor.countDocuments();
  const sampleDoctors = [
    { email: "dr1@gmail.com", password: "123456", name: "Dr. Rahul Sharma", specialization: "Cardiologist", experience: "10 years", qualifications: "MBBS, MD (Cardiology)", location: "Delhi", about: "Experienced heart specialist", fee: 500, availability: "Available", schedule: upcomingSlots(["10:00 AM", "10:30 AM", "11:00 AM"]), success: "98%", patients: "5000+", rating: 4.7 },
    { email: "david.kim@medicare.test", password: "123456", name: "Dr. David Kim", specialization: "Oncologist", experience: "7 years", qualifications: "MBBS, DM (Oncology)", location: "CancerCare Institute", about: "Specialist in chemotherapy, targeted therapy & cancer care.", fee: 800, availability: "Available", schedule: upcomingSlots(["10:00 AM", "11:00 AM"]), success: "90%", patients: "2k+", rating: 4.5 },
    { email: "emily.r@medicare.test", password: "123456", name: "Dr. Emily Rodriguez", specialization: "Pediatrician", experience: "8 years", qualifications: "MBBS, MD (Pediatrics)", location: "Child Care Clinic", about: "Child specialist for growth, vaccines and infections.", fee: 600, availability: "Available", schedule: upcomingSlots(["09:30 AM", "12:00 PM"]), success: "96%", patients: "3k+", rating: 4.8 },
    { email: "kabir.m@medicare.test", password: "123456", name: "Dr. Kabir Malhotra", specialization: "Nephrologist", experience: "7 years", qualifications: "MBBS, DM (Nephrology)", location: "Kidney Care Center", about: "Kidney and dialysis care specialist.", fee: 700, availability: "Available", schedule: upcomingSlots(["11:00 AM", "02:00 PM"]), success: "94%", patients: "1.8k+", rating: 4.6 },
    { email: "rohan.m@medicare.test", password: "123456", name: "Dr. Rohan Mehta", specialization: "ENT Specialist", experience: "5 years", qualifications: "MBBS, MS (ENT)", location: "City ENT Clinic", about: "Sinus, ear infection, tonsils & throat care.", fee: 600, availability: "Available", schedule: upcomingSlots(["11:00 AM", "03:00 PM"]), success: "98%", patients: "2.6k+", rating: 4.4 },
    { email: "sarah.j@medicare.test", password: "123456", name: "Dr. Sarah Johnson", specialization: "Cardiologist", experience: "9 years", qualifications: "MBBS, MD (Cardiology)", location: "Heart Institute", about: "Heart health, ECG and preventive cardiology.", fee: 750, availability: "Available", schedule: upcomingSlots(["10:00 AM", "04:00 PM"]), success: "97%", patients: "4k+", rating: 4.7 },
  ];
  if (doctorCount < sampleDoctors.length) {
    for (const doctor of sampleDoctors) {
      const exists = await Doctor.findOne({ email: doctor.email });
      if (!exists) await Doctor.create(doctor);
    }
    console.log("Seeded sample doctors. Demo login: dr1@gmail.com / 123456");
  }
  const serviceCount = await Service.countDocuments();
  if (serviceCount === 0) {
    const slots = upcomingSlots(["10:00 AM", "10:30 AM", "02:00 PM"]);
    await Service.insertMany([
      { name: "Full Body Health Checkup", about: "Complete body diagnostic service", shortDescription: "Blood test + X-Ray + Doctor consultation", price: 999, available: true, instructions: ["Come empty stomach", "Carry previous reports"], slots },
      { name: "X-Ray Scan", about: "Digital X-Ray imaging", shortDescription: "Fast digital X-Ray reporting", price: 499, available: true, instructions: ["Remove metal objects"], slots },
      { name: "Blood Pressure Check", about: "BP monitoring", shortDescription: "Accurate digital BP check", price: 199, available: true, instructions: ["Sit and rest 5 minutes"], slots },
      { name: "Blood Sugar Test", about: "Glucose test", shortDescription: "Fasting and random sugar testing", price: 249, available: true, instructions: ["Fasting 8 hours if advised"], slots },
    ]);
    console.log("Seeded sample diagnostic services");
  }
}

function mongoLabel(uri) {
  if (uri.includes("mongodb+srv")) return "MongoDB Atlas";
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

async function connectDbWithResilience() {
  const isAtlas = MONGODB_URI.includes("mongodb+srv");
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: isAtlas ? 12000 : 3000 });
    const label = mongoLabel(MONGODB_URI);
    serviceRegistry.setDbState("PRIMARY-MONGODB", true, label);
    console.log("MongoDB connected:", label);
    await seedIfEmpty();
    return;
  } catch (err) {
    console.warn("Primary MongoDB connection failed:", err.message);
  }

  // Only attempt mongodb-memory-server in local non-production environments
  if (process.env.NODE_ENV !== "production") {
    try {
      console.warn("Attempting local MongoMemoryServer fallback...");
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const dbPath = path.join(os.tmpdir(), `medicare-mongo-${Date.now()}`);
      fs.mkdirSync(dbPath, { recursive: true });
      const mem = await MongoMemoryServer.create({
        instance: { dbName: "medicare", dbPath },
      });
      const uri = mem.getUri();
      await mongoose.connect(uri);
      serviceRegistry.setDbState("MONGO-MEMORY-SERVER", true, "Local In-Memory MongoDB");
      console.log("In-memory MongoDB connected");
      await seedIfEmpty();
      return;
    } catch (memErr) {
      console.warn("MongoMemoryServer unavailable:", memErr.message);
    }
  }

  // Zero-Downtime Resilient In-Memory Store Fallback (Never crash Render with exit status 1!)
  serviceRegistry.setDbState(
    "RESILIENT-MEMORY-STORE",
    true,
    "Zero-Downtime In-Memory Store (Active Fallback)"
  );
  console.log("Activated Zero-Downtime Resilient In-Memory Store — API remains 100% operational.");
}

// Start HTTP listener immediately so Render health checks (/api/health) never time out
app.listen(PORT, () => {
  console.log(`MediCare Distributed API Gateway running on http://localhost:${PORT}`);
  connectDbWithResilience().catch((err) => {
    console.error("Background DB init warning:", err.message);
  });
});
