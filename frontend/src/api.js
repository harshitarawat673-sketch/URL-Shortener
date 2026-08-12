const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export async function registerUser(email, password) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handle(res);
  if (data.token) setToken(data.token);
  return data;
}

export async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handle(res);
  if (data.token) setToken(data.token);
  return data;
}

export function logoutUser() {
  clearToken();
}
export async function shortenUrl(originalUrl, customCode, expiresInDays) {
  const res = await fetch(`${BASE_URL}/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ originalUrl, customCode, expiresInDays }),
  });
  return handle(res);
}

export async function getAllUrls() {
  const res = await fetch(`${BASE_URL}/analytics/all`, {
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function getTopUrls() {
  const res = await fetch(`${BASE_URL}/analytics/top`, {
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function getUrlByCode(code) {
  const res = await fetch(`${BASE_URL}/analytics/${code}`, {
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export { BASE_URL };