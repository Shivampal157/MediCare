import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronsRight, MousePointer2Off } from "lucide-react";
import { API_BASE } from "../../lib/api.js";
import S1 from "../../assets/S1.png";
import S2 from "../../assets/S2.png";
import S3 from "../../assets/S3.png";
import S4 from "../../assets/S4.png";
import S5 from "../../assets/S5.png";
import S6 from "../../assets/S6.png";
import S7 from "../../assets/S7.png";
import S8 from "../../assets/S8.png";

const FALLBACKS = [S1, S2, S3, S4, S5, S6, S7, S8];

function ServiceCard({ service }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-md">
      <img src={service.image} alt={service.name} className="h-44 w-full object-cover" />
      <div className="p-4 text-center">
        <h3 className="font-serif text-lg font-bold text-[#0f7a4a]">{service.name}</h3>
        <div className="mt-4">
          {service.available ? (
            <Link to={`/services/${service.id}`} state={{ service: service.raw }} className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#0f7a4a] py-2.5 text-sm font-semibold text-white">
              <ChevronsRight className="h-5 w-5" />
              Book Now
            </Link>
          ) : (
            <button disabled className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-gray-300 py-2.5 text-sm font-semibold text-gray-600">
              <MousePointer2Off className="h-5 w-5" />
              Not Available
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ServicePage({ previewCount = 12 }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadServices() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/services`);
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setError((json && json.message) || `Failed to load services (${res.status})`);
          return;
        }
        const items = (json && (json.data || json)) || [];
        setServices(
          (Array.isArray(items) ? items : []).map((item, index) => ({
            id: item._id || item.id,
            name: item.name || "Service",
            shortDescription: item.shortDescription || item.about || "",
            image: item.imageUrl || item.image || FALLBACKS[index % FALLBACKS.length],
            available: typeof item.available === "boolean" ? item.available : true,
            raw: item,
          }))
        );
      } catch (err) {
        console.error(err);
        setError("Network error while loading services.");
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  const shown = services.slice(0, previewCount);

  return (
    <main className="min-h-screen bg-white px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl text-[#0f5c3a] md:text-5xl">Our Diagnostic Services</h1>
          <p className="mt-2 text-gray-500">Safe, accurate & reliable testing.</p>
        </div>
        {error ? <p className="mb-4 text-center text-rose-600">{error}</p> : null}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-3xl bg-emerald-50" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {shown.length === 0 ? <p className="col-span-full text-center text-emerald-800">No services yet.</p> : shown.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        )}
      </div>
    </main>
  );
}
