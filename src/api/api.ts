


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

export function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
   
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as any ?? {}),
    ...authHeader()
  };

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  
  if (res.status === 401) {
    clearToken();
    throw new Error('Unauthorized');
  }

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return await res.json();
  
  return res;
}


export async function apiGet(path: string) {
  return apiFetch(path);
}

export async function apiPost(path: string, body: any) {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiPut(path: string, body: any) {
  return apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string) {
  return apiFetch(path, { method: 'DELETE' });
}