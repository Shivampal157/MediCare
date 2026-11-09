import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { telemetry } from "../distributed/tracing.js";
import { idempotencyEngine } from "../distributed/idempotency.js";
import { optionalClerk } from "../middleware/auth.js";
import {
  getAppointments,
  getMyAppointments,
  getAppointmentsByDoctor,
  createAppointment,
  confirmPayment,
  updateAppointment,
  cancelAppointment,
  getAppointmentStats,
} from "../controllers/appointmentController.js";
import {
  createServiceAppointment,
  confirmServicePayment,
  getServiceAppointments,
  getMyServiceAppointments,
  updateServiceAppointment,
  cancelServiceAppointment,
  getServiceAppointmentStats,
} from "../controllers/serviceAppointmentController.js";

process.env.SERVICE_NAME = "booking-service";
const PORT = Number(process.env.PORT) || 4002;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medicare";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(optionalClerk);
app.use(telemetry.middleware());

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "booking-service", port: PORT })
);

app.get("/api/appointments", getAppointments);
app.get("/api/appointments/me", getMyAppointments);
app.get("/api/appointments/stats", getAppointmentStats);
app.get("/api/appointments/doctor/:doctorId", getAppointmentsByDoctor);
app.post("/api/appointments", idempotencyEngine.middleware(), createAppointment);
app.post("/api/appointments/confirm", confirmPayment);
app.put("/api/appointments/:id", updateAppointment);
app.patch("/api/appointments/:id", updateAppointment);
app.post("/api/appointments/:id/cancel", cancelAppointment);

app.post("/api/service-appointments", idempotencyEngine.middleware(), createServiceAppointment);
app.get("/api/service-appointments", getServiceAppointments);
app.get("/api/service-appointments/me", getMyServiceAppointments);
app.get("/api/service-appointments/stats/summary", getServiceAppointmentStats);
app.post("/api/service-appointments/confirm", confirmServicePayment);
app.put("/api/service-appointments/:id", updateServiceAppointment);
app.patch("/api/service-appointments/:id", updateServiceAppointment);
app.post("/api/service-appointments/:id/cancel", cancelServiceAppointment);

app.listen(PORT, () => {
  console.log(`[booking-service] running on port ${PORT}`);
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).catch((e) => {
    console.warn(`[booking-service] using resilient memory store (${e.message})`);
  });
});
