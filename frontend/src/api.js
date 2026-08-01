const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function shortenUrl(originalUrl) {
  const res = await fetch(`${BASE_URL}/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originalUrl }),
  });
  return handle(res);
}

export async function getAllUrls() {
  const res = await fetch(`${BASE_URL}/analytics/all`);
  return handle(res);
}

export async function getTopUrls() {
  const res = await fetch(`${BASE_URL}/analytics/top`);
  return handle(res);
}

export async function getUrlByCode(code) {
  const res = await fetch(`${BASE_URL}/analytics/${code}`);
  return handle(res);
}

export { BASE_URL };