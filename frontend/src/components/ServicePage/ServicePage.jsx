import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronsRight, MousePointer2Off } from "lucide-react";
import { API_BASE } from "../../lib/api.js";
import { SERVICE_IMAGES, FALLBACK_SERVICES } from "../../lib/fallbackCatalog.js";

const INITIAL_SERVICES = FALLBACK_SERVICES.map((item, index) => ({
  id: item._id || item.id,
  name: item.name,
  shortDescription: item.shortDescription || item.about || "",
  image: item.image || SERVICE_IMAGES[index % SERVICE_IMAGES.length],
  available: true,
  raw: item,
}));

function ServiceCard({ service }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
      <img src={service.image} alt={service.name} className="h-44 w-full object-cover" />
      <div className="p-4 text-center">
        <h3 className="font-serif text-lg font-bold text-[#0f7a4a]">{service.name}</h3>
        {service.shortDescription ? (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{service.shortDescription}</p>
        ) : null}
        <div className="mt-4">
          {service.available ? (
            <Link
              to={`/services/${service.id}`}
              state={{ service: service.raw }}
              className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#0f7a4a] py-2.5 text-sm font-semibold text-white hover:bg-[#0c613b]"
            >
              <ChevronsRight className="h-5 w-5" />
              Book Now
            </Link>
          ) : (
            <button
              disabled
              className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-gray-300 py-2.5 text-sm font-semibold text-gray-600"
            >
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
  const [services, setServices] = useState(INITIAL_SERVICES);

  useEffect(() => {
    let mounted = true;
    async function loadServices() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${API_BASE}/api/services`, { signal: controller.signal });
        clearTimeout(timeout);
        const json = await res.json().catch(() => null);
        if (!res.ok) return;
        const items = (json && (json.data || json)) || [];
        if (Array.isArray(items) && items.length > 0 && mounted) {
          setServices(
            items.map((item, index) => ({
              id: item._id || item.id,
              name: item.name || "Service",
              shortDescription: item.shortDescription || item.about || "",
              image: item.imageUrl || item.image || SERVICE_IMAGES[index % SERVICE_IMAGES.length],
              available: typeof item.available === "boolean" ? item.available : true,
              raw: item,
            }))
          );
        }
      } catch {
        // Keep resilient fallback services active
      }
    }
    loadServices();
    return () => {
      mounted = false;
    };
  }, []);

  const shown = services.slice(0, previewCount);

  return (
    <main className="min-h-screen bg-white px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl text-[#0f5c3a] md:text-5xl">Our Diagnostic Services</h1>
          <p className="mt-2 text-gray-500">Safe, accurate & reliable testing.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </main>
  );
}
