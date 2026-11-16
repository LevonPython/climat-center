const TOKEN_KEY = 'cc_admin_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export type Role = 'admin' | 'editor';

function readTokenPayload(): Record<string, unknown> | null {
  const payload = getToken()?.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function getRole(): Role | null {
  const role = readTokenPayload()?.role;
  return role === 'admin' || role === 'editor' ? role : null;
}

export function getUserId(): string | null {
  const sub = readTokenPayload()?.sub;
  return typeof sub === 'string' ? sub : null;
}
