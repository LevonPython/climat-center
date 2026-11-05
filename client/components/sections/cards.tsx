import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useState } from 'react';
import { assetUrl } from '../../lib/assets';
import { RichText } from '../site/RichText';
import { BlockTitle, PlainTitle, RequestButton, SectionBox, usePriceLabel } from './shared';

// Icons for points that don't have their own picture yet.
const SPRITE_POSITIONS = ['50% 0', '50% -44px', '50% -88px'];
const ADVANTAGE_POSITIONS = ['50% 0', '50% -40px', '50% -80px', '50% -120px'];

function IconLinks({ items }: { items: Record<string, any>[] }) {
  return (
    <div className="flex flex-wrap justify-between gap-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex w-[24%] items-start gap-3 text-[15px] max-md:w-[48%] max-sm:w-full">
          {item.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(item.icon_url)} alt="" loading="lazy" className="h-[60px] w-[60px] shrink-0" />
          ) : null}
          <div className="min-w-0">
            {item.link_url ? (
              <Link href={item.link_url} className="text-brand underline">
                {item.title}
              </Link>
            ) : (
              item.title
            )}
            {item.description ? <span className="block font-light">{item.description}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function IconFeatures({ content, overlapIntro = false }: { content: Record<string, any>; overlapIntro?: boolean }) {
  const items: Record<string, any>[] = content.items || [];
  if (items.some((item) => item.link_url)) {
    return (
      <SectionBox>
        <PlainTitle text={content.heading} />
        <IconLinks items={items} />
      </SectionBox>
    );
  }
  return (
    <SectionBox className={overlapIntro ? 'relative z-[3] sm:-mt-[110px]' : ''}>
      <PlainTitle text={content.heading} />
      <div className="flex flex-wrap justify-center gap-5">
        {items.map((item, index) => (
          <div key={index} className={`block w-[220px] grow text-center text-ink ${overlapIntro && index === 1 ? 'sm:mt-[35px]' : ''}`}>
            <span className="mx-auto mb-3 grid h-[104px] w-[104px] place-items-center rounded-full bg-white shadow-[0_0_5px_rgba(0,0,0,.2)]">
              {item.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(item.icon_url)} alt="" loading="lazy" className="max-h-12 max-w-12" />
              ) : (
                <span aria-hidden="true" className="h-11 w-14 bg-[url('/theme/rob-icons.png')] bg-no-repeat" style={{ backgroundPosition: SPRITE_POSITIONS[index % SPRITE_POSITIONS.length] }} />
              )}
            </span>
            {item.title ? <span className="block font-medium">{item.title}</span> : null}
            {item.description ? <span className="block text-[15px] font-light">{item.description}</span> : null}
          </div>
        ))}
      </div>
    </SectionBox>
  );
}

export function Signs({ content }: { content: Record<string, any> }) {
  const items: Record<string, any>[] = content.items || [];
  return (
    <SectionBox className="bg-mist p-[30px] text-[15px] max-sm:p-5">
      {content.heading ? <h2 className="mb-[15px] text-[21px] font-medium uppercase">{content.heading}</h2> : null}
      {items.length ? (
        <ul className="mt-[30px] flex flex-wrap justify-center gap-y-5">
          {items.map((item, index) => (
            <li key={index} className="w-1/5 px-[5px] text-center font-medium max-md:w-1/2">
              {item.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(item.icon_url)} alt="" loading="lazy" className="mx-auto mb-5 h-20 max-w-[102px] object-contain" />
              ) : (
                <span aria-hidden="true" className="mx-auto mb-5 block h-20 w-[102px] bg-[url('/theme/priz.png')] bg-no-repeat" style={{ backgroundPosition: `0 ${(index % 5) * -80}px` }} />
              )}
              {item.title}
            </li>
          ))}
        </ul>
      ) : null}
      {content.body ? (
        <div className="relative mt-5 border-t border-[#d8e4e9] pt-5">
          <span aria-hidden="true" className="absolute -top-[15px] left-1/2 -ml-[15px] h-[30px] w-[30px] rotate-45 border-b border-r border-[#d8e4e9] bg-mist" />
          <RichText html={content.body} className="relative text-center [&_p:first-child]:font-medium [&_p:first-child]:text-brand" />
        </div>
      ) : null}
    </SectionBox>
  );
}

export function WorkCards({ content }: { content: Record<string, any> }) {
  const items: Record<string, any>[] = content.items || [];
  return (
    <SectionBox>
      <BlockTitle text={content.heading} />
      <div className="mt-10 flex flex-wrap gap-5">
        {items.map((item, index) => (
          <div key={index} className="relative mb-5 w-[250px] grow bg-white px-6 pb-5 pt-10 text-center text-body shadow-[0_0_5px_rgba(0,0,0,.2)]">
            <span aria-hidden="true" className="absolute -top-[25px] left-1/2 -ml-[25px] grid h-[50px] w-[50px] place-items-center rounded-full bg-white shadow-[0_0_5px_rgba(0,0,0,.2)]">
              <span className="h-5 w-5 rounded-full bg-leaf" />
            </span>
            {item.title ? <div className="mb-1 text-2xl font-normal uppercase text-leaf-text">{item.title}</div> : null}
            {item.description ? <div className="text-base leading-snug">{item.description}</div> : null}
          </div>
        ))}
      </div>
    </SectionBox>
  );
}

export function Steps({ content }: { content: Record<string, any> }) {
  const items: Record<string, any>[] = content.items || [];
  return (
    <SectionBox className="bg-mist p-6">
      <PlainTitle text={content.heading} />
      <ol className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand font-semibold text-white">
              {index + 1}
            </span>
            <div>
              {item.title ? <strong className="block font-medium">{item.title}</strong> : null}
              {item.description ? <span>{item.description}</span> : null}
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(item.image_url)} alt="" loading="lazy" className="mt-2 max-w-full" />
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </SectionBox>
  );
}

export function Advantages({ content }: { content: Record<string, any> }) {
  const items: Record<string, any>[] = content.items || [];
  return (
    <SectionBox>
      <BlockTitle text={content.heading} />
      <ol className="flex flex-wrap justify-around gap-5">
        {items.map((item, index) => (
          <li key={index} className="w-[210px] text-center">
            <span className="relative mx-auto mb-5 block h-40 w-40 rounded-full bg-tint text-[40px] font-semibold text-brand">
              {index + 1}
              <span className="absolute bottom-0 left-1/2 -ml-[52px] grid h-[104px] w-[104px] place-items-center rounded-full bg-white shadow-[0_0_5px_rgba(0,0,0,.2)]">
                {item.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(item.icon_url)} alt="" loading="lazy" className="max-h-10 max-w-10" />
                ) : (
                  <span aria-hidden="true" className="h-10 w-[38px] bg-[url('/theme/gars-icons.png')] bg-no-repeat" style={{ backgroundPosition: ADVANTAGE_POSITIONS[index % ADVANTAGE_POSITIONS.length] }} />
                )}
              </span>
            </span>
            <span className="font-light">{item.text}</span>
          </li>
        ))}
      </ol>
    </SectionBox>
  );
}

export function Tools({ content }: { content: Record<string, any> }) {
  const items: Record<string, any>[] = content.items || [];
  return (
    <SectionBox>
      <PlainTitle text={content.heading} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <div key={index} className="border border-[#d8e4e9] p-4 text-center">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(item.image_url)} alt="" loading="lazy" className="mx-auto mb-3 max-h-32" />
            ) : null}
            {item.title ? <div className="font-medium">{item.title}</div> : null}
            {item.description ? <div className="text-sm">{item.description}</div> : null}
          </div>
        ))}
      </div>
    </SectionBox>
  );
}

function ProductCard({ item }: { item: Record<string, any> }) {
  const { t } = useTranslation('common');
  const priceLabel = usePriceLabel();
  const images: Record<string, any>[] = (item.images || []).filter((image: Record<string, any>) => image.image_url);
  const [selected, setSelected] = useState(0);
  const current = images[selected];

  return (
    <article className="mb-8 border border-[#d8e4e9] p-5">
      {item.title ? <h3 className="mb-3 text-[120%] font-medium uppercase">{item.title}</h3> : null}
      <div className="flex flex-wrap gap-5">
        <div className="min-w-0 flex-1 basis-[260px]">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(current.image_url)} alt={item.title || ''} loading="lazy" className="mx-auto max-h-72 max-w-full object-contain" />
          ) : null}
          {images.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((image, index) => (
                <button key={index} type="button" aria-label={t('sections.showPicture', { number: index + 1 })} aria-pressed={selected === index} className="h-14 w-14 border border-[#d8e4e9] aria-pressed:border-brand" onClick={() => setSelected(index)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(image.image_url)} alt="" loading="lazy" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 basis-[260px]">
          <div className="mb-3 inline-block bg-leaf-strong px-4 py-2 text-lg font-semibold text-white">{priceLabel(item.price)}</div>
          {item.details ? <RichText html={item.details} /> : null}
          <div className="mt-3">
            <RequestButton />
          </div>
        </div>
      </div>
    </article>
  );
}

export function Products({ content }: { content: Record<string, any> }) {
  const items: Record<string, any>[] = content.items || [];
  return (
    <SectionBox>
      <BlockTitle text={content.heading} />
      {items.map((item, index) => (
        <ProductCard key={index} item={item} />
      ))}
    </SectionBox>
  );
}
