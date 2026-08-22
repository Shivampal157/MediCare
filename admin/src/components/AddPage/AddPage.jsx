import { useState } from "react";
import { doctorDetailStyles as s } from "../../assets/dummyStyles.js";
import { API_BASE } from "../../lib/api.js";

export default function AddPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "123456",
    specialization: "",
    experience: "",
    qualifications: "",
    location: "",
    about: "",
    fee: "500",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function update(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/doctors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to add doctor");
      setMessage("Doctor added successfully.");
      setForm({ name: "", email: "", password: "123456", specialization: "", experience: "", qualifications: "", location: "", about: "", fee: "500" });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={s.pageContainer}>
      <div className={s.maxWidthContainer}>
        <h1 className={s.headerTitle}>Add Doctor</h1>
        <form onSubmit={handleSubmit} className={s.formContainer}>
          <div className={s.formGrid}>
            {["name", "email", "password", "specialization", "experience", "qualifications", "location", "fee"].map((key) => (
              <input key={key} name={key} value={form[key]} onChange={update} placeholder={key} className={s.inputBase} type={key === "password" ? "password" : "text"} required={["name", "email", "password"].includes(key)} />
            ))}
            <textarea name="about" value={form.about} onChange={update} placeholder="about" className={`${s.textareaBase} md:col-span-2`} />
          </div>
          <button type="submit" disabled={loading} className="mt-6 rounded-full bg-emerald-600 px-6 py-3 text-white">
            {loading ? "Saving..." : "Save doctor"}
          </button>
          {message && <p className="mt-3 text-emerald-800">{message}</p>}
        </form>
      </div>
    </main>
  );
}
