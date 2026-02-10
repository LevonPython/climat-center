import { getToken } from './auth';

export type ApiOk<T> = { ok: true } & T;
export type ApiErr = { ok: false; error: { message: string; status?: number; details?: unknown } };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init?.headers as any)
  };
  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });

  const data = (await res.json().catch(() => null)) as any;
  if (!data || typeof data !== 'object') {
    return { ok: false, error: { message: `Bad response (${res.status})`, status: res.status } };
  }
  return data as ApiResponse<T>;
}

