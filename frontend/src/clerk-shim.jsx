import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getGoogleClientId, signInWithGoogle } from "./lib/googleAuth.js";

const SESSION_KEY = "patientAuth_v1";
const USERS_KEY = "patientUsers_v1";
const ClerkCtx = createContext(null);

const DEMO_PATIENT = {
  id: "patient_demo",
  name: "Demo Patient",
  email: "patient@gmail.com",
  password: "123456",
};

function toBase64Url(obj) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function makeToken(user) {
  return `${toBase64Url({ alg: "none", typ: "JWT" })}.${toBase64Url({
    sub: user.id,
    userId: user.id,
    email: user.email,
    name: user.name,
  })}.demo`;
}

function toClerkUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.name,
    firstName: String(user.name || "Patient").split(" ")[0],
    imageUrl: user.picture || "",
    primaryEmailAddress: { emailAddress: user.email },
    emailAddresses: [{ emailAddress: user.email }],
  };
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function seedUsers() {
  const users = readJson(USERS_KEY, []);
  if (!users.some((item) => item.email === DEMO_PATIENT.email)) {
    users.push(DEMO_PATIENT);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  return users;
}

function PatientAuthModal({ mode, setMode, onClose, onSuccess }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle(event) {
    event.preventDefault();
    event.stopPropagation();
    setError("");
    setGoogleLoading(true);
    try {
      const profile = await signInWithGoogle();
      const users = seedUsers();
      const existing = users.find((item) => item.email === profile.email);
      const sessionUser = existing
        ? { ...existing, name: existing.name || profile.name, picture: profile.picture }
        : { id: profile.id, name: profile.name, email: profile.email, picture: profile.picture, password: "" };
      if (!existing) {
        localStorage.setItem(USERS_KEY, JSON.stringify([...users, sessionUser]));
      }
      onSuccess(sessionUser);
    } catch (err) {
      if (err?.message === "GOOGLE_CLIENT_MISSING") {
        setError("Google login is not configured. Add a Google Web Client ID, then restart the site.");
      } else {
        setError(err?.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const users = seedUsers();
    const cleanEmail = email.trim().toLowerCase();
    if (mode === "register") {
      const fullName = `${firstName} ${lastName}`.trim();
      if (!fullName) {
        setError("Please enter your name.");
        return;
      }
      if (users.some((item) => item.email === cleanEmail)) {
        setError("This email is already registered. Sign in instead.");
        return;
      }
      const created = {
        id: `patient_${Date.now()}`,
        name: fullName,
        email: cleanEmail,
        password,
      };
      localStorage.setItem(USERS_KEY, JSON.stringify([...users, created]));
      onSuccess({ id: created.id, name: created.name, email: created.email });
      return;
    }
    const found = users.find((item) => item.email === cleanEmail && item.password === password);
    if (!found) {
      setError("Invalid email or password. Demo: patient@gmail.com / 123456");
      return;
    }
    onSuccess({ id: found.id, name: found.name, email: found.email });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="absolute right-4 top-4 text-gray-400" onClick={onClose}>✕</button>
        <h2 className="text-xl font-semibold text-gray-900">
          {mode === "register" ? "Create your account" : "Sign in to MediCare"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {mode === "register" ? "Welcome! Please fill in the details to get started." : "Use your Google account or email to continue."}
        </p>
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.6 7.5l6.3 5.3C38.3 37.3 44 31.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
          </svg>
          {googleLoading ? "Connecting to Google..." : "Continue with Google"}
        </button>
        {!getGoogleClientId() ? (
          <p className="mt-2 text-center text-[11px] text-amber-700">
            Google popup needs a Web Client ID from Google Cloud.
          </p>
        ) : null}
        <div className="my-4 text-center text-xs text-gray-400">or</div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <div className="grid grid-cols-2 gap-3">
              <input className="rounded-md border border-gray-200 px-3 py-2 text-sm" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <input className="rounded-md border border-gray-200 px-3 py-2 text-sm" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          ) : null}
          <input className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button type="submit" className="w-full rounded-md bg-gray-800 py-2.5 text-sm font-semibold text-white">
            Continue
          </button>
        </form>
        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-gray-600"
          onClick={() => {
            setError("");
            setMode(mode === "register" ? "login" : "register");
          }}
        >
          {mode === "register" ? "Already have an account? Sign in" : "New patient? Create account"}
        </button>
        <p className="mt-4 text-center text-[11px] text-gray-400">Secured patient login • Demo: patient@gmail.com / 123456</p>
      </div>
    </div>
  );
}

export function ClerkProvider({ children }) {
  const [user, setUser] = useState(() => readJson(SESSION_KEY, null));
  const [showSignIn, setShowSignIn] = useState(false);
  const [mode, setMode] = useState("login");

  useEffect(() => {
    seedUsers();
  }, []);

  const signIn = useCallback((sessionUser) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    setShowSignIn(false);
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const getToken = useCallback(async () => (user ? makeToken(user) : null), [user]);

  const value = useMemo(
    () => ({
      user: toClerkUser(user),
      isSignedIn: Boolean(user),
      isLoaded: true,
      signOut,
      openSignIn: () => {
        setMode("login");
        setShowSignIn(true);
      },
      getToken,
      signIn,
    }),
    [user, signOut, getToken, signIn]
  );

  return (
    <ClerkCtx.Provider value={value}>
      {children}
      {showSignIn ? (
        <PatientAuthModal
          mode={mode}
          setMode={setMode}
          onClose={() => setShowSignIn(false)}
          onSuccess={signIn}
        />
      ) : null}
    </ClerkCtx.Provider>
  );
}

export function useClerk() {
  return (
    useContext(ClerkCtx) || {
      signOut: async () => {},
      openSignIn: () => {},
      getToken: async () => null,
    }
  );
}

export function useAuth() {
  const ctx = useContext(ClerkCtx);
  return {
    isLoaded: true,
    isSignedIn: Boolean(ctx?.user),
    userId: ctx?.user?.id || null,
    getToken: ctx?.getToken || (async () => null),
  };
}

export function useUser() {
  const ctx = useContext(ClerkCtx);
  return {
    isLoaded: true,
    isSignedIn: Boolean(ctx?.user),
    user: ctx?.user || null,
  };
}

export function SignedIn({ children }) {
  const { isSignedIn } = useUser();
  return isSignedIn ? children : null;
}

export function SignedOut({ children }) {
  const { isSignedIn } = useUser();
  return isSignedIn ? null : children;
}

export function SignInButton({ children }) {
  const clerk = useClerk();
  return (
    <button type="button" className="border-0 bg-transparent p-0" onClick={() => clerk.openSignIn()}>
      {children || "Sign in"}
    </button>
  );
}

export function UserButton() {
  const clerk = useClerk();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const initial = (user?.fullName || "P").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-r from-emerald-400 to-green-600 text-sm font-bold text-white shadow-md"
        onClick={() => setOpen((value) => !value)}
        aria-label="Patient account"
      >
        {initial}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl">
          <p className="truncate font-semibold text-emerald-800">{user?.fullName}</p>
          <p className="mb-3 truncate text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
          <button
            type="button"
            className="w-full rounded-full bg-emerald-600 py-2 text-sm font-semibold text-white"
            onClick={() => {
              setOpen(false);
              clerk.signOut();
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
