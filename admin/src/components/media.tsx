import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type ChangeEvent } from 'react';
import { assetUrl } from '../api';
import { request } from '../lib/request';
import { ui } from './ui';

export type MediaKind = 'image' | 'document';

export type MediaAsset = {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  kind: MediaKind;
  alt_ru: string | null;
  alt_en: string | null;
  alt_hy: string | null;
  created_at: string;
};

const PAGE_SIZE = 48;
export const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp,image/gif,image/avif';
export const ACCEPTED_DOCUMENTS = 'application/pdf';
export const ACCEPTED_FILES = `${ACCEPTED_IMAGES},${ACCEPTED_DOCUMENTS}`;

type MediaPage = { assets: MediaAsset[]; limit: number; offset: number };

export function useMediaList(kind?: MediaKind) {
  return useInfiniteQuery({
    queryKey: ['media', kind ?? 'all'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      request<MediaPage>(`/api/admin/media?limit=${PAGE_SIZE}&offset=${pageParam}${kind ? `&kind=${kind}` : ''}`),
    getNextPageParam: (last) => (last.assets.length === last.limit ? last.offset + last.limit : undefined)
  });
}

export async function uploadMedia(file: File): Promise<MediaAsset> {
  const body = new FormData();
  body.append('file', file);
  return (await request<{ asset: MediaAsset }>('/api/admin/media', { method: 'POST', body })).asset;
}

export function MediaThumb({ asset, className }: { asset: MediaAsset; className: string }) {
  if (asset.kind === 'image') {
    return <img src={assetUrl(asset.url)} alt="" loading="lazy" className={`${className} object-contain`} />;
  }
  return <span className={`${className} grid place-items-center text-sm font-bold text-slate-700`}>PDF</span>;
}

type UploadButtonProps = {
  label: string;
  busyLabel: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => Promise<void>;
};

export function UploadButton({ label, busyLabel, accept, multiple, onFiles }: UploadButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      await onFiles(files);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className={`${ui.secondary} inline-flex cursor-pointer items-center justify-center focus-within:ring-2 focus-within:ring-slate-500`}>
      {busy ? busyLabel : label}
      <input type="file" className="sr-only" accept={accept} multiple={multiple} disabled={busy} onChange={handleChange} />
    </label>
  );
}
