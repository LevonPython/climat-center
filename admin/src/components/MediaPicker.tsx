import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { errorText } from '../lib/request';
import { ACCEPTED_FILES, ACCEPTED_IMAGES, MediaThumb, UploadButton, uploadMedia, useMediaList, type MediaAsset, type MediaKind } from './media';
import { ui } from './ui';

type MediaPickerProps = {
  kind?: MediaKind;
  keepOpen?: boolean;
  onPick: (asset: MediaAsset) => void;
  onClose: () => void;
};

export function MediaPicker({ kind = 'image', keepOpen = false, onPick, onClose }: MediaPickerProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const mediaQ = useMediaList(kind);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const assets = (mediaQ.data?.pages || []).flatMap((page) => page.assets);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus?.();
  }, []);

  // Keeps Tab inside the window while it is open.
  function keepFocusInside(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab' || !panel.current) return;
    const items = panel.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function pick(asset: MediaAsset) {
    onPick(asset);
    if (!keepOpen) onClose();
  }

  async function upload(files: File[]) {
    setError(null);
    try {
      for (const file of files) {
        pick(await uploadMedia(file));
      }
    } catch (err) {
      setError(errorText(t, err, 'media.uploadError'));
    } finally {
      await qc.invalidateQueries({ queryKey: ['media'] });
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-label={t('media.pickTitle')}>
      <div
        ref={panel}
        tabIndex={-1}
        onKeyDown={keepFocusInside}
        className="grid max-h-[90vh] w-full max-w-3xl grid-rows-[auto_1fr_auto] gap-3 overflow-hidden rounded-2xl bg-white p-4 outline-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-extrabold">{t('media.pickTitle')}</div>
          <div className="flex flex-wrap gap-2">
            <UploadButton
              label={t('media.upload')}
              busyLabel={t('media.uploading')}
              accept={kind === 'image' ? ACCEPTED_IMAGES : ACCEPTED_FILES}
              multiple={keepOpen}
              onFiles={upload}
            />
            <button type="button" className={ui.secondary} onClick={onClose}>
              {keepOpen ? t('common.done') : t('common.close')}
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          {mediaQ.isLoading ? <div className="text-sm text-slate-600">{t('common.loading')}</div> : null}
          {mediaQ.isError ? <div className={ui.error}>{errorText(t, mediaQ.error, 'common.loadError')}</div> : null}
          {!mediaQ.isLoading && !assets.length ? <div className="text-sm text-slate-600">{t('media.empty')}</div> : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                aria-label={asset.filename}
                className="grid gap-1 rounded-xl border border-slate-200 p-2 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                onClick={() => pick(asset)}
              >
                <MediaThumb asset={asset} className="h-24 w-full" />
                <span className="truncate text-xs text-slate-700">{asset.filename}</span>
              </button>
            ))}
          </div>
          {mediaQ.hasNextPage ? (
            <button type="button" className={`${ui.secondary} mt-3`} disabled={mediaQ.isFetchingNextPage} onClick={() => mediaQ.fetchNextPage()}>
              {t('common.loadMore')}
            </button>
          ) : null}
        </div>

        {error ? <div role="alert" className={ui.error}>{error}</div> : null}
      </div>
    </div>
  );
}
