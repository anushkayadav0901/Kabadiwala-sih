// ---------------------------------------------------------------------------
// AUTH SERVICE — LOCAL-ONLY MODE
//
// The Supabase-backed implementation is preserved below each function inside a
// `BACKEND (disabled)` comment block. While no backend is connected, accounts
// live in localStorage and the 6-digit code is shown on screen instead of being
// sent by SMS. Function signatures are unchanged so a real backend can be
// restored without touching any page.
// ---------------------------------------------------------------------------

import { hashPin, verifyPinHash, generatePin } from "../utils/helpers";

const SESSION_KEY = "kabadi_collector_session";
const TEMP_PHONE_KEY = "kabadi_temp_phone";
const DEMO_PIN_KEY = "kabadi_demo_pin";
const COLLECTORS_KEY = "kabadi_local_collectors";
const BUYERS_KEY = "kabadi_local_buyers";
const BUYER_SESSION_KEY = "kabadi_buyer_session";
const PIN_TTL_MS = 10 * 60 * 1000;

const toSessionUser = (collector) => ({
  id: collector.id,
  name: collector.name,
  phone: collector.phone,
  preferredLanguage: collector.preferred_language || "en",
  locationLat: collector.location_lat,
  locationLng: collector.location_lng,
  isLoggedIn: true,
  role: "collector",
  loginTimestamp: new Date().toISOString()
});

// --- Local store helpers (stand-in for the collectors / recyclers tables) ---

const readStore = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const writeStore = (key, rows) => {
  localStorage.setItem(key, JSON.stringify(rows));
};

const upsertCollector = (row) => {
  const rows = readStore(COLLECTORS_KEY);
  const index = rows.findIndex((r) => r.phone === row.phone);
  if (index >= 0) {
    rows[index] = { ...rows[index], ...row };
  } else {
    rows.push({ id: `coll_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, ...row });
  }
  writeStore(COLLECTORS_KEY, rows);
  return rows.find((r) => r.phone === row.phone);
};

const findCollector = (phone) => readStore(COLLECTORS_KEY).find((r) => r.phone === phone);

export const saveSession = (user) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TEMP_PHONE_KEY);
  localStorage.removeItem(DEMO_PIN_KEY);
};

export const getCurrentUser = () => {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      clearSession();
    }
  }
  return { isLoggedIn: false, role: null };
};

export const registerCollector = async ({
  name,
  phone,
  preferredLanguage = "en",
  locationLat = null,
  locationLng = null
}) => {
  const pin = generatePin();
  const pinHash = await hashPin(pin);
  const pinExpiresAt = new Date(Date.now() + PIN_TTL_MS).toISOString();

  const collector = upsertCollector({
    phone,
    name: name.trim(),
    preferred_language: preferredLanguage,
    location_lat: locationLat,
    location_lng: locationLng,
    pin_hash: pinHash,
    pin_expires_at: pinExpiresAt
  });

  // BACKEND (disabled) ------------------------------------------------------
  // const { data, error } = await supabase
  //   .from("collectors")
  //   .upsert(
  //     {
  //       phone,
  //       name: name.trim(),
  //       preferred_language: preferredLanguage,
  //       location_lat: locationLat,
  //       location_lng: locationLng,
  //       pin_hash: pinHash,
  //       pin_expires_at: pinExpiresAt
  //     },
  //     { onConflict: "phone" }
  //   )
  //   .select()
  //   .single();
  // if (error) throw new Error(error.message);
  // -------------------------------------------------------------------------

  localStorage.setItem(TEMP_PHONE_KEY, phone);
  sessionStorage.setItem(DEMO_PIN_KEY, pin);

  return {
    success: true,
    collectorId: collector.id,
    message: `Verification code generated for +91 ${phone}`,
    demoPin: pin
  };
};

export const sendOTP = async (phone) => {
  const existing = findCollector(phone);
  if (!existing) {
    throw new Error("No account found. Please sign up first.");
  }

  const pin = generatePin();
  const pinHash = await hashPin(pin);
  const pinExpiresAt = new Date(Date.now() + PIN_TTL_MS).toISOString();

  upsertCollector({ ...existing, pin_hash: pinHash, pin_expires_at: pinExpiresAt });

  // BACKEND (disabled) ------------------------------------------------------
  // const { data: existing } = await supabase
  //   .from("collectors").select("id, phone, name").eq("phone", phone).maybeSingle();
  // await supabase
  //   .from("collectors")
  //   .update({ pin_hash: pinHash, pin_expires_at: pinExpiresAt })
  //   .eq("phone", phone);
  // -------------------------------------------------------------------------

  localStorage.setItem(TEMP_PHONE_KEY, phone);
  sessionStorage.setItem(DEMO_PIN_KEY, pin);

  return {
    success: true,
    message: `Verification code generated for +91 ${phone}`,
    demoPin: pin
  };
};

export const verifyOTP = async (code, phoneOverride = null) => {
  const phone = phoneOverride || localStorage.getItem(TEMP_PHONE_KEY);
  if (!phone) throw new Error("Session expired. Please log in again.");
  if (!code || code.length !== 6) {
    throw new Error("Please enter a valid 6-digit code");
  }

  const collector = findCollector(phone);
  if (!collector) throw new Error("Account not found. Please sign up.");

  if (collector.pin_expires_at && new Date(collector.pin_expires_at) < new Date()) {
    throw new Error("Code expired. Please request a new one.");
  }

  const valid = await verifyPinHash(code, collector.pin_hash);
  if (!valid) throw new Error("Invalid verification code");

  upsertCollector({ ...collector, pin_hash: null, pin_expires_at: null });

  // BACKEND (disabled) ------------------------------------------------------
  // const { data: collector } = await supabase
  //   .from("collectors").select("*").eq("phone", phone).single();
  // await supabase
  //   .from("collectors")
  //   .update({ pin_hash: null, pin_expires_at: null })
  //   .eq("id", collector.id);
  // -------------------------------------------------------------------------

  const userSession = toSessionUser(collector);
  saveSession(userSession);
  sessionStorage.removeItem(DEMO_PIN_KEY);

  return { success: true, user: userSession };
};

export const resendOTP = async (phone) => sendOTP(phone);

export const logoutUser = async () => {
  clearSession();
  // BACKEND (disabled): await supabase.auth.signOut();
  return { success: true };
};

export const getDemoPin = () => sessionStorage.getItem(DEMO_PIN_KEY);

// --- Recycler / Buyer auth --------------------------------------------------
// Local mode stores buyer accounts in localStorage. Passwords are hashed with
// the same SHA-256 helper used for the collector PIN; this is a stand-in for a
// real auth provider, not a production credential store.

export const registerBuyer = async ({
  name,
  email,
  password,
  contact,
  registrationId,
  locationLat,
  locationLng,
  materialsAccepted,
  offeredRates,
  pickupAvailable
}) => {
  const buyers = readStore(BUYERS_KEY);
  if (buyers.some((b) => b.email === email)) {
    throw new Error("An account already exists for this email.");
  }

  const recycler = {
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    email,
    password_hash: await hashPin(password),
    contact: contact || email,
    registration_id: registrationId || null,
    location_lat: locationLat,
    location_lng: locationLng,
    materials_accepted: materialsAccepted,
    offered_rates: offeredRates || {},
    pickup_available: pickupAvailable ?? false,
    authorized: false,
    created_at: new Date().toISOString()
  };

  buyers.push(recycler);
  writeStore(BUYERS_KEY, buyers);

  // BACKEND (disabled) ------------------------------------------------------
  // const { data: authData, error: authError } = await supabase.auth.signUp({
  //   email, password, options: { data: { role: "recycler", name } }
  // });
  // if (authError) throw new Error(authError.message);
  // const { data: recycler, error: dbError } = await supabase
  //   .from("recyclers")
  //   .insert({
  //     name,
  //     contact: contact || email,
  //     registration_id: registrationId || null,
  //     location_lat: locationLat,
  //     location_lng: locationLng,
  //     materials_accepted: materialsAccepted,
  //     offered_rates: offeredRates || {},
  //     pickup_available: pickupAvailable ?? false,
  //     authorized: false
  //   })
  //   .select()
  //   .single();
  // if (dbError) throw new Error(dbError.message);
  // -------------------------------------------------------------------------

  localStorage.setItem(
    BUYER_SESSION_KEY,
    JSON.stringify({
      id: recycler.id,
      name: recycler.name,
      email,
      role: "buyer",
      isLoggedIn: true
    })
  );

  return { success: true, recycler };
};

export const loginBuyer = async (email, password) => {
  const recycler = readStore(BUYERS_KEY).find((b) => b.email === email);
  if (!recycler) throw new Error("No buyer account found for this email.");

  const valid = await verifyPinHash(password, recycler.password_hash);
  if (!valid) throw new Error("Incorrect password.");

  // BACKEND (disabled) ------------------------------------------------------
  // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // if (error) throw new Error(error.message);
  // const { data: recycler } = await supabase
  //   .from("recyclers").select("*").eq("contact", email).maybeSingle();
  // -------------------------------------------------------------------------

  const session = {
    id: recycler.id,
    name: recycler.name,
    email,
    role: "buyer",
    isLoggedIn: true,
    recycler
  };

  localStorage.setItem(BUYER_SESSION_KEY, JSON.stringify(session));
  return { success: true, session };
};

export const getCurrentBuyer = () => {
  const stored = localStorage.getItem(BUYER_SESSION_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(BUYER_SESSION_KEY);
    }
  }
  return { isLoggedIn: false, role: null };
};

export const logoutBuyer = async () => {
  localStorage.removeItem(BUYER_SESSION_KEY);
  // BACKEND (disabled): await supabase.auth.signOut();
  return { success: true };
};
