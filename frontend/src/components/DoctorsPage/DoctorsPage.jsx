import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronsRight, Search, Trophy } from "lucide-react";
import { doctorsPageStyles as s } from "../../assets/dummyStyles.js";
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

export default function DoctorsPage() {
  const [allDoctors, setAllDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/doctors`);
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          if (mounted) setError((json && json.message) || `Failed to load doctors (${res.status})`);
          return;
        }
        const items = (json && (json.data || json)) || [];
        const normalized = (Array.isArray(items) ? items : []).map((d, index) => ({
          id: d._id || d.id,
          name: d.name || "Unknown",
          specialization: d.specialization || "",
          image: d.imageUrl || d.image || FALLBACKS[index % FALLBACKS.length],
          experience: d.experience || "—",
          fee: d.fee ?? 0,
          available: String(d.availability || "Available").toLowerCase() === "available",
          raw: d,
        }));
        if (mounted) setAllDoctors(normalized);
      } catch (err) {
        console.error(err);
        if (mounted) setError("Network error while loading doctors.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredDoctors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allDoctors;
    return allDoctors.filter(
      (doctor) =>
        (doctor.name || "").toLowerCase().includes(q) ||
        (doctor.specialization || "").toLowerCase().includes(q)
    );
  }, [allDoctors, searchTerm]);

  const displayedDoctors = showAll ? filteredDoctors : filteredDoctors.slice(0, 8);

  return (
    <main className={s.mainContainer}>
      <div className={s.wrapper}>
        <div className={s.headerContainer}>
          <h1 className={s.headerTitle}>Our Medical Team</h1>
          <p className={s.headerSubtitle}>Book appointments quickly with our verified specialists.</p>
        </div>
        <div className={s.searchContainer}>
          <div className={s.searchWrapper}>
            <Search className={s.searchIcon} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or specialization"
              className={s.searchInput}
            />
          </div>
        </div>
        {error ? <div className={s.errorContainer}><p className={s.errorText}>{error}</p></div> : null}
        {loading ? (
          <div className={s.skeletonGrid}>{Array.from({ length: 8 }).map((_, i) => <div key={i} className={s.skeletonCard} />)}</div>
        ) : (
          <div className={s.doctorsGrid}>
            {displayedDoctors.map((doctor) => (
              <article key={doctor.id} className={`${s.doctorCard} ${doctor.available ? "" : s.doctorCardUnavailable}`}>
                <div className={s.imageContainer}>
                  <img src={doctor.image || "/logo.png"} alt={doctor.name} className={s.doctorImage} />
                </div>
                <h3 className="mt-2 font-serif text-lg font-semibold">{doctor.name}</h3>
                <p className="text-[#0f7a4a]">{doctor.specialization}</p>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#d9f3e3] px-3 py-1 text-xs font-semibold text-[#0f7a4a]">
                  <Trophy size={12} /> {doctor.experience} Experience
                </div>
                {doctor.available ? (
                  <Link to={`/doctors/${doctor.id}`} state={{ doctor: doctor.raw }} className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#0f7a4a] px-4 py-2 text-sm font-semibold text-white">
                    <ChevronsRight size={16} /> Book Now
                  </Link>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">Unavailable</p>
                )}
              </article>
            ))}
          </div>
        )}
        {filteredDoctors.length > 8 && (
          <div className="mt-8 text-center">
            <button type="button" className="rounded-full bg-white px-5 py-2 shadow" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show less" : "Show more"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
