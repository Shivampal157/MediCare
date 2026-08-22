import Stripe from "stripe";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

const FRONTEND_URL = process.env.FRONTEND_URL;
const MAJOR_ADMIN_ID = process.env.MAJOR_ADMIN_ID || "admin";
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const buildFrontendBase = (req) => {
  if (FRONTEND_URL) return FRONTEND_URL.replace(/\/$/, "");
  const origin = req.get("origin") || req.get("referer");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.get("host");
  if (host) return `${req.protocol || "http"}://${host}`.replace(/\/$/, "");
  return null;
};

function resolveClerkUserId(req) {
  try {
    const auth = req.auth || {};
    return auth?.userId || auth?.user_id || auth?.user?.id || req.user?.id || req.query?.createdBy || req.body?.createdBy || null;
  } catch {
    return req.query?.createdBy || null;
  }
}

export const getAppointments = async (req, res) => {
  try {
    const { doctorId, mobile, status, search = "", limit: limitRaw = 50, page: pageRaw = 1, patientClerkId, createdBy } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;
    if (patientClerkId) filter.createdBy = patientClerkId;
    if (createdBy) filter.createdBy = createdBy;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ patientName: re }, { mobile: re }, { notes: re }];
    }

    const [items, total] = await Promise.all([
      Appointment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Appointment.countDocuments(filter),
    ]);
    return res.json({ success: true, data: items, appointments: items, meta: { page, limit, total } });
  } catch (err) {
    console.error("getAppointments:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyAppointments = async (req, res) => {
  try {
    const clerkUserId = resolveClerkUserId(req);
    if (!clerkUserId) {
      return res.json({ success: true, data: [], appointments: [] });
    }
    const items = await Appointment.find({ createdBy: clerkUserId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: items, appointments: items });
  } catch (err) {
    console.error("getMyAppointments:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAppointmentsByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { mobile, status, search = "", limit: limitRaw = 50, page: pageRaw = 1 } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;
    const filter = { doctorId };
    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ patientName: re }, { mobile: re }, { notes: re }];
    }
    const [items, total] = await Promise.all([
      Appointment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Appointment.countDocuments(filter),
    ]);
    return res.json({ success: true, data: items, appointments: items, meta: { page, limit, total } });
  } catch (err) {
    console.error("getAppointmentsByDoctor:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      patientName,
      mobile,
      age = "",
      gender = "",
      date,
      time,
      fee,
      fees,
      notes = "",
      email,
      paymentMethod,
      owner: ownerFromBody = null,
      doctorName: doctorNameFromBody,
      speciality: specialityFromBody,
      doctorImageUrl: doctorImageUrlFromBody,
      doctorImagePublicId: doctorImagePublicIdFromBody,
    } = req.body || {};

    if (!doctorId || !patientName || !mobile || !date || !time) {
      return res.status(400).json({ success: false, message: "doctorId, patientName, mobile, date and time are required" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    const numericFee = safeNumber(fee ?? fees ?? doctor.fee ?? 0) ?? 0;
    const clerkUserId = resolveClerkUserId(req);

    let resolvedOwner = ownerFromBody || doctor.owner || null;
    if (!resolvedOwner) resolvedOwner = MAJOR_ADMIN_ID || String(doctorId);

    const doctorName = (doctor.name && String(doctor.name).trim()) || (doctorNameFromBody && String(doctorNameFromBody).trim()) || "";
    const speciality =
      (doctor.specialization && String(doctor.specialization).trim()) ||
      (specialityFromBody && String(specialityFromBody).trim()) ||
      "";
    const doctorImageUrl =
      (doctor.imageUrl && String(doctor.imageUrl).trim()) ||
      (doctorImageUrlFromBody && String(doctorImageUrlFromBody).trim()) ||
      "";
    const doctorImagePublicId =
      (doctor.imagePublicId && String(doctor.imagePublicId).trim()) ||
      (doctorImagePublicIdFromBody && String(doctorImagePublicIdFromBody).trim()) ||
      "";

    const base = {
      doctorId: String(doctor._id || doctorId),
      doctorName,
      speciality,
      doctorImage: { url: doctorImageUrl, publicId: doctorImagePublicId },
      patientName: String(patientName).trim(),
      mobile: String(mobile).trim(),
      age: age ? Number(age) : undefined,
      gender: gender ? String(gender) : "",
      date: String(date),
      time: String(time),
      fees: numericFee,
      status: "Pending",
      payment: { method: paymentMethod === "Cash" ? "Cash" : "Online", status: "Pending", amount: numericFee },
      notes: notes || "",
      createdBy: clerkUserId,
      owner: resolvedOwner,
      sessionId: null,
      email: email || "",
    };

    if (numericFee === 0) {
      const created = await Appointment.create({
        ...base,
        status: "Confirmed",
        payment: { method: base.payment.method, status: "Paid", amount: 0 },
        paidAt: new Date(),
      });
      return res.status(201).json({ success: true, appointment: created, checkoutUrl: null });
    }

    if (paymentMethod === "Cash" || !stripe) {
      const created = await Appointment.create({
        ...base,
        status: "Pending",
        payment: { method: paymentMethod === "Online" && !stripe ? "Cash" : paymentMethod === "Cash" ? "Cash" : "Online", status: "Pending", amount: numericFee },
      });
      return res.status(201).json({ success: true, appointment: created, checkoutUrl: null });
    }

    const frontBase = buildFrontendBase(req);
    if (!frontBase) {
      return res.status(500).json({ success: false, message: "Frontend URL could not be determined. Set FRONTEND_URL." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: `Appointment - ${String(patientName).slice(0, 40)}` },
            unit_amount: Math.round(numericFee * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${frontBase}/appointment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontBase}/appointment/cancel`,
      metadata: {
        doctorId: String(doctorId),
        doctorName: doctorName || "",
        speciality: speciality || "",
        patientName: base.patientName,
        mobile: base.mobile,
        clerkUserId: clerkUserId || "",
      },
    });

    const created = await Appointment.create({
      ...base,
      sessionId: session.id,
      payment: { ...base.payment, providerId: session.payment_intent || "" },
      status: "Pending",
    });
    return res.status(201).json({ success: true, appointment: created, checkoutUrl: session.url || null });
  } catch (err) {
    console.error("createAppointment unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const session_id = req.body?.session_id || req.query?.session_id;
    if (!session_id) return res.status(400).json({ success: false, message: "session_id required" });
    if (!stripe) return res.status(500).json({ success: false, message: "Stripe not configured" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    let appt = await Appointment.findOneAndUpdate(
      { sessionId: session_id },
      {
        "payment.status": "Paid",
        "payment.providerId": session.payment_intent || null,
        status: "Confirmed",
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!appt) {
      return res.status(404).json({ success: false, message: "Appointment not found for this payment session" });
    }
    return res.json({ success: true, appointment: appt });
  } catch (err) {
    console.error("confirmPayment:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
    const body = req.body || {};
    const terminal = appt.status === "Completed" || appt.status === "Canceled";
    if (terminal && body.status && body.status !== appt.status) {
      return res.status(400).json({ success: false, message: "Cannot change status of a completed/canceled appointment" });
    }
    if (body.status) appt.status = body.status;
    if (body.notes !== undefined) appt.notes = body.notes;
    if (body.date && body.time) {
      if (terminal) return res.status(400).json({ success: false, message: "Cannot reschedule completed/canceled appointment" });
      appt.date = body.date;
      appt.time = body.time;
      appt.status = "Rescheduled";
      appt.rescheduledTo = { date: body.date, time: body.time };
    }
    await appt.save();
    return res.json({ success: true, data: appt, appointment: appt });
  } catch (err) {
    console.error("updateAppointment:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: "Not found" });
    if (appt.status === "Completed") {
      return res.status(400).json({ success: false, message: "Cannot cancel a completed appointment" });
    }
    appt.status = "Canceled";
    await appt.save();
    return res.json({ success: true, data: appt, appointment: appt });
  } catch (err) {
    console.error("cancelAppointment:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAppointmentStats = async (_req, res) => {
  try {
    const total = await Appointment.countDocuments();
    const paidAgg = await Appointment.aggregate([
      { $match: { "payment.status": "Paid" } },
      { $group: { _id: null, total: { $sum: "$fees" } } },
    ]);
    const revenue = (paidAgg[0] && paidAgg[0].total) || 0;
    const uniquePatients = await Appointment.distinct("mobile");
    return res.json({
      success: true,
      total,
      revenue,
      patients: uniquePatients.length,
      data: { total, revenue, patients: uniquePatients.length },
    });
  } catch (err) {
    console.error("getAppointmentStats:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
