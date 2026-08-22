import jwt from "jsonwebtoken";
import Doctor from "../models/Doctor.js";

export function optionalClerk(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token) {
    try {
      const payload = jwt.decode(token);
      const userId = payload?.sub || payload?.userId || payload?.id || null;
      if (userId) {
        req.auth = { userId };
        req.user = { id: userId };
      }
    } catch {
      /* ignore invalid tokens in demo mode */
    }
  }
  next();
}

export async function requireDoctor(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      return res.status(401).json({ success: false, message: "Doctor token required" });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET || "medicare-dev-secret");
    const doctor = await Doctor.findById(payload.id);
    if (!doctor) {
      return res.status(401).json({ success: false, message: "Doctor not found" });
    }
    req.doctor = doctor;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid doctor token" });
  }
}

export function optionalDoctor(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "medicare-dev-secret");
    req.doctorId = payload.id;
  } catch {
    /* ignore */
  }
  next();
}
