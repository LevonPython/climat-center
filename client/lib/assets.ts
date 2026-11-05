import { apiBaseUrl } from './api';

// Local uploads are stored as paths on the API. Vercel Blob files already have a full address.
export function assetUrl(url: string): string {
  return url.startsWith('/uploads/') ? `${apiBaseUrl()}${url}` : url;
}

// The image service refuses any other address, so those pictures have to be shown as they are.
export function isResizable(url: string): boolean {
  return url.startsWith(`https://${process.env.NEXT_PUBLIC_BLOB_HOST}/`);
}
