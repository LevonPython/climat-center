import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useState } from 'react';
import { assetUrl, isResizable } from '../../lib/assets';
import { isEmbeddableVideo } from '../../lib/richText';
import { Lightbox, type LightboxImage } from '../site/Lightbox';
import { useSite } from '../site/SiteContext';
import { PlainTitle, SectionBox } from './shared';

const GRID_PICTURE_SIZES = '(min-width: 768px) 310px, (min-width: 640px) 50vw, 100vw';

function ImageGrid({ images }: { images: (LightboxImage & { title?: string | null })[] }) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {images.map((image, index) => (
          <button key={index} type="button" aria-label={image.title || image.alt || t('sections.showPicture', { number: index + 1 })} className="relative block aspect-[4/3] w-full overflow-hidden" onClick={() => setOpen(index)}>
            <Image src={assetUrl(image.url)} alt={image.alt || ''} fill sizes={GRID_PICTURE_SIZES} unoptimized={!isResizable(image.url)} className="object-cover" />
          </button>
        ))}
      </div>
      {open !== null ? <Lightbox images={images} index={open} onChange={setOpen} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

export function GallerySection({ content }: { content: Record<string, any> }) {
  const { galleries } = useSite();
  const items = galleries[content.collection as 'brands' | 'certificates' | 'works'] || [];
  if (!items.length) return null;

  if (content.collection === 'brands') {
    return (
      <SectionBox>
        <PlainTitle text={content.heading} />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={item.id} src={assetUrl(item.url)} alt={item.title || item.alt || ''} loading="lazy" className="mx-auto h-16 object-contain" />
          ))}
        </div>
      </SectionBox>
    );
  }
  return (
    <SectionBox>
      <PlainTitle text={content.heading} />
      <ImageGrid images={items.map((item) => ({ url: item.url, alt: item.alt, title: item.title }))} />
    </SectionBox>
  );
}

export function Photos({ content }: { content: Record<string, any> }) {
  const items: Record<string, any>[] = (content.items || []).filter((item: Record<string, any>) => item.image_url);
  if (!items.length) return null;
  return (
    <SectionBox>
      <PlainTitle text={content.heading} />
      <ImageGrid images={items.map((item) => ({ url: item.image_url, alt: item.caption, title: item.caption }))} />
    </SectionBox>
  );
}

export function VideoSection({ content }: { content: Record<string, any> }) {
  const { t } = useTranslation('common');
  if (!isEmbeddableVideo(content.video_url)) return null;
  return (
    <SectionBox>
      <PlainTitle text={content.heading} />
      <div className="relative aspect-video w-full">
        <iframe
          src={content.video_url}
          title={content.heading || t('sections.video')}
          loading="lazy"
          allow="fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </SectionBox>
  );
}
