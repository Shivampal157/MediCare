import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { optionalDoctor, requireDoctor } from "../middleware/auth.js";
import { cacheMiddleware } from "../distributed/cache.js";
import { idempotencyEngine } from "../distributed/idempotency.js";
import { rateLimiterManager } from "../distributed/rateLimiter.js";
import { eventBus } from "../distributed/eventBus.js";
import {
  serviceRegistry,
  simulateConcurrentSlotBooking,
} from "../distributed/serviceRegistry.js";
import {
  createDoctor,
  loginDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctorController.js";
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
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";
import {
  createServiceAppointment,
  confirmServicePayment,
  getServiceAppointments,
  getMyServiceAppointments,
  updateServiceAppointment,
  cancelServiceAppointment,
  getServiceAppointmentStats,
} from "../controllers/serviceAppointmentController.js";
import { chat as aiChat } from "../controllers/aiController.js";

const router = Router();

const authLimiter = rateLimiterManager.createLimiter({
  name: "auth-login",
  windowMs: 60 * 1000,
  maxRequests: 25,
});

const bookingLimiter = rateLimiterManager.createLimiter({
  name: "booking-write",
  windowMs: 60 * 1000,
  maxRequests: 40,
});

const aiLimiter = rateLimiterManager.createLimiter({
  name: "ai-triage",
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
});

// Distributed Control Plane & Telemetry Routes
router.get("/system/architecture", (_req, res) => {
  res.json({ success: true, data: serviceRegistry.getTopology() });
});
router.get("/system/metrics", (_req, res) => {
  res.json({ success: true, data: serviceRegistry.getTopology() });
});
router.get("/system/events", (_req, res) => {
  res.json({ success: true, data: eventBus.getMetrics() });
});
router.post("/system/simulate-concurrency", simulateConcurrentSlotBooking);

// AI Triage Microservice Route
router.post("/ai/chat", aiLimiter, aiChat);

// Doctor Catalog Microservice Routes (Cache-Aside on GET)
router.post("/doctors/login", authLimiter, loginDoctor);
router.post("/doctors", upload.single("image"), createDoctor);
router.get("/doctors", cacheMiddleware("doctors:list", 30000), getDoctors);
router.get("/doctors/:id", cacheMiddleware("doctors:detail", 30000), getDoctorById);
router.put("/doctors/:id", optionalDoctor, upload.single("image"), updateDoctor);
router.patch("/doctors/:id", requireDoctor, upload.single("image"), updateDoctor);
router.delete("/doctors/:id", deleteDoctor);

// Appointment & Payment Microservice Routes (Idempotent + Distributed Mutex Lock)
router.get("/appointments", getAppointments);
router.get("/appointments/me", getMyAppointments);
router.get("/appointments/stats", cacheMiddleware("stats:appointments", 15000), getAppointmentStats);
router.get("/appointments/doctor/:doctorId", getAppointmentsByDoctor);
router.post("/appointments", bookingLimiter, idempotencyEngine.middleware(), createAppointment);
router.post("/appointments/confirm", confirmPayment);
router.put("/appointments/:id", updateAppointment);
router.patch("/appointments/:id", updateAppointment);
router.post("/appointments/:id/cancel", cancelAppointment);

// Diagnostic Services Catalog Microservice Routes (Cache-Aside on GET)
router.post("/services", upload.single("image"), createService);
router.get("/services", cacheMiddleware("services:list", 30000), getServices);
router.get("/services/:id", cacheMiddleware("services:detail", 30000), getServiceById);
router.put("/services/:id", upload.single("image"), updateService);
router.delete("/services/:id", deleteService);

// Diagnostic Service Appointments Microservice Routes (Idempotent + Distributed Mutex Lock)
router.post("/service-appointments", bookingLimiter, idempotencyEngine.middleware(), createServiceAppointment);
router.get("/service-appointments", getServiceAppointments);
router.get("/service-appointments/me", getMyServiceAppointments);
router.get("/service-appointments/stats/summary", cacheMiddleware("stats:services", 15000), getServiceAppointmentStats);
router.post("/service-appointments/confirm", confirmServicePayment);
router.put("/service-appointments/:id", updateServiceAppointment);
router.patch("/service-appointments/:id", updateServiceAppointment);
router.post("/service-appointments/:id/cancel", cancelServiceAppointment);

export default router;
