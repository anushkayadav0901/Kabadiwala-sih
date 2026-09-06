# Kabadiwala Connect

Kabadiwala Connect is a React PWA and Node.js/Express + MongoDB platform that helps informal scrap collectors create traceable lots, discover fair prices, find recyclers, and complete a signed QR handover.

## What is included

- On-device TF.js material classification
- Photo, weight, price-range and digital-lot flow
- Price board with 30-day trends and spoken rates
- Recycler map and explainable matching score
- Signed **Kabadi Passport** QR handover
- Recycler portal, handover confirmation, certificate and PDF invoice
- Earnings passbook with pending dues
- Hindi, Marathi and English UI; pictorial/audio safety guidance
- PWA manifest, offline banner and caching
- Optional Gemini Vision API routes and rule-based transaction-risk checks

> **Demo-data notice:** Recycler authorization and price records are seed/demo data. They must be validated against official CPCB and market/recycler sources before a production or judging claim.

## Prerequisites

- Node.js 20 or newer
- MongoDB Community Server **or** a MongoDB Atlas database
- npm

## Run locally

Open two PowerShell terminals from this project folder.

### 1. Set up and start the backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Open `backend/.env` and set values similar to:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/kabadiwala_connect
JWT_SECRET=replace-this-with-a-long-random-secret
PORT=5000
CLIENT_ORIGIN=http://localhost:3000

# Optional — leave blank to use only the on-device TF.js model
GEMINI_API_KEY=
```

Seed the demo price and recycler data, then start the API:

```powershell
npm run seed
npm run dev
```

The API runs at `http://localhost:5000/api`.

### 2. Set up and start the frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The app opens at `http://localhost:3000`.

`frontend/.env` should contain:

```env
VITE_API_URL=http://localhost:5000/api
```

## Demo logins

Run `npm run seed` in `backend` before using this login.

### Recycler portal

Open `http://localhost:3000/buyer/login`.

| Field | Demo value |
| --- | --- |
| Email | `delhi.ewaste@example.com` |
| Password | `Recycler@123` |

All ten seeded recycler accounts use the same password: `Recycler@123`.

### Collector portal

There is intentionally **no seeded collector login**. Create one from the collector registration screen using any name, phone number, and a password of at least six characters. This makes the collector’s lots and ledger belong to that account.

## Demo flow

1. Register a collector and sign in.
2. Scan/upload a material photo, enter a weight, and create a lot.
3. Open a recycler and start the verified sale to create a signed Kabadi Passport QR.
4. In another browser/profile, sign in to the Recycler Portal with the demo login.
5. Scan the QR, verify the lot, and confirm handover.
6. Return to the collector account to view its certificate and earnings passbook.

## Production build

```powershell
cd frontend
npm run build
npm run preview
```

The generated frontend is in `frontend/dist`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Signs JWT sessions and Kabadi Passport signatures |
| `PORT` | No | API port; defaults to `5000` |
| `CLIENT_ORIGIN` | Yes in deployment | Comma-separated permitted frontend origins |
| `GEMINI_API_KEY` | No | Enables Gemini API endpoints; TF.js remains the default fallback |

### Frontend (`frontend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Full API base URL, for example `https://your-api.example.com/api` |

Never commit either `.env` file or a real Gemini/MongoDB secret.

## Deployment outline

1. Create a MongoDB Atlas database and copy its connection string into the backend host’s `MONGODB_URI` setting.
2. Deploy `backend` to Render, Railway, or another Node host. Set `JWT_SECRET` and `CLIENT_ORIGIN=https://your-vercel-app.vercel.app`.
3. Run `npm run seed` once against the deployment database, or import validated production data instead.
4. Deploy `frontend` to Vercel with root directory `frontend` and set `VITE_API_URL=https://your-api-host/api`.
5. Redeploy the frontend after setting `VITE_API_URL`.

For production, replace local `backend/uploads/` storage with Cloudinary/S3-compatible storage because local host disks may not persist uploads.

## Current limitations

- Price history and recycler data are demo seeds, not live CPCB/market feeds.
- The transaction shield is explainable rule-based detection, not a trained IsolationForest model.
- Offline lot queue utilities exist, but full queued-lot synchronization still needs connection to the create-lot flow.
- Gemini server routes require a key and are not yet called automatically by the scan screen.
- No real payment gateway is connected; payments are recorded as transaction status.

## Useful commands

| Command | Where | Purpose |
| --- | --- | --- |
| `npm run dev` | `backend` | Start Express with auto-reload |
| `npm start` | `backend` | Start Express normally |
| `npm run seed` | `backend` | Reset and seed recyclers/prices |
| `npm run dev` | `frontend` | Start Vite development server |
| `npm run build` | `frontend` | Create production build |

