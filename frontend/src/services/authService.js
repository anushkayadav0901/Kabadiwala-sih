import { api, clearAuthToken, saveAuthToken } from "./api";

const SESSION_KEY = "kabadi_collector_session";
const BUYER_SESSION_KEY = "kabadi_buyer_session";
const normalizeUser = (user) => ({ ...user, role: user.role === "recycler" ? "buyer" : "collector", isLoggedIn: true });
const storeAuth = ({ token, user }) => {
  const session = normalizeUser(user);
  saveAuthToken(token);
  localStorage.setItem(session.role === "buyer" ? BUYER_SESSION_KEY : SESSION_KEY, JSON.stringify(session));
  return session;
};

export const saveSession = (user) => localStorage.setItem(SESSION_KEY, JSON.stringify(user));
export const clearSession = () => { localStorage.removeItem(SESSION_KEY); clearAuthToken(); };
export const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || { isLoggedIn: false, role: null }; }
  catch { clearSession(); return { isLoggedIn: false, role: null }; }
};
export const registerCollector = async ({ name, phone, password, preferredLanguage = "en", locationLat = null, locationLng = null }) => {
  const response = await api("/auth/register", { method: "POST", body: { role: "collector", name, phone, password, preferredLanguage, locationLat, locationLng } });
  return { success: true, user: storeAuth(response) };
};
export const loginCollector = async (phone, password) => {
  const response = await api("/auth/login", { method: "POST", body: { phone, password, role: "collector" } });
  return { success: true, user: storeAuth(response) };
};
export const logoutUser = async () => { clearSession(); return { success: true }; };

// Compatibility exports for the retired OTP screen. Authentication is now JWT/password based.
export const sendOTP = async () => { throw new Error("Password login is now required."); };
export const verifyOTP = async () => { throw new Error("Password login is now required."); };
export const resendOTP = sendOTP;
export const getDemoPin = () => null;

export const registerBuyer = async ({ name, email, password, contact, registrationId, locationLat, locationLng, materialsAccepted, offeredRates, pickupAvailable }) => {
  const response = await api("/auth/register", { method: "POST", body: { role: "recycler", name, email, password, contact, registrationId, locationLat, locationLng, materialsAccepted, offeredRates, pickupAvailable } });
  return { success: true, recycler: response.user, session: storeAuth(response) };
};
export const loginBuyer = async (email, password) => {
  const response = await api("/auth/login", { method: "POST", body: { email, password, role: "recycler" } });
  return { success: true, session: storeAuth(response) };
};
export const getCurrentBuyer = () => {
  try { return JSON.parse(localStorage.getItem(BUYER_SESSION_KEY)) || { isLoggedIn: false, role: null }; }
  catch { localStorage.removeItem(BUYER_SESSION_KEY); return { isLoggedIn: false, role: null }; }
};
export const logoutBuyer = async () => { localStorage.removeItem(BUYER_SESSION_KEY); clearAuthToken(); return { success: true }; };
