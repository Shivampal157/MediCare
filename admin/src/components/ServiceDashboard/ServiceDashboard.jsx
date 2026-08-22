import { useEffect, useState } from "react";
import { serviceDashboardStyles as s } from "../../assets/dummyStyles.js";
import { API_BASE } from "../../lib/api.js";

export default function ServiceDashboard() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/service-appointments/stats/summary`);
        const json = await res.json();
        setServices(json.data || json.services || []);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold text-emerald-800">Service Dashboard</h1>
        {error && <p className="text-rose-600">{error}</p>}
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-3">Service</th>
                <th className="p-3">Appointments</th>
                <th className="p-3">Completed</th>
                <th className="p-3">Canceled</th>
                <th className="p-3">Earning</th>
              </tr>
            </thead>
            <tbody>
              {services.map((item) => (
                <tr key={item._id} className="border-b">
                  <td className="p-3">{item.name}</td>
                  <td className="p-3">{item.totalAppointments || 0}</td>
                  <td className="p-3">{item.completed || 0}</td>
                  <td className="p-3">{item.canceled || 0}</td>
                  <td className="p-3">₹{item.earning || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
