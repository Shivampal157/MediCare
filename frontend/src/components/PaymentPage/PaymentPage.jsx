import { Banknote, Building2, CreditCard, ShieldCheck, Smartphone } from "lucide-react";
import { HOSPITAL_PHONE, UPI_ID } from "../../lib/api.js";

const cards = [
  {
    icon: Banknote,
    title: "Cash at hospital",
    points: ["Pay at reception after your visit", "Keep the booking confirmation ready", "Receipt is issued immediately"],
  },
  {
    icon: Smartphone,
    title: "UPI",
    points: [
      UPI_ID ? `UPI ID: ${UPI_ID}` : "Use any UPI app at reception or during online booking",
      "Google Pay, PhonePe and Paytm accepted",
      "Mention your booking name in the note",
    ],
  },
  {
    icon: CreditCard,
    title: "Credit / Debit card",
    points: ["Visa, Mastercard and RuPay", "Choose Online on the booking form", "Card charges as per your bank"],
  },
  {
    icon: Building2,
    title: "Net banking",
    points: ["Available with Online checkout", "Use your regular internet banking", "Confirmation is shown after payment"],
  },
];

export default function PaymentPage() {
  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-green-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold tracking-wide text-emerald-600">BILLING</p>
          <h1 className="mt-2 font-sans text-4xl font-bold text-emerald-800">Payments</h1>
          <p className="mx-auto mt-3 max-w-2xl text-emerald-700">
            MediCare accepts cash and digital payments for doctor appointments and diagnostic services.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {cards.map(({ icon: Icon, title, points }) => (
            <article key={title} className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Icon size={22} />
                </span>
                <h2 className="text-xl font-bold text-emerald-800">{title}</h2>
              </div>
              <ul className="space-y-2 text-sm text-emerald-700">
                {points.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 text-emerald-600" size={22} />
            <div>
              <h3 className="font-bold text-emerald-800">Need help with a payment?</h3>
              <p className="mt-1 text-sm text-emerald-700">
                Call reception at{" "}
                <a className="font-semibold text-emerald-800" href={`tel:+91${HOSPITAL_PHONE}`}>
                  +91 {HOSPITAL_PHONE}
                </a>{" "}
                or book a slot and choose Cash or Online on the appointment form.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
