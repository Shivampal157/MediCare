import { useState } from "react";
import { addServiceStyles as s } from "../../assets/dummyStyles.js";
import { API_BASE } from "../../lib/api.js";

export default function AddService() {
  const [form, setForm] = useState({
    name: "",
    shortDescription: "",
    about: "",
    price: "999",
    availability: "available",
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
      const res = await fetch(`${API_BASE}/api/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to add service");
      setMessage("Service added successfully.");
      setForm({ name: "", shortDescription: "", about: "", price: "999", availability: "available" });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow">
        <h1 className="mb-6 text-3xl font-bold text-emerald-800">Add Service</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" value={form.name} onChange={update} placeholder="Service name" className="w-full rounded-full border px-4 py-3" required />
          <input name="shortDescription" value={form.shortDescription} onChange={update} placeholder="Short description" className="w-full rounded-full border px-4 py-3" />
          <input name="price" value={form.price} onChange={update} placeholder="Price" className="w-full rounded-full border px-4 py-3" />
          <textarea name="about" value={form.about} onChange={update} placeholder="About" className="w-full rounded-2xl border px-4 py-3" />
          <button type="submit" disabled={loading} className="rounded-full bg-emerald-600 px-6 py-3 text-white">
            {loading ? "Saving..." : "Save service"}
          </button>
          {message && <p className="text-emerald-800">{message}</p>}
        </form>
      </div>
    </main>
  );
}
