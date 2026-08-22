import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { optionalDoctor, requireDoctor } from "../middleware/auth.js";
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

const router = Router();

router.post("/doctors/login", loginDoctor);
router.post("/doctors", upload.single("image"), createDoctor);
router.get("/doctors", getDoctors);
router.get("/doctors/:id", getDoctorById);
router.put("/doctors/:id", optionalDoctor, upload.single("image"), updateDoctor);
router.patch("/doctors/:id", requireDoctor, upload.single("image"), updateDoctor);
router.delete("/doctors/:id", deleteDoctor);

router.get("/appointments", getAppointments);
router.get("/appointments/me", getMyAppointments);
router.get("/appointments/stats", getAppointmentStats);
router.get("/appointments/doctor/:doctorId", getAppointmentsByDoctor);
router.post("/appointments", createAppointment);
router.post("/appointments/confirm", confirmPayment);
router.put("/appointments/:id", updateAppointment);
router.patch("/appointments/:id", updateAppointment);
router.post("/appointments/:id/cancel", cancelAppointment);

router.post("/services", upload.single("image"), createService);
router.get("/services", getServices);
router.get("/services/:id", getServiceById);
router.put("/services/:id", upload.single("image"), updateService);
router.delete("/services/:id", deleteService);

router.post("/service-appointments", createServiceAppointment);
router.get("/service-appointments", getServiceAppointments);
router.get("/service-appointments/me", getMyServiceAppointments);
router.get("/service-appointments/stats/summary", getServiceAppointmentStats);
router.post("/service-appointments/confirm", confirmServicePayment);
router.put("/service-appointments/:id", updateServiceAppointment);
router.patch("/service-appointments/:id", updateServiceAppointment);
router.post("/service-appointments/:id/cancel", cancelServiceAppointment);

export default router;
