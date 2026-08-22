const GSI_SRC = "https://accounts.google.com/gsi/client";

export function getGoogleClientId() {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
}

export function loadGoogleIdentity() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google);
      return;
    }
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google script failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Google script failed to load"));
    document.head.appendChild(script);
  });
}

export async function signInWithGoogle() {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_MISSING");
  }

  const google = await loadGoogleIdentity();
  if (!google?.accounts?.oauth2) {
    throw new Error("Google sign-in is unavailable in this browser.");
  }

  const tokenResponse = await new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        resolve(response);
      },
      error_callback: (error) => {
        const message = error?.type === "popup_closed" ? "Google sign-in was cancelled." : error?.message || "Google sign-in failed.";
        reject(new Error(message));
      },
    });
    client.requestAccessToken({ prompt: "select_account" });
  });

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
  });
  if (!profileRes.ok) {
    throw new Error("Could not read your Google profile.");
  }
  const profile = await profileRes.json();
  if (!profile.email) {
    throw new Error("Google did not return an email address.");
  }
  return {
    id: `google_${profile.sub || profile.email}`,
    name: profile.name || profile.given_name || "Patient",
    email: String(profile.email).toLowerCase(),
    picture: profile.picture || "",
  };
}
