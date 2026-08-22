import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar.jsx";
import Hero from "./components/Hero/Hero.jsx";
import DashboardPage from "./components/DashboardPage/DashboardPage.jsx";
import AddPage from "./components/AddPage/AddPage.jsx";
import ListPage from "./components/ListPage/ListPage.jsx";
import AppointmentsPage from "./components/AppointmentsPage/AppointmentsPage.jsx";
import ServiceDashboard from "./components/ServiceDashboard/ServiceDashboard.jsx";
import AddService from "./components/AddService/AddService.jsx";
import ListServicePage from "./components/ListServicePage/ListServicePage.jsx";
import ServiceAppointmentsPage from "./components/ServiceAppointmentsPage/ServiceAppointmentsPage.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-emerald-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/h" replace />} />
        <Route path="/h" element={<Hero />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/add" element={<AddPage />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/service-dashboard" element={<ServiceDashboard />} />
        <Route path="/add-service" element={<AddService />} />
        <Route path="/list-service" element={<ListServicePage />} />
        <Route path="/service-appointments" element={<ServiceAppointmentsPage />} />
      </Routes>
    </div>
  );
}
