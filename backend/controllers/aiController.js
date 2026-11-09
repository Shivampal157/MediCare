import Doctor from "../models/Doctor.js";
import Service from "../models/Service.js";
import { circuitBreakers } from "../distributed/circuitBreaker.js";
import { resilientStore } from "../distributed/resilientStore.js";

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
  let doctors = [];
  let services = [];

  if (resilientStore.isMongoConnected()) {
    [doctors, services] = await Promise.all([
      Doctor.find().select("name specialization fee location").limit(12).lean().catch(() => []),
      Service.find().select("name price shortDescription").limit(12).lean().catch(() => []),
    ]);
  }
  if (!doctors.length) doctors = resilientStore.doctors;
  if (!services.length) services = resilientStore.services;

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

function buildLocalFallbackReply(userQuestion = "") {
  const q = userQuestion.toLowerCase();
  if (/chest pain|unconscious|bleeding|breath|stroke|heart attack|emergency|108/.test(q)) {
    return "⚠️ Emergency Alert: Please call 108 or visit the nearest Emergency Room immediately. Do not wait for an online appointment.\n\n(Disclaimer: MediCare AI provides clinic navigation only, not medical advice.)";
  }
  if (/heart|bp|blood pressure|cardio|chest|ecg|cholesterol/.test(q)) {
    return "For heart, BP, or ECG concerns, we recommend consulting **Dr. Rahul Sharma** (Cardiologist, ₹500) or **Dr. Sarah Johnson** (Cardiologist, ₹750), or booking a **Blood Pressure & ECG Check** (₹199) on the Services page.\n\n(Disclaimer: This is for clinic guidance only, not a medical diagnosis.)";
  }
  if (/child|baby|kid|vaccine|pediatric|fever/.test(q)) {
    return "For children's health, fever, or vaccinations, you can book an appointment with **Dr. Emily Rodriguez** (Pediatrician, ₹600) from our Doctors page.\n\n(Disclaimer: This is for clinic guidance only, not a medical diagnosis.)";
  }
  if (/ear|nose|throat|sinus|tonsil|ent|hearing/.test(q)) {
    return "For ear, sinus, or throat symptoms, we recommend **Dr. Rohan Mehta** (ENT Specialist, ₹600) on the Doctors page.\n\n(Disclaimer: This is for clinic guidance only, not a medical diagnosis.)";
  }
  if (/kidney|urine|renal|dialysis|stone/.test(q)) {
    return "For kidney or urinary concerns, please consult **Dr. Kabir Malhotra** (Nephrologist, ₹700) on our Doctors page.\n\n(Disclaimer: This is for clinic guidance only, not a medical diagnosis.)";
  }
  if (/sugar|diabetes|checkup|blood test|xray|x-ray|test|lab/.test(q)) {
    return "You can book diagnostic tests directly on our **Services** page:\n• **Full Body Health Checkup** (₹999)\n• **Blood Sugar & HbA1c Test** (₹249)\n• **X-Ray Scan** (₹499)\n• **Blood Pressure Check** (₹199)\n\n(Disclaimer: This is for clinic guidance only, not a medical diagnosis.)";
  }
  return "Welcome to MediCare Hospital, Varanasi! 🏥\n• Heart/BP: **Dr. Rahul Sharma** (Cardiologist, ₹500)\n• Child Care: **Dr. Emily Rodriguez** (Pediatrician, ₹600)\n• ENT/Throat: **Dr. Rohan Mehta** (ENT, ₹600)\n• Kidney: **Dr. Kabir Malhotra** (Nephrologist, ₹700)\n• Lab Tests: **Full Body Checkup** (₹999), **Blood Sugar** (₹249), **X-Ray** (₹499).\nOpen the **Doctors** or **Services** tab to book your slot, or WhatsApp us at +91 8081414473.\n\n(Disclaimer: General clinic guidance only, not medical advice.)";
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

    const lastUserMessage = history[history.length - 1].text;
    const apiKey = String(process.env.GEMINI_API_KEY || "").trim();

    if (!apiKey) {
      res.setHeader("X-AI-Mode", "LOCAL-CLINICAL-TRIAGE-FALLBACK");
      return res.json({
        success: true,
        reply: buildLocalFallbackReply(lastUserMessage),
        mode: "fallback-triage",
      });
    }

    const { doctorLines, serviceLines } = await clinicContext();
    const contents = history.map((item) => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));
    while (contents.length && contents[0].role === "model") contents.shift();

    // Protected by Distributed Circuit Breaker with automatic local clinical triage fallback
    const result = await circuitBreakers.geminiAi.execute(
      async () => {
        const models = [
          process.env.GEMINI_MODEL,
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-flash-latest",
        ].filter(Boolean);
        let lastError = null;
        for (const model of [...new Set(models)]) {
          try {
            const reply = await generateWithGemini(apiKey, model, contents, systemPrompt(doctorLines, serviceLines));
            return { reply, mode: `gemini:${model}` };
          } catch (err) {
            lastError = err;
          }
        }
        throw lastError || new Error("All Gemini models failed");
      },
      () => ({
        reply: buildLocalFallbackReply(lastUserMessage),
        mode: "circuit-breaker-fallback",
      })
    );

    res.setHeader("X-AI-Mode", result.mode);
    return res.json({ success: true, reply: result.reply, mode: result.mode });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "AI request failed" });
  }
}
