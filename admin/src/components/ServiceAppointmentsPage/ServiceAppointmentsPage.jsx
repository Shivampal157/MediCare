import { useEffect, useState } from "react";
import { Calendar, Phone, User } from "lucide-react";
import { serviceAppointmentsStyles as s } from "../../assets/dummyStyles.js";
import { API_BASE } from "../../lib/api.js";

export default function ServiceAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`${API_BASE}/api/service-appointments?limit=500`);
    const json = await res.json();
    setAppointments(json.appointments || json.data || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function cancel(id) {
    await fetch(`${API_BASE}/api/service-appointments/${id}/cancel`, { method: "POST" });
    await load();
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold text-emerald-800">Service Appointments</h1>
        {error && <p className="text-rose-600">{error}</p>}
        <div className="grid gap-4">
          {appointments.map((a) => (
            <article key={a._id} className="rounded-2xl bg-white p-4 shadow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <User size={16} /> {a.patientName}
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-sm text-emerald-700">
                    <Phone size={14} /> {a.mobile}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm">
                    <Calendar size={14} /> {a.date} • {a.hour}:{String(a.minute).padStart(2, "0")} {a.ampm}
                  </p>
                  <p className="mt-1 text-sm">{a.serviceName} — {a.status}</p>
                </div>
                {a.status !== "Canceled" && (
                  <button type="button" className="rounded-full bg-rose-100 px-4 py-2 text-rose-700" onClick={() => cancel(a._id)}>
                    Cancel
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
