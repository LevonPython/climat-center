import { useTranslation } from 'next-i18next';
import { useEffect, useRef } from 'react';
import { assetUrl } from '../../lib/assets';

export type LightboxImage = { url: string; alt?: string | null };

type LightboxProps = {
  images: LightboxImage[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
};

const CONTROL = 'grid h-11 w-11 place-items-center rounded-full bg-white text-xl text-ink shadow hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

export function Lightbox({ images, index, onChange, onClose }: LightboxProps) {
  const { t } = useTranslation('common');
  const closeButton = useRef<HTMLButtonElement>(null);
  const image = images[index];
  const previous = () => onChange((index - 1 + images.length) % images.length);
  const next = () => onChange((index + 1) % images.length);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => opener?.focus?.();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onChange((index - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight') onChange((index + 1) % images.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length, onChange, onClose]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('sections.imageViewer')}
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={assetUrl(image.url)} alt={image.alt || ''} className="max-h-[85vh] max-w-full object-contain" />
      <button ref={closeButton} type="button" aria-label={t('sections.close')} className={`${CONTROL} absolute right-4 top-4`} onClick={onClose}>
        ×
      </button>
      {images.length > 1 ? (
        <>
          <button type="button" aria-label={t('sections.previous')} className={`${CONTROL} absolute left-4 top-1/2 -translate-y-1/2`} onClick={previous}>
            ‹
          </button>
          <button type="button" aria-label={t('sections.next')} className={`${CONTROL} absolute right-4 top-1/2 -translate-y-1/2`} onClick={next}>
            ›
          </button>
        </>
      ) : null}
    </div>
  );
}
