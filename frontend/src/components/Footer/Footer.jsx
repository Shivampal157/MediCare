import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Send, Twitter, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { HOSPITAL_PHONE } from "../../lib/api.js";
import logo from "../../assets/logo.png";

const quickLinks = [
  { name: "Home", href: "/" },
  { name: "Doctors", href: "/doctors" },
  { name: "Services", href: "/services" },
  { name: "Contact", href: "/contact" },
  { name: "Appointments", href: "/appointments" },
  { name: "Payments", href: "/payments" },
];

const services = [
  { name: "Blood Pressure Check", href: "/services" },
  { name: "Blood Sugar Test", href: "/services" },
  { name: "Full Blood Count", href: "/services" },
  { name: "X-Ray Scan", href: "/services" },
];

const socialLinks = [
  { Icon: Facebook, name: "Facebook", href: "https://www.facebook.com/" },
  { Icon: Twitter, name: "Twitter", href: "https://x.com/ShivamPal157" },
  { Icon: Instagram, name: "Instagram", href: "https://www.instagram.com/" },
  { Icon: Linkedin, name: "LinkedIn", href: "https://www.linkedin.com/in/shivam-pal-677777301" },
  { Icon: Youtube, name: "YouTube", href: "https://www.youtube.com/watch?v=ml1n5OMuNhs" },
];

export default function Footer() {
  return (
    <footer className="border-t border-emerald-100 bg-[#eef8f2]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img src={logo} alt="MediCare" className="h-14 w-14 rounded-full object-contain" />
              <div>
                <div className="font-serif text-2xl font-bold text-[#0f7a4a]">MediCare</div>
                <div className="text-sm text-emerald-700">Healthcare Solutions</div>
              </div>
            </div>
            <p className="mb-4 text-sm text-emerald-800">
              A trusted partner in healthcare innovation for doctors, diagnostics, and patients.
            </p>
            <p className="flex items-center gap-2 text-sm text-emerald-800">
              <Phone size={16} /> +91 {HOSPITAL_PHONE}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-emerald-800">
              <Mail size={16} /> hexagansservices@gmail.com
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-emerald-800">
              <MapPin size={16} /> Lucknow, India
            </p>
          </div>
          <div>
            <h4 className="mb-4 font-serif text-lg font-bold text-[#0f5c3a]">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((item) => (
                <li key={item.name}>
                  <Link to={item.href} className="text-sm text-emerald-800 hover:text-emerald-600">
                    › {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-serif text-lg font-bold text-[#0f5c3a]">Our Services</h4>
            <ul className="space-y-2">
              {services.map((item) => (
                <li key={item.name}>
                  <Link to={item.href} className="text-sm text-emerald-800 hover:text-emerald-600">
                    • {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-serif text-lg font-bold text-[#0f5c3a]">Stay Connected</h4>
            <p className="mb-3 text-sm text-emerald-800">Subscribe for health tips and clinic updates.</p>
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                window.open(`https://wa.me/91${HOSPITAL_PHONE}?text=${encodeURIComponent("Please add me to MediCare health updates.")}`, "_blank");
              }}
            >
              <input type="email" required placeholder="Enter your email" className="w-full rounded-full border border-emerald-200 px-4 py-3 pr-28 text-sm" />
              <button type="submit" className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full bg-[#0f7a4a] px-3 py-2 text-xs font-semibold text-white">
                <Send size={14} /> Subscribe
              </button>
            </form>
            <div className="mt-4 flex gap-2">
              {socialLinks.map(({ Icon, name, href }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-white text-[#0f7a4a]"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-2 border-t border-emerald-200 pt-4 text-sm text-emerald-700 sm:flex-row">
          <p>© {new Date().getFullYear()} MediCare Healthcare.</p>
          <p>Designed by Hexagon Digital Services</p>
        </div>
      </div>
    </footer>
  );
}
