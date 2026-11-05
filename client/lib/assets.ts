import { apiBaseUrl } from './api';

// Local uploads are stored as paths on the API. Vercel Blob files already have a full address.
export function assetUrl(url: string): string {
  return url.startsWith('/uploads/') ? `${apiBaseUrl()}${url}` : url;
}
