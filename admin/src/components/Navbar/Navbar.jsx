import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Calendar, Grid, Home, List, Menu, PlusSquare, UserPlus, Users, X } from "lucide-react";
import { navbarStyles as ns } from "../../assets/dummyStyles.js";
import logo from "../../assets/logo.png";

function CenterNavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-item ${ns.centerNavItemBase} ${isActive ? ns.centerNavItemActive : ns.centerNavItemInactive}`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function MobileItem({ to, label, icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `${ns.mobileItemBase} ${isActive ? ns.mobileItemActive : ns.mobileItemInactive}`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const navInnerRef = useRef(null);
  const indicatorRef = useRef(null);

  const moveIndicator = useCallback(() => {
    const container = navInnerRef.current;
    const ind = indicatorRef.current;
    if (!container || !ind) return;
    const active = container.querySelector(".nav-item.active, .nav-item[aria-current='page']");
    if (!active) {
      ind.style.opacity = "0";
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    ind.style.transform = `translateX(${activeRect.left - containerRect.left + container.scrollLeft}px)`;
    ind.style.width = `${activeRect.width}px`;
    ind.style.opacity = "1";
  }, []);

  useLayoutEffect(() => {
    moveIndicator();
  }, [location.pathname, moveIndicator]);

  useEffect(() => {
    window.addEventListener("resize", moveIndicator);
    return () => window.removeEventListener("resize", moveIndicator);
  }, [moveIndicator]);

  return (
    <header className={ns.header}>
      <div className={ns.navContainer}>
        <div className={ns.flexContainer}>
          <Link to="/h" className={ns.logoContainer}>
            <img src={logo} alt="MediCare" className={ns.logoImage} />
            <div>
              <div className={ns.logoLink}>MediCare Admin</div>
              <div className={ns.logoSubtext}>Hospital control panel</div>
            </div>
          </Link>

          <div className={ns.centerNavContainer}>
            <div className={ns.glowEffect}>
              <div className={ns.centerNavInner}>
                <div ref={navInnerRef} className={ns.centerNavScrollContainer}>
                  <CenterNavItem to="/h" label="Dashboard" icon={<Home size={16} />} />
                  <CenterNavItem to="/add" label="Add Doctor" icon={<UserPlus size={16} />} />
                  <CenterNavItem to="/list" label="List Doctors" icon={<Users size={16} />} />
                  <CenterNavItem to="/appointments" label="Appointments" icon={<Calendar size={16} />} />
                  <CenterNavItem to="/service-dashboard" label="Service Dashboard" icon={<Grid size={16} />} />
                  <CenterNavItem to="/add-service" label="Add Service" icon={<PlusSquare size={16} />} />
                  <CenterNavItem to="/list-service" label="List Services" icon={<List size={16} />} />
                  <CenterNavItem to="/service-appointments" label="Service Appointments" icon={<Calendar size={16} />} />
                  <span ref={indicatorRef} className={ns.indicator} />
                </div>
              </div>
            </div>
          </div>

          <div className={ns.rightContainer}>
            <button type="button" className={ns.mobileMenuButton} onClick={() => setOpen((v) => !v)}>
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {open && (
          <div className={ns.mobileMenuContainer}>
            <div className={ns.mobileMenuInner}>
              <MobileItem to="/h" label="Dashboard" icon={<Home size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/add" label="Add Doctor" icon={<UserPlus size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/list" label="List Doctors" icon={<Users size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/appointments" label="Appointments" icon={<Calendar size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/service-dashboard" label="Service Dashboard" icon={<Grid size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/add-service" label="Add Service" icon={<PlusSquare size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/list-service" label="List Services" icon={<List size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/service-appointments" label="Service Appointments" icon={<Calendar size={16} />} onClick={() => setOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
