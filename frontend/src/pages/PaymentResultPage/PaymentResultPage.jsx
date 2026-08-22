import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_BASE } from "../../lib/api.js";

export default function PaymentResultPage({ kind = "appointment" }) {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState(sessionId ? "confirming" : "ok");

  useEffect(() => {
    if (!sessionId) return;
    const path = kind === "service" ? "/api/service-appointments/confirm" : "/api/appointments/confirm";
    fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((res) => setStatus(res.ok ? "paid" : "pending"))
      .catch(() => setStatus("pending"));
  }, [kind, sessionId]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="max-w-md rounded-[28px] bg-white p-8 text-center shadow-xl">
        <h1 className="font-serif text-3xl text-[#0f5c3a]">
          {status === "paid" ? "Payment successful" : status === "confirming" ? "Confirming payment..." : "Booking received"}
        </h1>
        <p className="mt-3 text-emerald-800">
          {status === "paid"
            ? "Your online payment is confirmed. You can view the booking in Appointments."
            : "If you chose Cash, please pay at reception. Online payments are confirmed after checkout."}
        </p>
        <Link to="/appointments" className="mt-6 inline-flex rounded-full bg-[#0f7a4a] px-6 py-3 font-semibold text-white">
          View appointments
        </Link>
      </div>
    </main>
  );
}
