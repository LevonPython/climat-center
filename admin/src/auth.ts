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

export function getRole(): Role | null {
  const payload = getToken()?.split('.')[1];
  if (!payload) return null;
  try {
    const { role } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return role === 'admin' || role === 'editor' ? role : null;
  } catch {
    return null;
  }
}
