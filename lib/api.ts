import { getIdToken } from '@react-native-firebase/auth';
import { auth } from './firebase';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://awarizon.shop';

async function getToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try { return await getIdToken(user, forceRefresh); } catch { return null; }
}

async function request<T>(path: string, init: RequestInit = {}, retry = false): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const method = init.method ?? 'GET';
  console.log(`[API] ${method} ${path}`, { hasToken: !!token, retry });

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  console.log(`[API] ${method} ${path} → ${res.status}`);

  if (res.status === 401 && !retry) {
    console.log('[API] 401 — refreshing token and retrying');
    const fresh = await getToken(true);
    if (fresh) {
      return request<T>(path, { ...init, headers: { ...headers, Authorization: `Bearer ${fresh}` } }, true);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`;
    console.warn(`[API] ${method} ${path} failed:`, msg, body);
    throw new Error(msg);
  }

  const data = await res.json();
  console.log(`[API] ${method} ${path} response:`, data);
  return data as T;
}

export const api = {
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)               => request<T>(path, { method: 'DELETE' }),
};
