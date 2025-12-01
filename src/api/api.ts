


const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api';

export function getToken() {
  return localStorage.getItem('lomaa_token');
}
export function setToken(token: string) {
  localStorage.setItem('lomaa_token', token);
}
export function clearToken() {
  localStorage.removeItem('lomaa_token');
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any ?? {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401) {
    // optionally handle logout
    clearToken();
    throw new Error('Unauthorized');
  }
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return await res.json();
  return res;
}
