import Service from "../models/Service.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const parseJsonArrayField = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed;
      return typeof parsed === "string" ? [parsed] : [];
    } catch {
      return field
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
};

function normalizeSlotsToMap(slotStrings = []) {
  const map = {};
  slotStrings.forEach((raw) => {
    const m = String(raw).match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s*•\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) {
      map.unspecified = map.unspecified || [];
      map.unspecified.push(raw);
      return;
    }
    const [, day, monShort, year, hour, minute, ampm] = m;
    const monthIdx = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].findIndex(
      (x) => x.toLowerCase() === monShort.toLowerCase()
    );
    const mm = String(monthIdx + 1).padStart(2, "0");
    const dd = String(Number(day)).padStart(2, "0");
    const dateKey = `${year}-${mm}-${dd}`;
    const timeStr = `${String(Number(hour)).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm.toUpperCase()}`;
    map[dateKey] = map[dateKey] || [];
    map[dateKey].push(timeStr);
  });
  return map;
}

const sanitizePrice = (v) => Number(String(v ?? "0").replace(/[^\d.-]/g, "")) || 0;
const parseAvailability = (v) => {
  const s = String(v ?? "available").toLowerCase();
  return s === "available" || s === "true";
};

export const createService = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ success: false, message: "Service name is required" });
    const instructions = parseJsonArrayField(b.instructions);
    const rawSlots = parseJsonArrayField(b.slots);
    const slots = Object.keys(b.slots || {}).length && typeof b.slots === "object" && !Array.isArray(b.slots)
      ? b.slots
      : normalizeSlotsToMap(rawSlots);
    const numericPrice = sanitizePrice(b.price);
    const available = parseAvailability(b.availability);

    let imageUrl = b.imageUrl || null;
    let imagePublicId = null;
    if (req.file) {
      try {
        const up = await uploadToCloudinary(req.file.path, "services");
        imageUrl = up?.secure_url || `/uploads/${req.file.filename}`;
        imagePublicId = up?.public_id || null;
      } catch (err) {
        console.error("Cloudinary upload error:", err);
        imageUrl = `/uploads/${req.file.filename}`;
      }
    }

    const service = await Service.create({
      name: b.name,
      about: b.about || "",
      shortDescription: b.shortDescription || b.about || "",
      price: numericPrice,
      available,
      imageUrl,
      imagePublicId,
      instructions,
      slots,
      dates: Object.keys(slots || {}),
    });
    return res.status(201).json({ success: true, data: service, service });
  } catch (err) {
    console.error("createService:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getServices = async (_req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: services, services });
  } catch (err) {
    console.error("getServices:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });
    return res.json({ success: true, data: service, service });
  } catch (err) {
    console.error("getServiceById:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateService = async (req, res) => {
  try {
    const existing = await Service.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Service not found" });
    const b = req.body || {};
    const updateData = {};
    if (b.name !== undefined) updateData.name = b.name;
    if (b.about !== undefined) updateData.about = b.about;
    if (b.shortDescription !== undefined) updateData.shortDescription = b.shortDescription;
    if (b.price !== undefined) updateData.price = sanitizePrice(b.price);
    if (b.availability !== undefined) updateData.available = parseAvailability(b.availability);
    if (b.instructions !== undefined) updateData.instructions = parseJsonArrayField(b.instructions);
    if (b.slots !== undefined) {
      updateData.slots = Array.isArray(b.slots) || typeof b.slots === "string"
        ? normalizeSlotsToMap(parseJsonArrayField(b.slots))
        : b.slots;
    }

    if (req.file) {
      try {
        const up = await uploadToCloudinary(req.file.path, "services");
        if (up?.secure_url) {
          updateData.imageUrl = up.secure_url;
          updateData.imagePublicId = up.public_id || null;
          if (existing.imagePublicId) {
            try {
              await deleteFromCloudinary(existing.imagePublicId);
            } catch (err) {
              console.warn("Cloudinary delete failed:", err?.message || err);
            }
          }
        } else {
          updateData.imageUrl = `/uploads/${req.file.filename}`;
        }
      } catch (err) {
        console.error("Cloudinary upload error:", err);
      }
    }

    const service = await Service.findByIdAndUpdate(req.params.id, updateData, { new: true });
    return res.json({ success: true, data: service, service });
  } catch (err) {
    console.error("updateService:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });
    if (service.imagePublicId) deleteFromCloudinary(service.imagePublicId).catch(() => {});
    return res.json({ success: true, message: "Service removed" });
  } catch (err) {
    console.error("deleteService:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
