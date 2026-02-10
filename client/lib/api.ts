export type ApiOk<T> = { ok: true } & T;
export type ApiErr = { ok: false; error: { message: string; status?: number; details?: unknown } };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const url = `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });

  const data = (await res.json().catch(() => null)) as any;
  if (!data || typeof data !== 'object') {
    return { ok: false, error: { message: `Bad response (${res.status})`, status: res.status } };
  }
  return data as ApiResponse<T>;
}

