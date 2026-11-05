import { useTranslation } from 'next-i18next';
import type { ReactNode } from 'react';
import { Emphasized } from '../site/Emphasized';
import { useRequestPopup } from '../site/SiteContext';

export const CTA_BUTTON = 'inline-block min-h-11 rounded-full bg-brand px-6 py-3 text-sm font-medium uppercase text-white hover:opacity-90';

// The large centred title most blocks on the original use.
export function BlockTitle({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <h2 className="mb-5 text-center text-[24px] font-normal uppercase sm:text-[30px] md:text-[40px]">
      <Emphasized text={text} />
    </h2>
  );
}

export function PlainTitle({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <h2 className="mb-4 text-[140%] font-medium uppercase">
      <Emphasized text={text} emphasisClass="font-medium text-brand" />
    </h2>
  );
}

export function SectionBox({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`mb-8 ${className}`}>{children}</section>;
}

export function RequestButton({ label, className = CTA_BUTTON }: { label?: string | null; className?: string }) {
  const { t } = useTranslation('common');
  const openRequest = useRequestPopup();
  return (
    <button type="button" className={className} onClick={openRequest}>
      {label || t('request.title')}
    </button>
  );
}

export function usePriceLabel(): (price?: string | null) => string {
  const { t } = useTranslation('common');
  return (price) => price || t('sections.priceOnRequest');
}
