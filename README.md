# MediCare Site

Hospital appointment platform with a patient frontend, doctor panel, and admin dashboard.

## Stack

- Frontend / Admin: React + Vite + Tailwind CSS
- Backend: Express + MongoDB
- Optional: Clerk, Cloudinary, Stripe

## Run locally

1. Start MongoDB on `127.0.0.1:27017`.
2. Backend:

```bash
cd backend
npm install
npm run dev
```

API: http://localhost:4000

3. Patient site:

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

4. Admin panel:

```bash
cd admin
npm install
npm run dev
```

Admin: http://localhost:5174

## Demo login

- Patient: `patient@gmail.com` / `123456`
- Doctor: `dr1@gmail.com` / `123456`
- Sample service: Full Body Health Checkup

## Deploy

Use three services:

1. Backend (Render / Railway) — `backend/` with `npm start`
2. Patient site (Vercel / Netlify) — `frontend/`
3. Admin panel (Vercel / Netlify) — `admin/`

Set these environment variables before going live:

- Backend: `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, `ADMIN_URL`
- Frontend and admin: `VITE_API_URL` (your live backend URL)
- Optional: `STRIPE_SECRET_KEY`, Cloudinary keys, `VITE_UPI_ID`

