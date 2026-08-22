import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, UserRound, KeyRound } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton, useClerk } from "@clerk/clerk-react";
import { navbarStyles as ns } from "../../assets/dummyStyles.js";
import logo from "../../assets/logo.png";

const STORAGE_KEY = "doctorToken_v1";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const location = useLocation();
  const navRef = useRef(null);
  const clerk = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) setShowNavbar(false);
      else setShowNavbar(true);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setIsDoctorLoggedIn(Boolean(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && navRef.current && !navRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Doctors", href: "/doctors" },
    { label: "Services", href: "/services" },
    { label: "Appointments", href: "/appointments" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header
      ref={navRef}
      className={`${ns.navbarContainer} ${showNavbar ? ns.navbarVisible : ns.navbarHidden}`}
    >
      <div className={ns.navbarBorder} />
      <div className={ns.contentWrapper}>
        <div className={ns.flexContainer}>
          <Link to="/" className={ns.logoLink}>
            <div className={ns.logoContainer}>
              <div className={ns.logoImageWrapper}>
                <img src={logo} alt="MediCare" className={ns.logoImage} />
              </div>
            </div>
            <div className={ns.logoTextContainer}>
              <div className={ns.logoTitle}>MediCare</div>
              <div className={ns.logoSubtitle}>Healthcare Solutions</div>
            </div>
          </Link>

          <nav className={ns.desktopNav}>
            <div className={ns.navItemsContainer}>
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `${ns.navItem} ${isActive ? ns.navItemActive : ns.navItemInactive}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>

          <div className={ns.rightContainer}>
            {isDoctorLoggedIn ? (
              <button
                type="button"
                className={ns.doctorAdminButton}
                onClick={() => navigate("/doctor-admin/login")}
              >
                <UserRound className={ns.doctorAdminIcon} />
                <span className={ns.doctorAdminText}>Doctor Admin</span>
              </button>
            ) : (
              <Link to="/login" className={ns.doctorAdminButton}>
                <UserRound className={ns.doctorAdminIcon} />
                <span className={ns.doctorAdminText}>Doctor Admin</span>
              </Link>
            )}

            <SignedOut>
              <SignInButton>
                <span className={ns.loginButton}>
                  <KeyRound className={ns.loginIcon} />
                  Login
                </span>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>

            <button type="button" className={ns.mobileToggle} onClick={() => setIsOpen((v) => !v)}>
              {isOpen ? <X className={ns.toggleIcon} /> : <Menu className={ns.toggleIcon} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className={ns.mobileMenu}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`${ns.mobileMenuItem} ${
                  location.pathname === item.href ? ns.mobileMenuItemActive : ns.mobileMenuItemInactive
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/login" onClick={() => setIsOpen(false)} className={ns.mobileDoctorAdminButton}>
              Doctor Admin
            </Link>
            <div className={ns.mobileLoginContainer}>
              <button type="button" className={ns.mobileLoginButton} onClick={() => clerk.openSignIn()}>
                Patient Login
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{ns.animationStyles}</style>
    </header>
  );
}
