import { HOSPITAL_PHONE } from "../../lib/api.js";

export default function WhatsAppButton() {
  const text = encodeURIComponent("Hello MediCare, I want to book an appointment.");
  return (
    <a
      href={`https://wa.me/91${HOSPITAL_PHONE}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-2xl text-white shadow-lg"
      aria-label="Chat on WhatsApp"
    >
      💬
    </a>
  );
}
