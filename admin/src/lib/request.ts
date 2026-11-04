import type { TFunction } from 'i18next';
import { apiFetch } from '../api';

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await apiFetch<T>(path, init);
  if (!resp.ok) throw new ApiError(resp.error?.message || 'Request failed', resp.error?.status);
  return resp;
}

export function send<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, data?: unknown): Promise<T> {
  return request<T>(path, { method, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
}

const STATUS_MESSAGES: Record<number, string> = {
  401: 'errors.session',
  403: 'errors.forbidden',
  413: 'errors.tooLarge',
  503: 'errors.storage'
};

export function errorText(t: TFunction, err: unknown, fallbackKey: string, byStatus: Record<number, string> = {}): string {
  if (err instanceof TypeError) return t('errors.network');
  const status = err instanceof ApiError ? err.status : undefined;
  const key = status ? byStatus[status] || STATUS_MESSAGES[status] : undefined;
  return t(key || fallbackKey);
}
