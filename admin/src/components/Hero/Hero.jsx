import { Link } from "react-router-dom";
import { heroStyles as s } from "../../assets/dummyStyles.js";
import logo from "../../assets/logo.png";

export default function Hero() {
  return (
    <div className={s.container}>
      <div className={s.mainContainer}>
        <section className={s.section}>
          <div className={s.decorativeBg.container}>
            <div className={s.decorativeBg.blurBackground}>
              <div className={s.decorativeBg.blurShape} />
            </div>
            <div className={s.contentBox}>
              <div className={s.logoContainer}>
                <img src={logo} alt="MediCare" className={s.logo} />
              </div>
              <h1 className={s.heading}>MediCare Admin</h1>
              <p className={s.description}>
                Manage hospital operations, doctors, staff, patient records, and system settings from a centralized control panel.
              </p>
              <div className={s.infoCards.container}>
                <Link to="/add" className={s.infoCards.card}>
                  <div className={s.infoCards.cardTitle}>Doctors</div>
                  <p className={s.infoCards.cardText}>Add and manage specialists</p>
                </Link>
                <Link to="/add-service" className={s.infoCards.card}>
                  <div className={s.infoCards.cardTitle}>Services</div>
                  <p className={s.infoCards.cardText}>Create diagnostic packages</p>
                </Link>
                <Link to="/appointments" className={s.infoCards.card}>
                  <div className={s.infoCards.cardTitle}>Appointments</div>
                  <p className={s.infoCards.cardText}>Review bookings in one place</p>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
