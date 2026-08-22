import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const parseTimeToMinutes = (t = "") => {
  const [time = "0:00", ampm = ""] = (t || "").split(" ");
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  let h = hh % 12;
  if ((ampm || "").toUpperCase() === "PM") h += 12;
  return h * 60 + (mm || 0);
};

function dedupeAndSortSchedule(schedule = {}) {
  const out = {};
  Object.entries(schedule).forEach(([date, slots]) => {
    if (!Array.isArray(slots)) return;
    const uniq = Array.from(new Set(slots));
    uniq.sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
    out[date] = uniq;
  });
  return out;
}

function parseScheduleInput(s) {
  if (!s) return {};
  if (typeof s === "string") {
    try {
      s = JSON.parse(s);
    } catch {
      return {};
    }
  }
  return dedupeAndSortSchedule(s || {});
}

function normalizeDocForClient(raw = {}) {
  const doc = { ...raw };
  if (doc.schedule && typeof doc.schedule.forEach === "function") {
    const obj = {};
    doc.schedule.forEach((val, key) => {
      obj[key] = Array.isArray(val) ? val : [];
    });
    doc.schedule = obj;
  } else if (!doc.schedule || typeof doc.schedule !== "object") {
    doc.schedule = {};
  }
  doc.availability = doc.availability === undefined ? "Available" : doc.availability;
  doc.patients = doc.patients ?? "";
  doc.rating = doc.rating ?? 0;
  doc.fee = doc.fee ?? doc.fees ?? 0;
  return doc;
}

function signDoctorToken(doctor) {
  return jwt.sign(
    { id: doctor._id, email: doctor.email, role: "doctor" },
    process.env.JWT_SECRET || "medicare-dev-secret",
    { expiresIn: "7d" }
  );
}

export const createDoctor = async (req, res) => {
  try {
    const body = req.body || {};
    const emailLC = String(body.email || "").trim().toLowerCase();
    if (!emailLC || !body.password || !body.name) {
      return res.status(400).json({ success: false, message: "name, email and password are required" });
    }
    const exists = await Doctor.findOne({ email: emailLC });
    if (exists) return res.status(409).json({ success: false, message: "Email already in use" });

    let imageUrl = body.imageUrl || null;
    let imagePublicId = body.imagePublicId || null;
    if (req.file?.path) {
      const uploaded = await uploadToCloudinary(req.file.path, "doctors");
      imageUrl = uploaded?.secure_url || `/uploads/${req.file.filename}`;
      imagePublicId = uploaded?.public_id || null;
    }

    const schedule = parseScheduleInput(body.schedule);
    const doc = await Doctor.create({
      email: emailLC,
      password: body.password,
      name: body.name,
      specialization: body.specialization || "",
      imageUrl,
      imagePublicId,
      availability: body.availability || "Available",
      experience: body.experience || "",
      qualifications: body.qualifications || "",
      location: body.location || "",
      about: body.about || "",
      fee: body.fee !== undefined ? Number(body.fee) : 0,
      schedule,
      success: body.success || "",
      patients: body.patients || "",
      rating: body.rating !== undefined ? Number(body.rating) : 0,
      owner: process.env.MAJOR_ADMIN_ID || "admin",
    });

    const out = normalizeDocForClient(doc.toObject());
    delete out.password;
    const token = signDoctorToken(doc);
    return res.status(201).json({ success: true, data: out, token });
  } catch (err) {
    console.error("createDoctor:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const loginDoctor = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = req.body?.password || "";
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }
    const doctor = await Doctor.findOne({ email });
    if (!doctor) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const ok = await doctor.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const token = signDoctorToken(doctor);
    const data = normalizeDocForClient(doctor.toObject());
    delete data.password;
    return res.json({ success: true, token, data, doctor: data });
  } catch (err) {
    console.error("loginDoctor:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getDoctors = async (req, res) => {
  try {
    const { q = "", limit: limitRaw = 200, page: pageRaw = 1 } = req.query;
    const limit = Math.min(500, Math.max(1, parseInt(limitRaw, 10) || 200));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const match = {};
    if (q && typeof q === "string" && q.trim()) {
      const re = new RegExp(q.trim(), "i");
      match.$or = [{ name: re }, { specialization: re }, { speciality: re }, { email: re }];
    }

    const docs = await Doctor.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "appointments",
          localField: "_id",
          foreignField: "doctorId",
          as: "appointments",
        },
      },
      {
        $addFields: {
          appointmentsTotal: { $size: "$appointments" },
          appointmentsCompleted: {
            $size: {
              $filter: { input: "$appointments", as: "a", cond: { $in: ["$$a.status", ["Confirmed", "Completed"]] } },
            },
          },
          appointmentsCanceled: {
            $size: {
              $filter: { input: "$appointments", as: "a", cond: { $eq: ["$$a.status", "Canceled"] } },
            },
          },
          earnings: {
            $sum: {
              $map: {
                input: {
                  $filter: { input: "$appointments", as: "a", cond: { $in: ["$$a.status", ["Confirmed", "Completed"]] } },
                },
                as: "p",
                in: { $ifNull: ["$$p.fees", 0] },
              },
            },
          },
        },
      },
      { $project: { appointments: 0, password: 0 } },
      { $sort: { name: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const normalized = docs.map((d) => ({
      _id: d._id,
      id: d._id,
      name: d.name || "",
      email: d.email || "",
      specialization: d.specialization || d.speciality || "",
      fee: d.fee ?? d.fees ?? d.consultationFee ?? 0,
      imageUrl: d.imageUrl || d.image || d.avatar || null,
      appointmentsTotal: d.appointmentsTotal || 0,
      appointmentsCompleted: d.appointmentsCompleted || 0,
      appointmentsCanceled: d.appointmentsCanceled || 0,
      earnings: d.earnings || 0,
      availability: d.availability ?? "Available",
      schedule: d.schedule && typeof d.schedule === "object" ? d.schedule : {},
      patients: d.patients ?? "",
      rating: d.rating ?? 0,
      about: d.about ?? "",
      experience: d.experience ?? "",
      qualifications: d.qualifications ?? "",
      location: d.location ?? "",
      success: d.success ?? "",
      raw: d,
    }));

    const total = await Doctor.countDocuments(match);
    return res.json({ success: true, data: normalized, doctors: normalized, meta: { page, limit, total } });
  } catch (err) {
    console.error("getDoctors:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid doctor id" });
    }
    const doctor = await Doctor.findById(id).select("-password");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    const out = normalizeDocForClient(doctor.toObject());
    return res.json({ success: true, data: out, doctor: out });
  } catch (err) {
    console.error("getDoctorById:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export async function updateDoctor(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const existing = await Doctor.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Doctor not found" });

    if (req.doctor && String(req.doctor._id) !== String(id)) {
      return res.status(403).json({ success: false, message: "Not authorized to update this doctor" });
    }

    if (req.file?.path) {
      const uploaded = await uploadToCloudinary(req.file.path, "doctors");
      if (uploaded?.secure_url) {
        const previousPublicId = existing.imagePublicId;
        existing.imageUrl = uploaded.secure_url;
        existing.imagePublicId = uploaded.public_id || existing.imagePublicId;
        if (previousPublicId && previousPublicId !== existing.imagePublicId) {
          deleteFromCloudinary(previousPublicId).catch(() => {});
        }
      } else {
        existing.imageUrl = `/uploads/${req.file.filename}`;
      }
    } else if (body.imageUrl) {
      existing.imageUrl = body.imageUrl;
    }

    if (body.schedule) existing.schedule = parseScheduleInput(body.schedule);

    const updatable = [
      "name",
      "specialization",
      "experience",
      "qualifications",
      "location",
      "about",
      "fee",
      "availability",
      "success",
      "patients",
      "rating",
    ];
    updatable.forEach((k) => {
      if (body[k] !== undefined) existing[k] = body[k];
    });

    if (body.email && body.email !== existing.email) {
      const other = await Doctor.findOne({ email: body.email.toLowerCase() });
      if (other && other._id.toString() !== id) {
        return res.status(409).json({ success: false, message: "Email already in use" });
      }
      existing.email = body.email.toLowerCase();
    }
    if (body.password) existing.password = body.password;

    await existing.save();
    const out = normalizeDocForClient(existing.toObject());
    delete out.password;
    return res.json({ success: true, data: out });
  } catch (err) {
    console.error("updateDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    if (doctor.imagePublicId) deleteFromCloudinary(doctor.imagePublicId).catch(() => {});
    return res.json({ success: true, message: "Doctor removed" });
  } catch (err) {
    console.error("deleteDoctor:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
