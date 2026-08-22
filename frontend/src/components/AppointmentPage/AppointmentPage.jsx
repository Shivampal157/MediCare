import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";
import { appointmentPageStyles as s, cardStyles, badgeStyles } from "../../assets/dummyStyles.js";
import { API_BASE } from "../../lib/api.js";

const API = axios.create({ baseURL: API_BASE });

export default function AppointmentPage() {
  const { isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const [doctorAppts, setDoctorAppts] = useState([]);
  const [serviceAppts, setServiceAppts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    let token = null;
    try {
      token = await getToken();
    } catch {
      token = null;
    }
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const [doctorsResp, servicesResp] = await Promise.all([
        API.get("/api/appointments/me", { headers, params: user?.id ? { createdBy: user.id } : {} }),
        API.get("/api/service-appointments/me", { headers, params: user?.id ? { createdBy: user.id } : {} }),
      ]);
      setDoctorAppts(doctorsResp?.data?.appointments ?? doctorsResp?.data?.data ?? []);
      setServiceAppts(servicesResp?.data?.appointments ?? servicesResp?.data?.data ?? []);
    } catch (err) {
      console.error(err);
      setError("Sign in as a patient to view your bookings, or book a new appointment.");
      setDoctorAppts([]);
      setServiceAppts([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className={s.pageContainer}>
      <div className={s.maxWidthContainer}>
        <h1 className={s.doctorTitle}>My Appointments</h1>
        {loading && <p className={s.loadingText}>Loading appointments...</p>}
        {error && <p className={s.emptyStateText}>{error}</p>}
        <div className={s.doctorGrid}>
          {doctorAppts.length === 0 && !loading ? <p className={s.emptyStateText}>No doctor appointments yet.</p> : null}
          {doctorAppts.map((item) => (
            <article key={item._id || item.id} className={cardStyles.doctorCard}>
              <h3 className={cardStyles.doctorName}>{item.doctorName || "Doctor"}</h3>
              <p className={cardStyles.specialization}>{item.speciality}</p>
              <p className={cardStyles.dateContainer}>{item.date} • {item.time}</p>
              <span className={badgeStyles.statusBadge[(item.status || "pending").toLowerCase()] || badgeStyles.statusBadge.default}>
                {item.status}
              </span>
            </article>
          ))}
        </div>
        <h2 className={s.serviceTitle}>Service Bookings</h2>
        <div className={s.serviceGrid}>
          {serviceAppts.length === 0 && !loading ? <p className={s.serviceEmptyStateText}>No service bookings yet.</p> : null}
          {serviceAppts.map((item) => (
            <article key={item._id || item.id} className={cardStyles.serviceCard}>
              <h3 className={cardStyles.serviceName}>{item.serviceName}</h3>
              <p className={cardStyles.price}>₹{item.fees}</p>
              <p className={cardStyles.serviceDateContainer}>{item.date}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
