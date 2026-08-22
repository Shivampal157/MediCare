# MediCare

Hospital appointment platform: patient site, doctor panel, and admin dashboard.

**Live site:** [https://medi-care-two-blush.vercel.app](https://medi-care-two-blush.vercel.app)  
**API:** [https://medicare-api-36hv.onrender.com](https://medicare-api-36hv.onrender.com)

Repo: [github.com/Shivampal157/MediCare](https://github.com/Shivampal157/MediCare)

## Clinic

- **Location:** Varanasi, Uttar Pradesh, India
- **Phone / WhatsApp:** +91 8081414473
- **Email:** shivam10palpal@gmail.com
- **UPI:** `8081414473@ptyes`

## Stack

- Patient site / admin: React, Vite, Tailwind CSS
- Backend: Express, MongoDB Atlas
- Auth: Google Sign-In (patients) + doctor email login
- Hosting: Vercel (frontend), Render (API)
- AI assistant: Google Gemini (symptoms → doctor/service guidance, not a diagnosis)

## Demo login

| Role | How |
| --- | --- |
| Patient | **Continue with Google** (`shivam10palpal@gmail.com`) or email `patient@gmail.com` / `123456` |
| Doctor | `dr1@gmail.com` / `123456` |
| Sample service | Full Body Health Checkup |

Doctor panel: `/login` then `/doctor-admin`. Admin panel runs separately on port 5174 locally.

## Run locally

1. Copy env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. In `backend/.env` set `MONGODB_URI` (MongoDB Atlas). If local Mongo is not running, development can fall back to an in-memory database.

3. Start API:

```bash
cd backend
npm install
npm run dev
```

API: http://localhost:4000 — health check: http://localhost:4000/api/health

4. Patient site:

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

5. Admin (optional):

```bash
cd admin
npm install
npm run dev
```

Admin: http://localhost:5174

## Environment variables

**Backend** (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string (`.../medicare`) |
| `JWT_SECRET` | Doctor token signing |
| `FRONTEND_URL` | Patient site origin (CORS) |
| `ADMIN_URL` | Admin origin (CORS) |
| `PORT` | Defaults to `4000` locally; Render sets this |

Optional: `GEMINI_API_KEY` (chatbot), `STRIPE_SECRET_KEY`, Cloudinary keys.

Green **MediCare AI** button on the live site (bottom-right) uses `/api/ai/chat`. Add `GEMINI_API_KEY` in Render from [Google AI Studio](https://aistudio.google.com/apikey). Without it the chat returns a setup message.

**Frontend** (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend base URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID |
| `VITE_PHONE` | Clinic phone |
| `VITE_EMAIL` | Clinic email |
| `VITE_UPI_ID` | UPI ID shown on Payments |
| `VITE_LOCATION` | Address shown in footer / contact |

**Admin:** `VITE_API_URL` pointing at the same backend.

Never commit `.env` files. Use `.env.example` as the template.

## Deploy

Already live:

1. **API** — Render Blueprint from `render.yaml` (`medicare-api`). Free instances sleep after idle time; the first request can take 30–60 seconds.
2. **Patient site** — Vercel, root directory `frontend`.

After changing the Vercel domain, update:

- Render env `FRONTEND_URL` to the Vercel HTTPS origin
- Google Cloud → Auth Platform → MediCare client → **Authorized JavaScript origins** (`http://localhost:5173`, `http://127.0.0.1:5173`, and the live Vercel URL)
- Google **test users** while the OAuth app is in Testing mode

Atlas → Network Access must allow `0.0.0.0/0` so Render can connect.

## Google Sign-In

Create a Web application OAuth client. Authorized JavaScript origins must include every site that hosts the login button. Do not put the Client Secret in the frontend.
