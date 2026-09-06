# Kabadiwala Connect API

Express + MongoDB backend for the collector and recycler portals. It uses JWT bearer
tokens, Mongoose models, and local image uploads in `uploads/`.

## Run

1. Ensure MongoDB is running, then update `.env` if needed.
2. Run `npm install` and `npm run seed`.
3. Run `npm run dev` (or `npm start`). The API starts on port 5000 by default.
4. In `../frontend`, copy `.env.example` to `.env` and set `VITE_API_URL` if the API
   is not at `http://localhost:5000/api`.

The seed includes ten CPCB-authorized Delhi NCR recyclers. Their shared demo login
password is `Recycler@123`.

`setup.sql` remains only as legacy Supabase reference material and is no longer used.
