# Kabadiwala Connect

**A digital platform for India's informal e-waste and scrap collectors — built for Smart India Hackathon 2026, Problem Statement 26229 (Ministry of Mines).**

Kabadiwala Connect bridges the gap between grassroots waste collectors (kabadiwalas) and the formal recycling ecosystem. It gives collectors on-device AI material identification, real-time scrap pricing, verified recycler discovery, EPR compliance tracking, and a tamper-proof digital handover system — all accessible in Hindi, Marathi, and English with a mobile-first, offline-capable PWA.

---

## Problem Statement

> **SIH 2026 - PS 26229 (Ministry of Mines)**
>
> India generates over 3.2 million tonnes of e-waste annually, yet 95% is handled by the informal sector without safety protocols, fair pricing, or regulatory traceability. Collectors lack tools to identify hazardous materials, verify buyer credentials, or participate in Extended Producer Responsibility (EPR) compliance under the E-Waste Management Rules, 2022.

Kabadiwala Connect solves this by putting AI-powered identification, market-linked pricing, and CPCB-verified recycler networks directly into collectors' hands.

---

## Key Features

### AI Material Scanner (On-Device)
- **Live AR Camera Overlay** — Point the camera at scrap, get real-time material classification with confidence score and price/kg floating on the live feed
- **TensorFlow.js + Teachable Machine** model runs entirely on-device — works without internet
- Recognizes 10+ e-waste categories: PCBs, batteries, mobiles, printers, CRT/LCD displays, cables, motors, and more
- Click to capture for full detailed scan result with safety warnings

### Real-Time Scrap Pricing
- Live market rates synced from MetalMandi with centralized master document
- 30-day price trend charts for every material category
- Spoken rate playback for low-literacy users
- Market range (min/max) and source confidence indicators

### Recycler Discovery & Matching
- Interactive map with Leaflet showing CPCB-authorized recyclers
- Explainable matching score based on distance, materials accepted, authorization level, and EPR partnerships
- Filter by material type, distance radius, and EPR producer partnerships
- One-tap navigation to recycler location

### EPR Compliance Dashboard
- Real-time Extended Producer Responsibility tracking under E-Waste Management Rules 2022, Schedule III
- 8 major producers tracked (Samsung, Apple, LG, HP, Dell, Xiaomi, Voltas, boAt) with SVG brand logos
- Collection targets, compliance percentages, and annual ramp visualization
- Direct integration — sell to EPR-partnered recyclers and contribute to producer targets

### Kabadi Passport (Digital Handover)
- Signed QR code handover between collector and verified recycler
- Tamper-proof digital lot with photo, weight, material classification, and price
- Recycler scans QR → verifies lot → confirms handover
- PDF invoice and certificate generation for both parties

### Gamification & Rewards
- Collector levels (Eco Hero → Kabaad Ustaad), XP progression, weekly streaks
- Token-based reward store — earn tokens for verified sales
- Leaderboard ranking across the collector network
- Weekly goals with bonus token incentives

### Safety & Compliance
- Pictorial + audio safety guidance for hazardous materials (batteries, CRTs, toner)
- Material-specific safety warnings shown at scan time
- CPCB authorization verification for recyclers
- Transaction risk detection with explainable rule-based flags

### Multi-Language & Accessibility
- Full UI in Hindi, Marathi, and English
- Spoken rates and audio safety guidance for low-literacy users
- Mobile-first responsive design, works on low-end Android devices
- PWA with offline banner and service worker caching

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, Vite 6, Tailwind CSS 4, Framer Motion |
| **Backend** | Node.js, Express.js, MongoDB/Mongoose |
| **AI/ML** | TensorFlow.js, Teachable Machine (MobileNet), on-device inference |
| **Maps** | React Leaflet, OpenStreetMap |
| **Auth** | JWT with signed Kabadi Passport tokens |
| **PWA** | Service workers, offline caching, install prompt |
| **Optional** | Google Gemini Vision API (server-side fallback) |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  React PWA (Vite)                │
│  ┌───────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ TF.js     │ │ Leaflet  │ │ Framer Motion  │  │
│  │ Scanner   │ │ Maps     │ │ Animations     │  │
│  └─────┬─────┘ └────┬─────┘ └───────┬────────┘  │
│        └────────────┬┘               │           │
│              Service Worker + Cache              │
└──────────────────────┬───────────────────────────┘
                       │ REST API
┌──────────────────────┴───────────────────────────┐
│              Express.js API Server               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ JWT Auth │ │ EPR      │ │ MetalMandi       │  │
│  │ Middleware│ │ Service  │ │ Price Sync       │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
└──────────────────────┬───────────────────────────┘
                       │
              ┌────────┴────────┐
              │    MongoDB      │
              │  (Atlas/Local)  │
              └─────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local Community Server or Atlas)
- npm

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure `backend/.env`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/kabadiwala_connect
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
GEMINI_API_KEY=              # optional
```

Seed demo data and start:
```bash
npm run seed
npm run dev
```

API runs at `http://localhost:5000/api`

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Configure `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

App opens at `http://localhost:3000`

---

## Demo Credentials

| Portal | Credentials |
| --- | --- |
| **Collector** | Phone: `9999888877`, Password: `demo1234` |
| **Recycler** | Email: `delhi.ewaste@example.com`, Password: `Recycler@123` |

All 10 seeded recycler accounts share the password `Recycler@123`. Recycler portal is at `/buyer/login`.

---

## Demo Walkthrough

1. **Sign in** as a collector with the demo credentials
2. **Scan Material** — open the live camera, point at any e-waste item. The AR overlay shows the detected material, confidence, and price in real-time
3. **Capture & Create Lot** — tap shutter for full scan result, enter weight, create a digital lot
4. **Find Recycler** — browse the map, check matching scores, filter by material or EPR partnership
5. **Sell & Handover** — initiate verified sale, generate Kabadi Passport QR
6. **Recycler Portal** — sign in as recycler in another browser, scan the QR, verify and confirm handover
7. **Track Earnings** — return to collector account, view certificate, earnings passbook, and token rewards
8. **EPR Dashboard** — check producer compliance targets and contribution tracking

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Signs JWT sessions and Kabadi Passport |
| `PORT` | No | API port (default: `5000`) |
| `CLIENT_ORIGIN` | Yes (prod) | Comma-separated frontend origins |
| `GEMINI_API_KEY` | No | Enables Gemini Vision fallback |

### Frontend (`frontend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes | API base URL |

> Never commit `.env` files or secrets to version control.

---

## Deployment

1. **Database** — Create a MongoDB Atlas cluster, copy the connection string
2. **Backend** — Deploy to Render/Railway, set `JWT_SECRET`, `CLIENT_ORIGIN`, and `MONGODB_URI`
3. **Seed** — Run `npm run seed` once against the production database
4. **Frontend** — Deploy to Vercel with root directory `frontend`, set `VITE_API_URL`
5. **Storage** — Replace local `backend/uploads/` with Cloudinary/S3 for persistent file storage

---

## Available Scripts

| Command | Directory | Purpose |
| --- | --- | --- |
| `npm run dev` | `backend` | Start API with auto-reload |
| `npm start` | `backend` | Start API (production) |
| `npm run seed` | `backend` | Reset and seed demo data |
| `npm run dev` | `frontend` | Vite dev server with HMR |
| `npm run build` | `frontend` | Production build → `frontend/dist` |
| `npm run preview` | `frontend` | Preview production build locally |

---

## Regulatory Context

- **E-Waste (Management) Rules, 2022** — Schedule III defines Extended Producer Responsibility targets
- **CPCB** (Central Pollution Control Board) — Authorization and registration of recyclers/dismantlers
- **MoEFCC** (Ministry of Environment, Forest and Climate Change) — Policy oversight
- **PROs** (Producer Responsibility Organisations) — Karo Sambhav, Ecoreco, E-Waste Recyclers India

---

## Current Limitations

- Price and recycler data are demo seeds, not live CPCB/market feeds
- Transaction shield uses rule-based detection, not a trained anomaly model
- Full offline lot synchronization is partially implemented
- No real payment gateway — payments are recorded as status updates
- Gemini fallback requires API key and is not auto-triggered from scan

---

*Built for Smart India Hackathon 2026 — Ministry of Mines, Problem Statement 26229*
