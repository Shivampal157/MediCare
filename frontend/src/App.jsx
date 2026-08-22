import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import Navbar from "./components/Navbar/Navbar.jsx";
import Footer from "./components/Footer/Footer.jsx";
import Banner from "./components/Banner/Banner.jsx";
import Certification from "./components/Certification/Certification.jsx";
import HomeDoctors from "./components/HomeDoctors/HomeDoctors.jsx";
import Testimonial from "./components/Testimonial/Testimonial.jsx";
import DoctorsPage from "./components/DoctorsPage/DoctorsPage.jsx";
import ServicePage from "./components/ServicePage/ServicePage.jsx";
import AppointmentPage from "./components/AppointmentPage/AppointmentPage.jsx";
import ContactPage from "./components/ContactPage/ContactPage.jsx";
import PaymentSection from "./components/PaymentSection/PaymentSection.jsx";
import PaymentPage from "./components/PaymentPage/PaymentPage.jsx";
import PaymentResultPage from "./pages/PaymentResultPage/PaymentResultPage.jsx";
import WhatsAppButton from "./components/WhatsAppButton/WhatsAppButton.jsx";
import AiChat from "./components/AiChat/AiChat.jsx";
import LoginPage from "./components/LoginPage/LoginPage.jsx";
import DoctorDetail from "./pages/DoctorDetail/DoctorDetail.jsx";
import ServiceDetailPage from "./pages/ServiceDetailPage/ServiceDetailPage.jsx";
import DoctorNavbar from "./doctor/Navbar/Navbar.jsx";
import DashboardPage from "./doctor/DashboardPage/DashboardPage.jsx";
import ListPage from "./doctor/ListPage/ListPage.jsx";
import EditProfilePage from "./doctor/EditProfilePage/EditProfilePage.jsx";

function HomePage() {
  return (
    <>
      <Banner />
      <Certification />
      <HomeDoctors />
      <PaymentSection />
      <Testimonial />
    </>
  );
}

function ScrollButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 rounded-full bg-emerald-600 p-3 text-white shadow-lg"
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <WhatsAppButton />
      <AiChat />
      <ScrollButton />
    </>
  );
}

function DoctorLayout() {
  return (
    <>
      <DoctorNavbar />
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="appointments" element={<ListPage />} />
        <Route path="profile/edit" element={<EditProfilePage />} />
      </Routes>
    </>
  );
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflowX = "hidden";
    document.documentElement.style.overflowX = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflowX = "auto";
      document.documentElement.style.overflowX = "auto";
    };
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/doctor-admin/login" element={<LoginPage />} />
      <Route path="/doctor-admin/:id/*" element={<DoctorLayout />} />
      <Route
        path="*"
        element={
          <PublicLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/doctors" element={<DoctorsPage />} />
              <Route path="/doctors/:id" element={<DoctorDetail />} />
              <Route path="/services" element={<ServicePage />} />
              <Route path="/services/:id" element={<ServiceDetailPage />} />
              <Route path="/appointments" element={<AppointmentPage />} />
              <Route path="/payments" element={<PaymentPage />} />
              <Route path="/appointment/success" element={<PaymentResultPage kind="appointment" />} />
              <Route path="/appointment/cancel" element={<PaymentResultPage kind="appointment" />} />
              <Route path="/service-appointment/success" element={<PaymentResultPage kind="service" />} />
              <Route path="/service-appointment/cancel" element={<PaymentResultPage kind="service" />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PublicLayout>
        }
      />
    </Routes>
  );
}
