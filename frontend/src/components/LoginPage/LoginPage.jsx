import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { loginPageStyles as s, toastStyles } from "../../assets/dummyStyles.js";
import logo from "../../assets/logo.png";

import { API_BASE } from "../../lib/api.js";

const STORAGE_KEY = "doctorToken_v1";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("dr1@gmail.com");
  const [password, setPassword] = useState("123456");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.message || "Login failed", { duration: 4000 });
        setBusy(false);
        return;
      }
      const token = json?.token || json?.data?.token;
      if (!token) {
        toast.error("Authentication token missing");
        setBusy(false);
        return;
      }
      const doctorId = json?.data?._id || json?.doctor?._id || json?.data?.doctor?._id;
      if (!doctorId) {
        toast.error("Doctor ID missing from server response");
        setBusy(false);
        return;
      }
      localStorage.setItem(STORAGE_KEY, token);
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: token }));
      toast.success("Login successful — redirecting...", { style: toastStyles.successToast });
      setTimeout(() => navigate(`/doctor-admin/${doctorId}`), 700);
    } catch (err) {
      console.error("login error", err);
      toast.error("Network error during login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={s.mainContainer}>
      <button type="button" className={s.backButton} onClick={() => navigate("/")}>
        <ArrowLeft className={s.backButtonIcon} />
        Back
      </button>
      <div className={s.loginCard}>
        <div className={s.logoContainer}>
          <img src={logo} alt="MediCare" className={s.logo} />
        </div>
        <h1 className={s.title}>Doctor Login</h1>
        <p className={s.subtitle}>Use your clinic email to open the doctor dashboard</p>
        <form className={s.form} onSubmit={handleSubmit}>
          <input
            className={s.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={s.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className={s.submitButton} disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
