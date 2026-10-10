import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronsRight, Trophy, RefreshCw } from "lucide-react";
import { API_BASE } from "../../lib/api.js";
import HD1 from "../../assets/HD1.png";
import HD2 from "../../assets/HD2.png";
import HD3 from "../../assets/HD3.png";
import HD4 from "../../assets/HD4.png";
import HD5 from "../../assets/HD5.png";
import HD6 from "../../assets/HD6.png";
import HD7 from "../../assets/HD7.png";
import HD8 from "../../assets/HD8.png";

const FALLBACKS = [HD1, HD2, HD3, HD4, HD5, HD6, HD7, HD8];

// Static fallback doctors shown when backend is unreachable
const STATIC_DOCTORS = [
  { id: "s1", name: "Dr. Rahul Sharma", specialization: "Cardiologist", image: HD1, experience: "10 years", available: true, raw: null },
  { id: "s2", name: "Dr. Sarah Johnson", specialization: "Cardiologist", image: HD2, experience: "9 years", available: true, raw: null },
  { id: "s3", name: "Dr. Emily Rodriguez", specialization: "Pediatrician", image: HD3, experience: "8 years", available: true, raw: null },
  { id: "s4", name: "Dr. David Kim", specialization: "Oncologist", image: HD4, experience: "7 years", available: true, raw: null },
  { id: "s5", name: "Dr. Kabir Malhotra", specialization: "Nephrologist", image: HD5, experience: "7 years", available: true, raw: null },
  { id: "s6", name: "Dr. Rohan Mehta", specialization: "ENT Specialist", image: HD6, experience: "5 years", available: true, raw: null },
  { id: "s7", name: "Dr. Priya Kapoor", specialization: "Dermatologist", image: HD7, experience: "6 years", available: true, raw: null },
  { id: "s8", name: "Dr. Arjun Nair", specialization: "Orthopedic", image: HD8, experience: "8 years", available: true, raw: null },
];

export default function HomeDoctors({ previewCount = 8 }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setBackendDown(false);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_BASE}/api/doctors`, { signal: controller.signal });
      clearTimeout(timeout);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setBackendDown(true);
        return;
      }
      const items = (json && (json.data || json)) || [];
      const normalized = (Array.isArray(items) ? items : []).map((d, index) => ({
        id: d._id || d.id,
        name: d.name || "Unknown",
        specialization: d.specialization || "",
        image: d.imageUrl || d.image || FALLBACKS[index % FALLBACKS.length],
        experience: d.experience || "",
        available: String(d.availability || "Available").toLowerCase() === "available",
        raw: d,
      }));
      setDoctors(normalized);
    } catch {
      setBackendDown(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Use real doctors if available, else show static fallback
  const displayDoctors = doctors.length > 0 ? doctors : STATIC_DOCTORS;

  return (
    <section className="bg-[#f3faf6] px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-4xl text-[#0f7a4a] md:text-5xl">Our Medical Team</h2>
          <p className="mt-2 text-gray-500">Book appointments quickly with our verified specialists.</p>
          {backendDown && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-amber-600">
              <span>Showing sample doctors — call us to book an appointment</span>
              <button
                onClick={load}
                className="inline-flex items-center gap-1 rounded-full border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-3xl bg-white" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {displayDoctors.slice(0, previewCount).map((doctor) => (
              <article key={doctor.id} className="overflow-hidden rounded-3xl bg-white shadow-md">
                <img src={doctor.image} alt={doctor.name} className="h-52 w-full object-cover object-top" />
                <div className="p-4 text-center">
                  <h3 className="font-serif text-lg font-bold text-gray-900">{doctor.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#0f7a4a]">{doctor.specialization}</p>
                  {doctor.experience ? (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#d9f3e3] px-3 py-1 text-xs font-semibold text-[#0f7a4a]">
                      <Trophy size={14} />
                      {doctor.experience} Experience
                    </div>
                  ) : null}
                  <Link
                    to={doctor.id?.startsWith("s") ? "/doctors" : `/doctors/${doctor.id}`}
                    state={doctor.raw ? { doctor: doctor.raw } : undefined}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#0f7a4a] py-2.5 text-sm font-semibold text-white"
                  >
                    <ChevronsRight size={16} /> Book Now
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
