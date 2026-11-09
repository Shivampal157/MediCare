<p align="center">
  <img src="frontend/src/assets/logo.png" alt="MediCare" width="96" />
</p>

<h1 align="center">MediCare</h1>

<p align="center">
  Live hospital appointment platform — book a doctor, pay, and get clinic guidance in one place.
</p>

<p align="center">
  <a href="https://medi-care-two-blush.vercel.app"><img src="https://img.shields.io/badge/Live_Demo-0f7a4a?style=for-the-badge" alt="Live demo" /></a>
  <a href="https://github.com/Shivampal157/MediCare"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github" alt="GitHub" /></a>
  <a href="https://medicare-api-36hv.onrender.com/api/health"><img src="https://img.shields.io/badge/API-ok-0ea5e9?style=for-the-badge" alt="API health" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=111" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Gemini-4285F4?logo=googlegemini&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=111" alt="Render" />
</p>

<p align="center">
  <img src="docs/screenshots/01-home.png" alt="MediCare homepage" width="920" />
</p>

---

## Why this project

Patients still book clinics on phone and WhatsApp. MediCare is a **live** patient site + doctor dashboard + admin panel:

- Pick a specialist or lab test
- Choose a slot
- Pay by cash or UPI / card
- Ask the Gemini assistant which department to visit (no diagnosis, no medicine)

| | |
| --- | --- |
| **Live** | [medi-care-two-blush.vercel.app](https://medi-care-two-blush.vercel.app) |
| **API** | [medicare-api-36hv.onrender.com](https://medicare-api-36hv.onrender.com/api/health) |
| **Clinic** | Varanasi, Uttar Pradesh |

---

## Product tour

### Homepage

Hero, certifications, and a one-click path to booking. WhatsApp and the green **MediCare AI** button stay on every public page.

<p align="center">
  <img src="docs/screenshots/01-home.png" alt="Homepage hero and certifications" width="920" />
</p>

### Find a doctor

Search by name or specialization. Each card opens a profile with fee, availability, and **Book Now**.

<p align="center">
  <img src="docs/screenshots/02-doctors.png" alt="Doctors directory" width="920" />
</p>

### Doctor profile and booking

Qualifications, fee, success stats, date picker, patient form, and a live booking summary.

<p align="center">
  <img src="docs/screenshots/08-doctor.png" alt="Doctor profile and appointment form" width="920" />
</p>

### Diagnostic services

Blood sugar, full-body checkup, X-ray, BP check — same booking flow as doctors.

<p align="center">
  <img src="docs/screenshots/03-services.png" alt="Diagnostic services" width="920" />
</p>

### Payments

Cash at hospital, UPI, cards, and net banking. UPI ID is shown on the site.

<p align="center">
  <img src="docs/screenshots/05-payments.png" alt="Payments page" width="920" />
</p>

### Contact

Form opens WhatsApp with the clinic. Address, phone, email, and hours on the right.

<p align="center">
  <img src="docs/screenshots/06-contact.png" alt="Contact page" width="920" />
</p>

### Doctor login

Separate dashboard for appointments and profile. Demo: `dr1@gmail.com` / `123456`.

<p align="center">
  <img src="docs/screenshots/07-login.png" alt="Doctor login" width="920" />
</p>

---

## What you can do in the app

| Role | Features |
| --- | --- |
| **Patient** | Google sign-in, browse doctors & tests, book slot, cash or online pay, Gemini chat, WhatsApp |
| **Doctor** | JWT login, appointment list, edit profile / fees / availability |
| **Admin** | Add / edit doctors and diagnostic services (local admin app on port `5174`) |

**AI assistant (bottom-right)**

- Hindi or English
- Suggests a specialty or lab test from symptoms
- Does **not** diagnose or prescribe
- Emergency language → call **108**
- Uses live doctor and service lists from MongoDB
- Rate limited (20 requests / 10 minutes / IP)

---

## Distributed Systems Architecture

```text
  Patient Site (Vercel)          Doctor Dashboard            Admin Panel
           |                            |                         |
           +------------------- HTTPS / REST ---------------------+
                                        |
                         Nginx Load Balancer (:8080)
                                        |
                Smart API Gateway & Control Plane (:4000)
          [Tracing • Sliding-Window Rate Limiter • Idempotency]
                                        |
        +-----------------------+-------+---------------+-----------------------+
        |                       |                       |                       |
  Catalog Service        Booking Service        AI Triage Service      Notification Worker
     (:4001)                 (:4002)                 (:4003)                 (:4004)
  [Cache-Aside]        [Redlock + Fencing]      [Circuit Breaker]       [Event Bus + DLQ]
        |                       |                       |                       |
        +-----------+-----------+-----------+-----------+-----------------------+
                    |                       |                       |
             Redis Cluster            MongoDB Atlas          External APIs
         (L2 Cache & Mutex Locks)   (+ Resilient Store)    (Gemini / Stripe)
```

### Distributed Systems Primitives Implemented

| Primitive | Implementation (`backend/distributed/`) | Engineering Guarantee |
| --- | --- | --- |
| **Distributed Mutex Locks & Fencing Tokens** | `lockManager.js` | Redlock-style lock on `slot:doctor:<id>:<date>:<time>` with monotonic fencing tokens (`X-Fencing-Token`) prevents race-condition double-booking under high concurrency |
| **At-Most-Once Idempotency Engine** | `idempotency.js` | Deduplicates retries & double-clicks via `Idempotency-Key` header and payload SHA-256 fingerprinting (`X-Idempotent-Replay: true`) |
| **Multi-Tier Distributed Cache (L1 + L2)** | `cache.js` | L1 in-memory LRU + L2 Redis RESP client with Cache-Aside middleware (`X-Cache: HIT \| MISS`) and event-driven prefix invalidation |
| **Async Event Bus & Dead-Letter Queue** | `eventBus.js` | Pub/Sub message queue with exponential backoff retries (`maxAttempts: 3`), DLQ, and immutable event audit stream |
| **Dependency Circuit Breakers** | `circuitBreaker.js` | State machine (`CLOSED` → `OPEN` → `HALF_OPEN`) isolating Stripe, Cloudinary, and Gemini AI with clinical rule-based fallback triage |
| **Distributed Tracing & Percentiles** | `tracing.js` | Propagates `X-Request-Id`, `X-Correlation-Id`, `X-Served-By`, and tracks live `p50` / `p95` / `p99` latency histograms |
| **Zero-Downtime Resilient Store** | `resilientStore.js` | Non-blocking gateway startup + automatic in-memory fallback if MongoDB Atlas is paused, preventing cold-start crashes |

> **Live Telemetry & Concurrency Simulator:** Open `/system-status` in the frontend (or `GET /api/system/architecture`) to inspect the service mesh health and trigger an **8-way parallel booking race-condition test** in real time.

**Hosting:** frontend on **Vercel**, API Gateway on **Render** (Hybrid Mode) or **Docker Compose** (Multi-Container Microservices Mode), database on **MongoDB Atlas**.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | Google Sign-In (patients), bcrypt + JWT (doctors) |
| Payments | Cash path; Stripe Checkout when `STRIPE_SECRET_KEY` is set |
| AI | Google Gemini (`GEMINI_API_KEY`) |
| Images | Cloudinary (optional) + local uploads |
| Deploy | Vercel + Render |

---

## Demo login

| Role | How |
| --- | --- |
| Patient | **Continue with Google**, or `patient@gmail.com` / `123456` |
| Doctor | `dr1@gmail.com` / `123456` then `/doctor-admin` |
| Sample service | Full Body Health Checkup |

Doctor panel: `/login` → `/doctor-admin`. Admin app: `http://localhost:5174`.

> Render free tier sleeps after idle time. The first API request can take 30–60 seconds.

---

## Run locally

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set `MONGODB_URI` in `backend/.env` (Atlas). If local Mongo is down, development can fall back to an in-memory database.

```bash
# Option A: Hybrid Gateway Mode (Single Command)  →  http://localhost:4000
cd backend && npm install && npm run dev

# Option B: Full Multi-Container Microservices Cluster (Nginx + Gateway + 4 Services + Redis + Mongo)
docker compose up --build

# Patient site  →  http://localhost:5173
cd frontend && npm install && npm run dev

# Admin (optional)  →  http://localhost:5174
cd admin && npm install && npm run dev
```

Health & Distributed Telemetry:
- Health check: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- Service Mesh Topology: [http://localhost:4000/api/system/architecture](http://localhost:4000/api/system/architecture)
- Live Dashboard UI: [http://localhost:5173/system-status](http://localhost:5173/system-status)

---

## Environment variables

**Backend** (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas URI (`.../medicare`) |
| `JWT_SECRET` | Doctor JWT signing |
| `FRONTEND_URL` | Patient origin (CORS + Stripe redirects) |
| `ADMIN_URL` | Admin origin (CORS) |
| `PORT` | Default `4000` (Render sets this) |
| `GEMINI_API_KEY` | MediCare AI chat |
| `GEMINI_MODEL` | Optional model override |

Optional: `STRIPE_SECRET_KEY`, Cloudinary keys.

**Frontend** (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend base URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web client ID |
| `VITE_PHONE` / `VITE_EMAIL` / `VITE_UPI_ID` / `VITE_LOCATION` | Clinic details on the site |

Never commit `.env` files. Use `.env.example` as the template. Do not put a Google client **secret** in the frontend.

---

## Deploy notes

Already live:

1. **API** — Render Blueprint (`render.yaml`, service `medicare-api`)
2. **Patient site** — Vercel, root directory `frontend` (SPA rewrite in `vercel.json`)
3. **AI** — `GEMINI_API_KEY` on Render

If the Vercel URL changes, update:

- Render `FRONTEND_URL`
- Google Cloud → Authorized JavaScript origins (`localhost:5173` + live URL)
- Google test users while the OAuth app is in Testing

Atlas Network Access must allow Render (commonly `0.0.0.0/0` on a student project).

---

## Author

**Shivam Pal** — IIIT Agartala, CSE  
[GitHub](https://github.com/Shivampal157) · [LinkedIn](https://www.linkedin.com/in/shivam-pal-677777301)
