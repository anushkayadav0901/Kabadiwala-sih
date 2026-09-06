# Backend — Kabadiwala Connect

The Express + MongoDB API uses JWT authentication, Mongoose models, signed Kabadi Passport handovers, price/recycler APIs, and local development uploads.

For the complete project setup, deployment instructions, and current limitations, see the [root README](../README.md).

## Quick start

```powershell
npm install
Copy-Item .env.example .env
# Edit .env with MONGODB_URI and JWT_SECRET
npm run seed
npm run dev
```

The default API URL is `http://localhost:5000/api`.

## Seeded recycler login

| Field | Value |
| --- | --- |
| Email | `delhi.ewaste@example.com` |
| Password | `Recycler@123` |

All seed recyclers share the same password. They are demo records only; validate recycler authorization before production use.

`setup.sql` is legacy Supabase reference material and is not used by this API.
