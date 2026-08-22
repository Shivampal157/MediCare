import Doctor from "../models/Doctor.js";
import Service from "../models/Service.js";

const hits = new Map();

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || "unknown";
}

function allowRequest(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length >= 20) {
    hits.set(ip, list);
    return false;
  }
  list.push(now);
  hits.set(ip, list);
  return true;
}

function cleanText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f]/g, " ")
    .trim()
    .slice(0, 500);
}

async function clinicContext() {
  const [doctors, services] = await Promise.all([
    Doctor.find().select("name specialization fee location").limit(12).lean(),
    Service.find().select("name price shortDescription").limit(12).lean(),
  ]);
  const doctorLines = doctors
    .map((d) => `- ${d.name} (${d.specialization || "General"}), fee ₹${d.fee || 0}, ${d.location || "Varanasi"}`)
    .join("\n");
  const serviceLines = services
    .map((s) => `- ${s.name}, ₹${s.price || 0}${s.shortDescription ? ` — ${s.shortDescription}` : ""}`)
    .join("\n");
  return { doctorLines, serviceLines };
}

function systemPrompt(doctorLines, serviceLines) {
  return `You are the MediCare clinic assistant for a hospital in Varanasi, Uttar Pradesh, India.
Phone/WhatsApp: +91 8081414473
Email: shivam10palpal@gmail.com
UPI: 8081414473@ptyes
Hours: Mon–Sat, 9:00 AM–6:00 PM
Website paths: /doctors, /services, /appointments, /payments, /contact

Doctors:
${doctorLines || "- Check the Doctors page"}

Services:
${serviceLines || "- Check the Services page"}

Rules:
- Help the patient choose a specialty, doctor, diagnostic test, or booking step.
- Never diagnose, never prescribe medicine, never give lab result interpretation.
- If it sounds like an emergency (chest pain, unconscious, heavy bleeding, difficulty breathing), tell them to call 108 / go to ER immediately.
- Keep answers short (under 120 words). Reply in the same language the patient used (Hindi or English).
- Suggest the matching doctor/service by name when possible, and tell them to open Doctors or Services to book.
- You are not a replacement for a doctor. Add a one-line disclaimer at the end.`;
}

async function generateWithGemini(apiKey, model, contents, instruction) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instruction }] },
      contents,
      generationConfig: { temperature: 0.5, maxOutputTokens: 400 },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Gemini error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n").trim();
  if (!text) throw new Error("Empty AI response");
  return text;
}

export async function chat(req, res) {
  try {
    const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "AI assistant is not configured yet. Add GEMINI_API_KEY on the server.",
      });
    }
    if (!allowRequest(clientIp(req))) {
      return res.status(429).json({ success: false, message: "Too many questions. Please wait a few minutes." });
    }

    const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const history = incoming
      .slice(-10)
      .map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        text: cleanText(item.text || item.content),
      }))
      .filter((item) => item.text);

    if (!history.length || history[history.length - 1].role !== "user") {
      return res.status(400).json({ success: false, message: "Please type a question." });
    }

    const { doctorLines, serviceLines } = await clinicContext();
    const contents = history.map((item) => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));
    while (contents.length && contents[0].role === "model") contents.shift();
    if (!contents.length) {
      return res.status(400).json({ success: false, message: "Please type a question." });
    }

    const models = [process.env.GEMINI_MODEL, "gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"].filter(Boolean);
    let reply = "";
    let lastError = null;
    for (const model of [...new Set(models)]) {
      try {
        reply = await generateWithGemini(apiKey, model, contents, systemPrompt(doctorLines, serviceLines));
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!reply) {
      return res.status(502).json({
        success: false,
        message: lastError?.message || "AI is busy. Please try again.",
      });
    }

    return res.json({ success: true, reply });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "AI request failed" });
  }
}
