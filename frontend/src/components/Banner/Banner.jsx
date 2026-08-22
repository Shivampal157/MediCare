import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Clock3,
  Phone,
  ShieldCheck,
  Star,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { HOSPITAL_PHONE } from "../../lib/api.js";
import team from "../../assets/BannerImg.png";

const features = [
  { icon: UserRound, label: "Certified Specialists" },
  { icon: Clock3, label: "24/7 Availability" },
  { icon: ShieldCheck, label: "Safe & Secure" },
  { icon: Users, label: "500+ Doctors" },
];

export default function Banner() {
  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(16,185,129,0.12)]">
        <div className="flex flex-col items-center gap-8 p-6 sm:p-10 lg:flex-row lg:items-center lg:p-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-3 flex items-center justify-center gap-3 lg:justify-start">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f7a4a] text-white shadow-md">
                <Stethoscope size={22} />
              </span>
              <h1 className="font-serif text-4xl font-bold text-[#0f7a4a] sm:text-5xl">MediCare+</h1>
            </div>
            <div className="mb-4 flex justify-center gap-1 lg:justify-start">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="mb-6 font-serif text-3xl leading-tight text-gray-800 sm:text-4xl lg:text-5xl">
              Premium Healthcare{" "}
              <span className="font-semibold text-[#0f7a4a]">At Your Fingertips</span>
            </p>
            <div className="mb-7 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
              {features.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d9f3e3] px-4 py-2.5 text-sm font-semibold text-[#0f7a4a] lg:justify-start"
                >
                  <Icon size={16} />
                  {label}
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                to="/doctors"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f7a4a] px-7 py-3.5 font-semibold text-white shadow-lg"
              >
                <CalendarCheck size={18} />
                Book Appointment Now
              </Link>
              <a
                href={`tel:+91${HOSPITAL_PHONE}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#e57373] px-7 py-3.5 font-semibold text-white shadow-lg"
              >
                <Phone size={18} />
                Emergency Call
              </a>
            </div>
          </div>
          <div className="flex-1">
            <img
              src={team}
              alt="MediCare medical team"
              className="mx-auto h-auto w-full max-w-lg object-contain object-bottom"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
