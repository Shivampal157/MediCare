import crypto from "crypto";
import Stripe from "stripe";
import ServiceAppointment from "../models/serviceAppointment.js";
import Service from "../models/Service.js";
import { lockManager } from "../distributed/lockManager.js";
import { eventBus } from "../distributed/eventBus.js";
import { circuitBreakers } from "../distributed/circuitBreaker.js";
import { resilientStore } from "../distributed/resilientStore.js";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const safeNumber = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const t = timeStr.trim();
  const m = t.match(/([0-9]{1,2}):?([0-9]{0,2})\s*(AM|PM|am|pm)?/);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  let mm = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = (m[3] || "").toUpperCase();
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  if (ampm) {
    if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return null;
    return { hour: hh, minute: mm, ampm };
  }
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  if (hh === 0) return { hour: 12, minute: mm, ampm: "AM" };
  if (hh === 12) return { hour: 12, minute: mm, ampm: "PM" };
  if (hh > 12) return { hour: hh - 12, minute: mm, ampm: "PM" };
  return { hour: hh, minute: mm, ampm: "AM" };
}

const buildFrontendBase = (req) => {
  const env = process.env.FRONTEND_URL;
  if (env) return env.replace(/\/$/, "");
  const origin = req.get("origin") || req.get("referer") || null;
  return origin ? origin.replace(/\/$/, "") : null;
};

function resolveClerkUserId(req) {
  const auth = req.auth || {};
  return auth?.userId || auth?.user_id || auth?.user?.id || req.user?.id || req.query?.createdBy || req.body?.createdBy || null;
}

export const createServiceAppointment = async (req, res) => {
  const body = req.body || {};
  const {
    serviceId,
    serviceName: serviceNameFromBody,
    patientName,
    mobile,
    age,
    gender,
    date,
    time,
    hour,
    minute,
    ampm,
    paymentMethod = "Online",
    amount: amountFromBody,
    fees: feesFromBody,
    email,
    meta = {},
    notes = "",
    serviceImageUrl: serviceImageUrlFromBody,
    serviceImagePublicId: serviceImagePublicIdFromBody,
  } = body;

  if (!serviceId) return res.status(400).json({ success: false, message: "serviceId is required" });
  if (!patientName || !String(patientName).trim()) return res.status(400).json({ success: false, message: "patientName is required" });
  if (!mobile || !String(mobile).trim()) return res.status(400).json({ success: false, message: "mobile is required" });
  if (!date || !String(date).trim()) return res.status(400).json({ success: false, message: "date is required (YYYY-MM-DD)" });

  const numericAmount = safeNumber(amountFromBody ?? feesFromBody ?? 0);
  if (numericAmount === null || numericAmount < 0) {
    return res.status(400).json({ success: false, message: "amount/fees must be a valid number" });
  }

  let finalHour = hour !== undefined ? safeNumber(hour) : null;
  let finalMinute = minute !== undefined ? safeNumber(minute) : null;
  let finalAmpm = ampm || null;
  if (time && (finalHour === null || finalHour === undefined)) {
    const parsed = parseTimeString(time);
    if (!parsed) return res.status(400).json({ success: false, message: "time string couldn't be parsed" });
    finalHour = parsed.hour;
    finalMinute = parsed.minute;
    finalAmpm = parsed.ampm;
  }
  if (finalHour === null || finalMinute === null || (finalAmpm !== "AM" && finalAmpm !== "PM")) {
    return res.status(400).json({ success: false, message: "Time missing or invalid" });
  }

  // Acquire Distributed Mutex Lock for service diagnostic slot
  const slotResourceKey = `slot:service:${String(serviceId).trim()}:${String(date).trim()}:${finalHour}:${finalMinute}:${finalAmpm}`;
  const slotLock = await lockManager.acquireLock(slotResourceKey, {
    ttlMs: 10000,
    maxWaitMs: 1500,
    retryDelayMs: 75,
  });

  if (!slotLock) {
    return res.status(409).json({
      success: false,
      code: "SLOT_LOCK_CONTENTION",
      message: "Another patient is currently booking this diagnostic slot. Please try again in a moment.",
    });
  }

  res.setHeader("X-Fencing-Token", String(slotLock.fencingToken));

  try {
    const clerkUserId = resolveClerkUserId(req);
    if (clerkUserId && resilientStore.isMongoConnected()) {
      const existing = await ServiceAppointment.findOne({
        serviceId: String(serviceId),
        createdBy: clerkUserId,
        date: String(date),
        hour: Number(finalHour),
        minute: Number(finalMinute),
        ampm: finalAmpm,
        status: { $ne: "Canceled" },
      }).lean();
      if (existing) {
        return res.status(409).json({ success: false, message: "You already have a booking for this service at the selected date and time." });
      }
    }

    let svc = null;
    if (resilientStore.isMongoConnected()) {
      try {
        svc = await Service.findById(serviceId).lean();
      } catch (e) {
        console.warn("Service lookup failed:", e?.message || e);
      }
    }
    if (!svc) {
      svc = resilientStore.services.find((s) => String(s._id) === String(serviceId)) || null;
    }

    const resolvedServiceName = serviceNameFromBody || (svc && (svc.name || svc.title)) || "Service";
    const svcImageUrlFromDB = svc ? String(svc.imageUrl || "").trim() : "";
    const svcImagePublicIdFromDB = svc ? String(svc.imagePublicId || "").trim() : "";
    const finalServiceImageUrl = svcImageUrlFromDB || String(serviceImageUrlFromBody || "").trim();
    const finalServiceImagePublicId = svcImagePublicIdFromDB || String(serviceImagePublicIdFromBody || "").trim();

    const base = {
      serviceId,
      serviceName: resolvedServiceName,
      serviceImage: { url: finalServiceImageUrl, publicId: finalServiceImagePublicId },
      patientName: String(patientName).trim(),
      mobile: String(mobile).trim(),
      age: age ? Number(age) : undefined,
      gender: gender || "",
      date: String(date),
      hour: Number(finalHour),
      minute: Number(finalMinute),
      ampm: finalAmpm,
      fees: numericAmount,
      createdBy: clerkUserId,
      notes: notes || "",
    };

    const saveServiceBooking = async (recordData) => {
      if (resilientStore.isMongoConnected()) {
        return ServiceAppointment.create(recordData);
      }
      const fallbackDoc = {
        _id: crypto.randomBytes(12).toString("hex"),
        ...recordData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      resilientStore.serviceAppointments.unshift(fallbackDoc);
      return fallbackDoc;
    };

    if (numericAmount === 0 || paymentMethod === "Cash" || !stripe) {
      const created = await saveServiceBooking({
        ...base,
        status: "Pending",
        payment: { method: paymentMethod === "Cash" || !stripe ? "Cash" : "Online", status: "Pending", amount: numericAmount, meta },
      });
      eventBus.publish("service_appointment.created", created, { correlationId: req.correlationId });
      return res.status(201).json({ success: true, appointment: created, checkoutUrl: null, fencingToken: slotLock.fencingToken });
    }

    const frontendBase = buildFrontendBase(req);
    if (!frontendBase) return res.status(500).json({ success: false, message: "Frontend base URL not available." });

    const session = await circuitBreakers.stripeCheckout.execute(async () =>
      stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email ? String(email) : undefined,
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: `Service: ${String(resolvedServiceName).slice(0, 60)}`,
                description: `Appointment on ${base.date} ${base.hour}:${String(base.minute).padStart(2, "0")} ${base.ampm}`,
              },
              unit_amount: Math.round(numericAmount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${frontendBase}/service-appointment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendBase}/service-appointment/cancel`,
        metadata: {
          serviceId: String(serviceId),
          serviceName: String(resolvedServiceName).slice(0, 200),
          patientName: base.patientName,
          mobile: base.mobile,
          clerkUserId: base.createdBy || "",
        },
      })
    );

    const created = await saveServiceBooking({
      ...base,
      status: "Confirmed",
      payment: { method: "Online", status: "Pending", amount: numericAmount, sessionId: session.id || "" },
    });
    eventBus.publish("service_appointment.created", created, { correlationId: req.correlationId });
    return res.status(201).json({ success: true, appointment: created, checkoutUrl: session.url || null, fencingToken: slotLock.fencingToken });
  } catch (err) {
    console.error("createServiceAppointment unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  } finally {
    lockManager.releaseLock(slotResourceKey, slotLock.ownerToken);
  }
};

export const confirmServicePayment = async (req, res) => {
  try {
    const session_id = req.body?.session_id || req.query?.session_id;
    if (!session_id) return res.status(400).json({ success: false, message: "session_id required" });
    if (!stripe) return res.status(500).json({ success: false, message: "Stripe not configured" });

    const session = await circuitBreakers.stripeCheckout.execute(() =>
      stripe.checkout.sessions.retrieve(session_id)
    );

    const appt = await ServiceAppointment.findOneAndUpdate(
      { "payment.sessionId": session_id },
      {
        $set: {
          "payment.status": "Confirmed",
          "payment.providerId": session.payment_intent || "",
          "payment.paidAt": new Date(),
          status: "Confirmed",
        },
      },
      { new: true }
    );
    if (!appt) return res.status(404).json({ success: false, message: "Service appointment not found" });
    eventBus.publish("service_appointment.confirmed", appt, { correlationId: req.correlationId });
    return res.json({ success: true, appointment: appt });
  } catch (err) {
    console.error("confirmServicePayment:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getServiceAppointments = async (req, res) => {
  try {
    const { serviceId, mobile, status, page: pageRaw = 1, limit: limitRaw = 50, search = "", createdBy } = req.query;
    const limit = Math.min(500, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    if (!resilientStore.isMongoConnected()) {
      let items = [...resilientStore.serviceAppointments];
      if (serviceId) items = items.filter((a) => String(a.serviceId) === String(serviceId));
      if (mobile) items = items.filter((a) => a.mobile === mobile);
      if (status) items = items.filter((a) => a.status === status);
      if (createdBy) items = items.filter((a) => a.createdBy === createdBy);
      const paged = items.slice(skip, skip + limit);
      return res.json({ success: true, data: paged, appointments: paged, meta: { page, limit, total: items.length } });
    }

    const filter = {};
    if (serviceId) filter.serviceId = serviceId;
    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;
    if (createdBy) filter.createdBy = createdBy;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ patientName: re }, { mobile: re }, { notes: re }];
    }
    const [items, total] = await Promise.all([
      ServiceAppointment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ServiceAppointment.countDocuments(filter),
    ]);
    return res.json({ success: true, data: items, appointments: items, meta: { page, limit, total } });
  } catch (err) {
    console.error("getServiceAppointments:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyServiceAppointments = async (req, res) => {
  try {
    const clerkUserId = resolveClerkUserId(req);
    if (!clerkUserId) return res.json({ success: true, data: [], appointments: [] });
    if (!resilientStore.isMongoConnected()) {
      const items = resilientStore.serviceAppointments.filter((a) => a.createdBy === clerkUserId);
      return res.json({ success: true, data: items, appointments: items });
    }
    const items = await ServiceAppointment.find({ createdBy: clerkUserId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: items, appointments: items });
  } catch (err) {
    console.error("getMyServiceAppointments:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateServiceAppointment = async (req, res) => {
  try {
    const appt = await ServiceAppointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: "Not found" });
    const body = req.body || {};
    if (body.status !== undefined) appt.status = body.status;
    if (body.notes !== undefined) appt.notes = body.notes;
    if (body.rescheduledTo) {
      const { date, time } = body.rescheduledTo || {};
      if (date) {
        appt.rescheduledTo = appt.rescheduledTo || {};
        appt.rescheduledTo.date = date;
        appt.date = date;
      }
      if (time) {
        const parsed = parseTimeString(String(time));
        if (!parsed) return res.status(400).json({ success: false, message: "rescheduledTo.time couldn't be parsed" });
        appt.hour = parsed.hour;
        appt.minute = parsed.minute;
        appt.ampm = parsed.ampm;
        appt.status = body.status || "Rescheduled";
      }
    }
    await appt.save();
    eventBus.publish("service_appointment.updated", appt, { correlationId: req.correlationId });
    return res.json({ success: true, data: appt, appointment: appt });
  } catch (err) {
    console.error("updateServiceAppointment:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const cancelServiceAppointment = async (req, res) => {
  try {
    if (!resilientStore.isMongoConnected()) {
      const appt = resilientStore.serviceAppointments.find((a) => String(a._id) === String(req.params.id));
      if (!appt) return res.status(404).json({ success: false, message: "Not found" });
      appt.status = "Canceled";
      eventBus.publish("service_appointment.canceled", appt, { correlationId: req.correlationId });
      return res.json({ success: true, data: appt, appointment: appt });
    }

    const appt = await ServiceAppointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: "Not found" });
    if (appt.status === "Completed") return res.status(400).json({ success: false, message: "Cannot cancel a completed appointment" });
    appt.status = "Canceled";
    await appt.save();
    eventBus.publish("service_appointment.canceled", appt, { correlationId: req.correlationId });
    return res.json({ success: true, data: appt, appointment: appt });
  } catch (err) {
    console.error("cancelServiceAppointment:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getServiceAppointmentStats = async (_req, res) => {
  try {
    if (!resilientStore.isMongoConnected()) {
      const rows = resilientStore.services.map((s) => ({
        _id: s._id,
        name: s.name,
        price: s.price,
        image: s.imageUrl,
        imageUrl: s.imageUrl,
        totalAppointments: 0,
        completed: 0,
        canceled: 0,
        earning: 0,
      }));
      return res.json({ success: true, data: rows, services: rows });
    }

    const rows = await Service.aggregate([
      { $lookup: { from: "serviceappointments", localField: "_id", foreignField: "serviceId", as: "appointments" } },
      {
        $addFields: {
          totalAppointments: { $size: "$appointments" },
          completed: { $size: { $filter: { input: "$appointments", as: "a", cond: { $eq: ["$$a.status", "Completed"] } } } },
          canceled: { $size: { $filter: { input: "$appointments", as: "a", cond: { $eq: ["$$a.status", "Canceled"] } } } },
        },
      },
      { $addFields: { earning: { $multiply: ["$completed", "$price"] } } },
      { $project: { name: 1, price: 1, image: "$imageUrl", imageUrl: 1, totalAppointments: 1, completed: 1, canceled: 1, earning: 1 } },
      { $sort: { createdAt: -1 } },
    ]);
    return res.json({ success: true, data: rows, services: rows });
  } catch (err) {
    console.error("getServiceAppointmentStats:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
