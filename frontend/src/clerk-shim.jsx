import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
    primaryEmailAddress: { emailAddress: user.email },
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

  function handleGoogle() {
    const users = seedUsers();
    const demo = users.find((item) => item.email === DEMO_PATIENT.email) || DEMO_PATIENT;
    onSuccess({ id: demo.id, name: demo.name, email: demo.email });
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
      <button type="button" className="absolute inset-0" aria-label="Close login" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <button type="button" className="absolute right-4 top-4 text-gray-400" onClick={onClose}>✕</button>
        <h2 className="text-xl font-semibold text-gray-900">
          {mode === "register" ? "Create your account" : "Sign in to MediCare"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {mode === "register" ? "Welcome! Please fill in the details to get started." : "Use your patient email to continue."}
        </p>
        <button
          type="button"
          onClick={handleGoogle}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 py-2.5 text-sm font-medium"
        >
          Continue with Google
        </button>
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
        setMode("register");
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
