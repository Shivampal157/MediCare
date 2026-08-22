import { useState } from "react";
import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { HOSPITAL_EMAIL, HOSPITAL_LOCATION, HOSPITAL_MAP_EMBED, HOSPITAL_PHONE } from "../../lib/api.js";

export default function ContactPage() {
  const initial = { name: "", email: "", phone: "", department: "", service: "", message: "" };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const departments = ["General Physician", "Cardiology", "Orthopedics", "Dermatology", "Pediatrics", "Gynecology", "ENT", "Oncology", "Nephrology"];
  const services = ["General Consultation", "Echocardiography", "X-Ray Scan", "Blood Pressure Check", "Blood Sugar Test", "Full Body Health Checkup"];
  const field = "w-full rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300";

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Full name is required";
    if (!form.email.trim()) next.email = "Email is required";
    if (!form.phone.trim()) next.phone = "Phone number is required";
    if (!form.message.trim()) next.message = "Please write a short message";
    setErrors(next);
    if (Object.keys(next).length) return;
    const text = `*Contact Request*\nName: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nDepartment: ${form.department || "N/A"}\nService: ${form.service || "N/A"}\nMessage: ${form.message}`;
    window.open(`https://wa.me/91${HOSPITAL_PHONE}?text=${encodeURIComponent(text)}`, "_blank");
    setForm(initial);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-green-50 px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="rounded-[28px] bg-white p-6 shadow-xl sm:p-8">
          <h1 className="font-serif text-3xl font-bold text-[#0f5c3a] sm:text-4xl">Contact Our Clinic</h1>
          <p className="mt-2 mb-6 text-sm italic text-emerald-700">
            Fill the form — we'll open WhatsApp so you can connect with us instantly.
          </p>
          {sent ? <p className="mb-3 text-emerald-700">WhatsApp is opening with your message.</p> : null}
          <label className="mb-1 block text-sm font-semibold text-emerald-800">Full Name</label>
          <input name="name" value={form.name} onChange={handleChange} className={field} />
          {errors.name ? <p className="mt-1 text-sm text-rose-600">{errors.name}</p> : null}
          <label className="mt-4 mb-1 block text-sm font-semibold text-emerald-800">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className={field} />
          {errors.email ? <p className="mt-1 text-sm text-rose-600">{errors.email}</p> : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Phone size={14} /> Phone
              </label>
              <input name="phone" value={form.phone} onChange={handleChange} maxLength="10" className={field} />
              {errors.phone ? <p className="mt-1 text-sm text-rose-600">{errors.phone}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-emerald-800">Department</label>
              <select name="department" value={form.department} onChange={handleChange} className={field}>
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="mt-4 mb-1 block text-sm font-semibold text-emerald-800">Service</label>
          <select name="service" value={form.service} onChange={handleChange} className={field}>
            <option value="">Select Service</option>
            {services.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <label className="mt-4 mb-1 block text-sm font-semibold text-emerald-800">Message</label>
          <textarea name="message" value={form.message} onChange={handleChange} className={`${field} min-h-28 rounded-2xl`} />
          {errors.message ? <p className="mt-1 text-sm text-rose-600">{errors.message}</p> : null}
          <button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f7a4a] py-3 font-semibold text-white">
            <Send size={16} /> Send via WhatsApp
          </button>
        </form>

        <div className="space-y-5">
          <div className="rounded-[28px] bg-white p-6 shadow-md">
            <h2 className="font-serif text-2xl font-bold text-[#0f5c3a]">Visit Our Clinic</h2>
            <p className="mt-3 flex items-start gap-2 text-emerald-800">
              <MapPin size={18} className="mt-0.5 shrink-0" /> {HOSPITAL_LOCATION}
            </p>
            <p className="mt-2 flex items-center gap-2 text-emerald-800">
              <Phone size={18} /> {HOSPITAL_PHONE}
            </p>
            <p className="mt-2 flex items-center gap-2 text-emerald-800">
              <Mail size={18} /> {HOSPITAL_EMAIL}
            </p>
          </div>
          <iframe
            src={HOSPITAL_MAP_EMBED}
            className="h-64 w-full rounded-[28px] border-0 shadow-md"
            title="Varanasi Map"
            loading="lazy"
            allowFullScreen
          />
          <div className="rounded-[28px] bg-[#d9f3e3] p-6">
            <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-[#0f5c3a]">
              <Clock size={18} /> Clinic Hours
            </h3>
            <p className="mt-2 text-emerald-800">Mon - Sat: 9:00 AM - 6:00 PM</p>
          </div>
        </div>
      </div>
    </main>
  );
}
