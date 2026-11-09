import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { telemetry } from "../distributed/tracing.js";
import { cacheMiddleware } from "../distributed/cache.js";
import {
  createDoctor,
  loginDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctorController.js";
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";

process.env.SERVICE_NAME = "catalog-service";
const PORT = Number(process.env.PORT) || 4001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medicare";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(telemetry.middleware());

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "catalog-service", port: PORT })
);

app.post("/api/doctors/login", loginDoctor);
app.post("/api/doctors", createDoctor);
app.get("/api/doctors", cacheMiddleware("doctors:list", 30000), getDoctors);
app.get("/api/doctors/:id", cacheMiddleware("doctors:detail", 30000), getDoctorById);
app.put("/api/doctors/:id", updateDoctor);
app.patch("/api/doctors/:id", updateDoctor);
app.delete("/api/doctors/:id", deleteDoctor);

app.post("/api/services", createService);
app.get("/api/services", cacheMiddleware("services:list", 30000), getServices);
app.get("/api/services/:id", cacheMiddleware("services:detail", 30000), getServiceById);
app.put("/api/services/:id", updateService);
app.delete("/api/services/:id", deleteService);

app.listen(PORT, () => {
  console.log(`[catalog-service] running on port ${PORT}`);
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).catch((e) => {
    console.warn(`[catalog-service] using resilient memory store (${e.message})`);
  });
});
