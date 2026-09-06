// ---------------------------------------------------------------------------
// BACKEND CLIENT — CURRENTLY DISCONNECTED
//
// The project previously talked to Supabase. Every Supabase call has been
// commented out (not deleted) so a replacement backend can be dropped in
// without re-deriving the data model. Until then the app runs fully on local
// data: mock catalogues in src/data/mockData.js plus localStorage.
//
// To re-enable a backend:
//   1. reinstall the client library, e.g. `npm i @supabase/supabase-js`
//   2. uncomment the block below and set the env vars in .env
//   3. uncomment the DB blocks marked `BACKEND (disabled)` in src/services/*
// ---------------------------------------------------------------------------

// import { createClient } from "@supabase/supabase-js";
//
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
//
// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     persistSession: true,
//     autoRefreshToken: true,
//     detectSessionInUrl: true
//   }
// });

// No client is configured. Services check this flag before touching the network
// and fall back to local data, so nothing throws while the backend is absent.
export const supabase = null;

export const isBackendConfigured = false;

// Legacy alias — keeps existing service imports working during the migration.
export const isSupabaseConfigured = isBackendConfigured;
