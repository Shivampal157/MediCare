export const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
export const UPI_ID = import.meta.env.VITE_UPI_ID || "8081414473@ptyes";
export const HOSPITAL_PHONE = import.meta.env.VITE_PHONE || "8081414473";
export const HOSPITAL_EMAIL = import.meta.env.VITE_EMAIL || "shivam10palpal@gmail.com";
export const HOSPITAL_LOCATION = import.meta.env.VITE_LOCATION || "Varanasi, Uttar Pradesh, India";
export const HOSPITAL_MAP_EMBED =
  import.meta.env.VITE_MAP_EMBED ||
  "https://www.google.com/maps?q=Varanasi,+Uttar+Pradesh,+India&output=embed";
