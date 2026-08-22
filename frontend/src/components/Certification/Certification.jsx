import C1 from "../../assets/C1.png";
import C2 from "../../assets/C2.png";
import C3 from "../../assets/C3.png";
import C4 from "../../assets/C4.svg";
import C5 from "../../assets/C5.png";
import C6 from "../../assets/C6.png";
import C7 from "../../assets/C7.svg";

export default function Certification() {
  const certifications = [
    { id: 1, name: "Medical Commission", image: C1 },
    { id: 2, name: "Government Approved", image: C2 },
    { id: 3, name: "NABH Accredited", image: C3 },
    { id: 4, name: "Medical Council", image: C4 },
    { id: 5, name: "Quality Healthcare", image: C5 },
    { id: 6, name: "Paramedical Council", image: C6 },
    { id: 7, name: "Ministry of Health", image: C7 },
  ];
  const duplicated = [...certifications, ...certifications, ...certifications];

  return (
    <section className="overflow-hidden bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <div className="mb-3 flex items-center justify-center gap-4">
          <span className="hidden h-px w-16 bg-emerald-300 sm:block" />
          <h2 className="font-serif text-3xl tracking-wide text-[#0f7a4a] sm:text-5xl">
            CERTIFIED & EXCELLENCE
          </h2>
          <span className="hidden h-px w-16 bg-emerald-300 sm:block" />
        </div>
        <p className="mx-auto max-w-2xl text-sm text-gray-500 sm:text-base">
          Government recognized and internationally accredited healthcare standards
        </p>
        <div className="mt-5 inline-flex items-center rounded-full bg-[#d9f3e3] px-5 py-2 text-sm font-semibold text-[#0f7a4a]">
          <span className="mr-2 h-2.5 w-2.5 rounded-full bg-emerald-500" />
          OFFICIALLY CERTIFIED
        </div>
        <div className="mt-8 flex overflow-hidden">
          <div className="flex animate-marquee-single whitespace-nowrap py-3">
            {duplicated.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="mx-8 inline-flex flex-col items-center">
                <img src={item.image} alt={item.name} className="h-16 w-16 object-contain" />
                <div className="mt-2 max-w-[120px] text-center font-serif text-sm font-semibold text-gray-700">
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee-single {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-marquee-single { animation: marquee-single 60s linear infinite; }
      `}</style>
    </section>
  );
}
