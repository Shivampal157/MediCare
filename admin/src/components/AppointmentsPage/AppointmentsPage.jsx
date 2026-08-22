import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { pageStyles, statusClasses } from "../../assets/dummyStyles.js";
import { API_BASE } from "../../lib/api.js";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/appointments?limit=200`);
      const json = await res.json();
      setAppointments(json.appointments || json.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id) {
    await fetch(`${API_BASE}/api/appointments/${id}/cancel`, { method: "POST" });
    await load();
  }

  return (
    <main className={pageStyles.container}>
      <div className={pageStyles.maxWidthContainer}>
        <h1 className={pageStyles.headerTitle}>Appointments</h1>
        {loading && <p>Loading...</p>}
        {error && <p className="text-rose-600">{error}</p>}
        <div className={pageStyles.gridContainer}>
          {appointments.map((a) => (
            <article key={a._id} className={pageStyles.card}>
              <div className={pageStyles.cardHeader}>
                <h3 className={pageStyles.cardTitle}>{a.patientName}</h3>
              </div>
              <p className={pageStyles.doctorInfo}>
                <span className={pageStyles.doctorSpeciality}>{a.doctorName}</span>
              </p>
              <div className={pageStyles.slotContainer}>
                <Calendar size={14} className={pageStyles.slotIcon} />
                {a.date} • {a.time}
              </div>
              <span className={`${pageStyles.statusBadge} ${statusClasses(a.status)}`}>{a.status}</span>
              {a.status !== "Canceled" && a.status !== "Completed" && (
                <button type="button" className={pageStyles.cancelButton(false, false)} onClick={() => cancel(a._id)}>
                  Cancel
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
