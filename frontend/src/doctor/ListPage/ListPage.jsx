import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { listPageStyles as s } from "../../assets/dummyStyles.js";
import { API_BASE } from "../../lib/api.js";

export default function ListPage() {
  const { id: doctorId } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/appointments/doctor/${encodeURIComponent(doctorId)}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "Failed to load");
        setAppointments(body.appointments || body.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (doctorId) load();
  }, [doctorId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((a) => !q || String(a.patientName || "").toLowerCase().includes(q));
  }, [appointments, search]);

  async function updateStatus(id, status) {
    await fetch(`${API_BASE}/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setAppointments((prev) => prev.map((a) => (String(a._id) === String(id) ? { ...a, status } : a)));
  }

  return (
    <main className={s.pageContainer}>
      <div className={s.contentWrapper}>
        <h1 className="mb-4 text-2xl font-semibold text-emerald-800">Appointments</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient"
          className="mb-6 w-full max-w-md rounded-full border px-4 py-2"
        />
        {loading && <p>Loading...</p>}
        {error && <p className="text-rose-600">{error}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((a) => (
            <article key={a._id} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow">
              <h3 className="font-semibold">{a.patientName}</h3>
              <p className="text-sm text-emerald-700">{a.date} • {a.time}</p>
              <p className="text-sm">Status: {a.status}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="rounded-full bg-emerald-600 px-3 py-1 text-sm text-white" onClick={() => updateStatus(a._id, "Confirmed")}>Confirm</button>
                <button type="button" className="rounded-full bg-rose-100 px-3 py-1 text-sm text-rose-700" onClick={() => updateStatus(a._id, "Canceled")}>Cancel</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
