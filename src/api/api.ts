// src/api/api.ts

const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  throw new Error("VITE_API_URL is not defined");
}

export function getToken() {
  return localStorage.getItem("lomaa_token");
}

export function setToken(token: string) {
  localStorage.setItem("lomaa_token", token);
}

export function clearToken() {
  localStorage.removeItem("lomaa_token");
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
    ...authHeader(),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("Unauthorized");
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }

  return res;
}

export function apiGet(path: string) {
  return apiFetch(path);
}

export function apiPost(path: string, body: unknown) {
  return apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPut(path: string, body: unknown) {
  return apiFetch(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function apiDelete(path: string) {
  return apiFetch(path, {
    method: "DELETE",
  });
}

