const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "kabadi_auth_token";

export const saveAuthToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearAuthToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = async (path, { method = "GET", body, headers = {}, auth = false } = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const isForm = body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(isForm ? {} : body ? { "Content-Type": "application/json" } : {}),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "The server could not complete this request");
  return payload;
};
