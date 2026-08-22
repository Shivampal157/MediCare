import { useEffect, useState } from "react";
import { dashboardStyles as s } from "../../assets/dummyStyles.js";
import { API_BASE } from "../../lib/api.js";

export default function DashboardPage() {
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState({ patients: 0, total: 0, revenue: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [docsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/api/doctors?limit=200`),
          fetch(`${API_BASE}/api/appointments/stats`),
        ]);
        const docsJson = await docsRes.json();
        const statsJson = await statsRes.json();
        setDoctors(docsJson.data || docsJson.doctors || []);
        setStats(statsJson.data || statsJson);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold text-emerald-800">Dashboard</h1>
        {error && <p className="text-rose-600">{error}</p>}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow">Doctors: {doctors.length}</div>
          <div className="rounded-2xl bg-white p-4 shadow">Appointments: {stats.total || 0}</div>
          <div className="rounded-2xl bg-white p-4 shadow">Patients: {stats.patients || 0}</div>
        </div>
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-3">Doctor</th>
                <th className="p-3">Specialization</th>
                <th className="p-3">Fee</th>
                <th className="p-3">Appointments</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d._id || d.id} className="border-b">
                  <td className="p-3">{d.name}</td>
                  <td className="p-3">{d.specialization}</td>
                  <td className="p-3">₹{d.fee}</td>
                  <td className="p-3">{d.appointmentsTotal || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
