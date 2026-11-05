import { useRouter } from 'next/router';
import { useMemo, useState, type MouseEvent } from 'react';
import { isImageLink, prepareRichText } from '../../lib/richText';
import { Lightbox, type LightboxImage } from './Lightbox';

// The one place stored HTML is rendered. contentSanitizer.js cleans it on every save.
export function RichText({ html, className = '' }: { html: string; className?: string }) {
  const { locale } = useRouter();
  const prepared = useMemo(() => prepareRichText(html, locale || 'hy'), [html, locale]);
  const [images, setImages] = useState<LightboxImage[]>([]);
  const [index, setIndex] = useState<number | null>(null);

  function openImage(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest('a');
    const href = link?.getAttribute('href') ?? null;
    if (!link || !link.querySelector('img') || !isImageLink(href)) return;
    event.preventDefault();
    const all = [...event.currentTarget.querySelectorAll('a')].filter((a) => a.querySelector('img') && isImageLink(a.getAttribute('href')));
    setImages(all.map((a) => ({ url: a.getAttribute('href') as string, alt: a.querySelector('img')?.getAttribute('alt') })));
    setIndex(all.indexOf(link));
  }

  return (
    <>
      <div className={`rich-text ${className}`} onClick={openImage} dangerouslySetInnerHTML={{ __html: prepared }} />
      {index !== null ? <Lightbox images={images} index={index} onChange={setIndex} onClose={() => setIndex(null)} /> : null}
    </>
  );
}
