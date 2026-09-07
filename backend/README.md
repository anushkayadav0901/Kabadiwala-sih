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

## WhatsApp bot

Set these values in `.env` before starting the API:

```text
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
GEMINI_API_KEY=your_gemini_key
```

Expose the API with ngrok and configure the Twilio WhatsApp Sandbox webhook as:

```text
https://your-ngrok-domain.ngrok-free.app/api/whatsapp/webhook
```

The bot supports text price queries such as `PCB rate?`, photo classification, weight and `YES`/`SKIP` lot confirmation, `SAFETY`, and Gemini-backed voice-note transcription. WhatsApp collectors are identified by phone number and their conversation state is stored in MongoDB.

Local webhook smoke test:

```powershell
Invoke-WebRequest -Uri http://localhost:5000/api/whatsapp/webhook -Method Post -ContentType "application/x-www-form-urlencoded" -Body @{ From = "whatsapp:+919876543210"; Body = "PCB rate?" } -UseBasicParsing
```

## Seeded recycler login

| Field | Value |
| --- | --- |
| Email | `delhi.ewaste@example.com` |
| Password | `Recycler@123` |

All seed recyclers share the same password. They are demo records only; validate recycler authorization before production use.

`setup.sql` is legacy Supabase reference material and is not used by this API.
