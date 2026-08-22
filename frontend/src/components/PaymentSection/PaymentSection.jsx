import { Link } from "react-router-dom";
import { Banknote, Building2, CreditCard, Smartphone } from "lucide-react";
import { UPI_ID } from "../../lib/api.js";

const methods = [
  { icon: Banknote, title: "Cash", text: "Pay at the hospital reception after your consultation or test." },
  { icon: Smartphone, title: "UPI", text: UPI_ID ? `Pay instantly using ${UPI_ID}` : "Pay with any UPI app during online checkout or at reception." },
  { icon: CreditCard, title: "Cards", text: "Visa, Mastercard, RuPay and debit cards are accepted for online booking." },
  { icon: Building2, title: "Net Banking", text: "Use net banking when you choose Online payment on the booking form." },
];

export default function PaymentSection() {
  return (
    <section className="bg-white px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-6xl rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(16,185,129,0.10)] sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-[#0f7a4a]">SECURE PAYMENTS</p>
          <h2 className="mt-2 font-serif text-3xl text-[#0f5c3a] md:text-4xl">Payment options</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {methods.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-3xl border border-emerald-100 bg-[#f3faf6] p-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#0f7a4a] text-white">
                <Icon size={20} />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#0f5c3a]">{title}</h3>
              <p className="mt-2 text-sm text-emerald-800">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/payments" className="inline-flex rounded-full bg-[#0f7a4a] px-8 py-3 font-semibold text-white">
            Pay Now
          </Link>
        </div>
      </div>
    </section>
  );
}
