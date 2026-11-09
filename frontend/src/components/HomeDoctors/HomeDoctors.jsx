import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronsRight, Trophy, RefreshCw } from "lucide-react";
import { API_BASE } from "../../lib/api.js";
import { DOCTOR_IMAGES, FALLBACK_DOCTORS } from "../../lib/fallbackCatalog.js";

const INITIAL_DOCTORS = FALLBACK_DOCTORS.map((d, index) => ({
  id: d._id || d.id,
  name: d.name,
  specialization: d.specialization,
  image: d.image || DOCTOR_IMAGES[index % DOCTOR_IMAGES.length],
  experience: d.experience,
  available: true,
  raw: d,
}));

export default function HomeDoctors({ previewCount = 8 }) {
  // Stale-While-Revalidate: Render verified catalog immediately in 0ms while syncing with live API
  const [doctors, setDoctors] = useState(INITIAL_DOCTORS);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setSyncing(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_BASE}/api/doctors`, { signal: controller.signal });
      clearTimeout(timeout);
      const json = await res.json().catch(() => null);
      if (!res.ok) return;
      const items = (json && (json.data || json)) || [];
      if (Array.isArray(items) && items.length > 0) {
        const normalized = items.map((d, index) => ({
          id: d._id || d.id,
          name: d.name || "Unknown",
          specialization: d.specialization || "",
          image: d.imageUrl || d.image || DOCTOR_IMAGES[index % DOCTOR_IMAGES.length],
          experience: d.experience || "",
          available: String(d.availability || "Available").toLowerCase() === "available",
          raw: d,
        }));
        setDoctors(normalized);
      }
    } catch {
      // Keep resilient fallback catalog active
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="bg-[#f3faf6] px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-4xl text-[#0f7a4a] md:text-5xl">Our Medical Team</h2>
          <p className="mt-2 text-gray-500">Book appointments quickly with our verified specialists.</p>
          {syncing && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700">
              <RefreshCw size={12} className="animate-spin" /> Syncing live schedule...
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {doctors.slice(0, previewCount).map((doctor) => (
            <article key={doctor.id} className="overflow-hidden rounded-3xl bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
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
                  to={`/doctors/${doctor.id}`}
                  state={doctor.raw ? { doctor: doctor.raw } : undefined}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#0f7a4a] py-2.5 text-sm font-semibold text-white hover:bg-[#0c613b]"
                >
                  <ChevronsRight size={16} /> Book Now
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
