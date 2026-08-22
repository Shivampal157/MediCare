import { useEffect, useState } from "react";
import { doctorListStyles as s } from "../../assets/dummyStyles.js";
import { API_BASE } from "../../lib/api.js";

export default function ListPage() {
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`${API_BASE}/api/doctors`);
    const json = await res.json().catch(() => ({}));
    setDoctors(json.data || json.doctors || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function remove(id) {
    await fetch(`${API_BASE}/api/doctors/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold text-emerald-800">Doctors</h1>
        {error && <p className="text-rose-600">{error}</p>}
        <div className="grid gap-4">
          {doctors.map((doc) => (
            <article key={doc._id || doc.id} className="rounded-2xl bg-white p-4 shadow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{doc.name}</h3>
                  <p className="text-emerald-700">{doc.specialization}</p>
                  <p className="text-sm text-gray-500">{doc.email}</p>
                </div>
                <button type="button" className="rounded-full bg-rose-100 px-4 py-2 text-rose-700" onClick={() => remove(doc._id || doc.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
