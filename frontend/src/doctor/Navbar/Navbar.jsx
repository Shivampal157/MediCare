import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Calendar, Edit, Home, LogOut, Menu, X } from "lucide-react";
import { navbarStylesDr as s } from "../../assets/dummyStyles.js";
import logo from "../../assets/logo.png";

const STORAGE_KEY = "doctorToken_v1";

export default function DoctorNavbar() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doctorId = useMemo(() => {
    if (params?.id) return params.id;
    const m = location.pathname.match(/\/doctor-admin\/([^/]+)/);
    return m ? m[1] : null;
  }, [params, location.pathname]);

  const basePath = doctorId ? `/doctor-admin/${doctorId}` : "/doctor-admin/login";
  const navItems = [
    { name: "Dashboard", to: `${basePath}`, Icon: Home },
    { name: "Appointments", to: `${basePath}/appointments`, Icon: Calendar },
    { name: "Edit Profile", to: `${basePath}/profile/edit`, Icon: Edit },
  ];

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    navigate("/login");
  }

  return (
    <>
      <nav className={s.navContainer}>
        <div className={s.leftBrand}>
          <div className={s.logoContainer}>
            <img src={logo} alt="MediCare" className={s.logoImage} />
          </div>
          <div className={s.brandTextContainer}>
            <div className={s.brandTitle}>MediCare</div>
            <div className={s.brandSubtitle}>Doctor panel</div>
          </div>
        </div>
        <div className={s.desktopMenu}>
          <div className={s.desktopMenuItems}>
            {navItems.map(({ name, to, Icon }) => {
              const active = location.pathname === to;
              return (
                <Link key={name} to={to} className={`${s.baseLink} ${active ? s.activeLink : s.inactiveLink}`}>
                  <span className={s.linkContent}>
                    <Icon size={16} className={s.linkIcon} />
                    <span className={s.linkText}>{name}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className={s.rightActions}>
          <button type="button" className={s.logoutButtonDesktop} onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
          <button type="button" className={s.hamburgerButtonMd} onClick={() => setOpen((v) => !v)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </nav>
      <div className={s.mobileMenuContainer(open)}>
        <div className={s.mobileMenuContent}>
          {navItems.map(({ name, to, Icon }) => (
            <Link key={name} to={to} onClick={() => setOpen(false)} className={s.mobileBaseLink}>
              <Icon size={16} /> {name}
            </Link>
          ))}
          <button type="button" className={s.mobileLogoutButton} onClick={logout}>Logout</button>
        </div>
      </div>
      <div className={s.spacer} />
    </>
  );
}
